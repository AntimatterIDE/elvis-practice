"use server";

import { headers } from "next/headers";
import { signPacket } from "@/lib/agreements/store";

function signaturePng(value: string) {
  const prefix = "data:image/png;base64,";
  if (!value.startsWith(prefix)) return "";
  const raw = value.slice(prefix.length);
  if (raw.length < 80 || raw.length > 280000 || !/^[A-Za-z0-9+/=]+$/.test(raw)) return "";
  return value;
}

export async function submitSignature(input: { token: string; signerName: string; signaturePng: string; agreed: boolean }) {
  if (!input.agreed) return { ok: false, message: "Confirm that you have read the document and intend to sign it." };
  const signerName = input.signerName.replace(/\s+/g, " ").trim();
  if (signerName.length < 2 || signerName.length > 120) return { ok: false, message: "Type the name you are signing with." };
  const png = signaturePng(input.signaturePng);
  if (!png) return { ok: false, message: "Add a signature before sending it." };
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const saved = await signPacket({ token: input.token, signerName, signaturePng: png, signerIp: forwarded });
  if (!saved.ok) return saved;
  return { ok: true, message: "Signed. The practice has this copy." };
}
