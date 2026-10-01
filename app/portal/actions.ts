"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Appointment, Patient } from "@/lib/rcm/types";
import { clearPortalCookie, readPortalCookie, writePortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { IntakeForm } from "@/lib/portal/types";
import { rateLimit } from "@/lib/rate-limit";
import { getStaffSession } from "@/lib/supabase/session";

async function clientKey(name: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${name}:${ip}`;
}

export async function saveIntakeFormAction(form: IntakeForm) {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const result = await getPortalStore().saveForm(form);
  if (!result.ok) return { error: result.error };
  return { snapshot: result.value };
}

export async function createIntakeInviteAction(input: { email?: string; name?: string }) {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const result = await getPortalStore().createInvite(input);
  if (!result.ok) return { error: result.error };
  return result.value;
}

export async function intakeSnapshotAction() {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const result = await getPortalStore().snapshot();
  if (!result.ok) return { error: result.error };
  return { snapshot: result.value };
}

export async function submitIntakeAction(
  _previous: { error?: string; done?: boolean },
  formData: FormData,
): Promise<{ error?: string; done?: boolean }> {
  const token = String(formData.get("token") ?? "");
  if (!rateLimit(await clientKey(`intake:${token}`), 8, 10 * 60 * 1000)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("a.") || typeof value !== "string") continue;
    answers[key.slice(2)] = value;
  }
  const result = await getPortalStore().submit(token, answers);
  if (!result.ok) return { error: result.error };
  return { done: true };
}

export async function issuePortalLoginAction(input: {
  patientId: string;
  email: string;
  chart?: Patient;
}): Promise<{ error: string } | { password: string; email: string }> {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const result = await getPortalStore().issueLogin(input);
  if (!result.ok) return { error: result.error };
  return { password: result.value.password, email: result.value.email };
}

export async function portalAccountAction(patientId: string) {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const account = await getPortalStore().accountFor(patientId);
  return { email: account?.email ?? "" };
}

export async function loadPortalRosterAction() {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required." };
  const result = await getPortalStore().roster();
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, patients: result.value.patients, appointments: result.value.appointments };
}

export async function pushPortalChartsAction(input: { patients: Patient[]; appointments: Appointment[] }) {
  if (!(await getStaffSession())) return { ok: false as const };
  const patients = Array.isArray(input?.patients) ? input.patients.slice(0, 100) : [];
  const appointments = Array.isArray(input?.appointments) ? input.appointments.slice(0, 500) : [];
  const result = await getPortalStore().pushCharts({ patients, appointments });
  return { ok: result.ok as boolean };
}

export async function deletePortalPatientsAction(ids: string[]) {
  if (!(await getStaffSession())) return { ok: false as const };
  const result = await getPortalStore().removePatients(Array.isArray(ids) ? ids.slice(0, 50) : []);
  return { ok: result.ok };
}

export async function portalSignInAction(
  _previous: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!rateLimit(await clientKey(`portal-login:${email.toLowerCase()}`), 5, 10 * 60 * 1000)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  const result = await getPortalStore().login(email, password);
  if (!result.ok) return { error: result.error };
  await writePortalCookie(result.value.token);
  redirect("/portal");
}

export async function portalSignOutAction() {
  const token = await readPortalCookie();
  await getPortalStore().revoke(token);
  await clearPortalCookie();
  redirect("/portal/login");
}
