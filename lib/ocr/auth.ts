import "server-only";
import { getPortalStore } from "@/lib/portal/repository";
import { getStaffSession } from "@/lib/supabase/session";
import { cookies } from "next/headers";

export type OcrActor =
  | { kind: "staff"; actorId: string }
  | { kind: "intake"; actorId: string; token: string }
  | { kind: "portal"; actorId: string; patientId: string };

async function portalPatientIdFromCookie() {
  const jar = await cookies();
  const value = jar.get("portal_session")?.value?.trim();
  if (!value) return null;
  return getPortalStore().patientIdForToken(value);
}

/** Staff, valid open intake invite token, or signed-in portal patient may call OCR onboard. */
export async function resolveOcrActor(request: Request): Promise<OcrActor | null> {
  const staff = await getStaffSession();
  if (staff) return { kind: "staff", actorId: staff.userId };

  const headerToken = request.headers.get("x-intake-token")?.trim() || "";
  let bodyToken = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const clone = request.clone();
      const json = (await clone.json()) as { token?: unknown; intakeToken?: unknown };
      bodyToken =
        (typeof json.token === "string" && json.token.trim()) ||
        (typeof json.intakeToken === "string" && json.intakeToken.trim()) ||
        "";
    } catch {
      bodyToken = "";
    }
  }
  const token = headerToken || bodyToken;
  if (token) {
    const invite = await getPortalStore().publicInvite(token);
    if (invite.status === "open") {
      const actorId = `inv_${token.replace(/[^A-Za-z0-9]/g, "").slice(0, 24) || "x"}`;
      return { kind: "intake", actorId, token };
    }
  }

  const patientId = await portalPatientIdFromCookie();
  if (patientId) {
    return {
      kind: "portal",
      actorId: `pt_${patientId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40)}`,
      patientId,
    };
  }
  return null;
}
