"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listChartFiles, prepareChartUpload } from "@/lib/chart-files/store";
import type { Appointment, Patient } from "@/lib/rcm/types";
import { clearPortalCookie, readPortalCookie, writePortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { IntakeForm, PortalMessage } from "@/lib/portal/types";
import { portalUploadSlot } from "@/lib/portal/uploads";
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

export async function pushPortalChartsAction(input: {
  patients: Patient[];
  appointments: Appointment[];
  removedAppointmentIds?: string[];
}) {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required." };
  const patients = Array.isArray(input?.patients) ? input.patients.slice(0, 100) : [];
  const appointments = Array.isArray(input?.appointments) ? input.appointments.slice(0, 500) : [];
  const removedAppointmentIds = Array.isArray(input?.removedAppointmentIds)
    ? input.removedAppointmentIds.filter((id) => typeof id === "string").slice(0, 500)
    : [];
  const result = await getPortalStore().pushCharts({ patients, appointments, removedAppointmentIds });
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
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

async function signedInPatient() {
  return getPortalStore().patientIdForToken(await readPortalCookie());
}

export async function sendPortalMessageAction(body: string): Promise<{ error: string } | { messages: PortalMessage[] }> {
  const patientId = await signedInPatient();
  if (!patientId) return { error: "Sign in required." };
  if (!rateLimit(await clientKey(`portal-message:${patientId}`), 20, 10 * 60 * 1000)) {
    return { error: "Too many messages. Wait a few minutes and try again." };
  }
  const home = await getPortalStore().home(patientId);
  const author = home?.preferredName || home?.firstName || "Patient";
  const result = await getPortalStore().sendMessage({ patientId, from: "patient", author, body });
  if (!result.ok) return { error: result.error };
  return { messages: result.value };
}

export async function staffPortalThreadAction(patientId: string): Promise<{ error: string } | { messages: PortalMessage[] }> {
  if (!(await getStaffSession())) return { error: "Sign in required." };
  const seen = await getPortalStore().seeMessages(patientId, "practice");
  if (!seen.ok) return { error: seen.error };
  return { messages: seen.value };
}

export async function sendStaffPortalMessageAction(
  patientId: string,
  body: string,
): Promise<{ error: string } | { messages: PortalMessage[] }> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  if (!rateLimit(await clientKey(`staff-portal-message:${staff.userId}`), 30, 10 * 60 * 1000)) {
    return { error: "Too many messages. Wait a few minutes and try again." };
  }
  const result = await getPortalStore().sendMessage({
    patientId,
    from: "practice",
    author: staff.displayName || "The practice",
    body,
  });
  if (!result.ok) return { error: result.error };
  return { messages: result.value };
}

export async function beginPortalUploadAction(input: { slotId: string; contentType: string; byteSize: number }) {
  const patientId = await signedInPatient();
  if (!patientId) return { ok: false as const, message: "Sign in required." };
  if (!portalUploadSlot(input.slotId)) return { ok: false as const, message: "Choose a document type." };
  if (!rateLimit(await clientKey(`portal-upload:${patientId}`), 20, 10 * 60 * 1000)) {
    return { ok: false as const, message: "Too many uploads. Wait a few minutes and try again." };
  }
  const prepared = await prepareChartUpload({
    patientId,
    slotId: input.slotId,
    contentType: input.contentType,
    byteSize: input.byteSize,
  });
  if (!prepared.ok) return prepared;
  return { ok: true as const, path: prepared.path, signedUrl: prepared.signedUrl };
}

export async function notePortalUploadAction(slotId: string) {
  const patientId = await signedInPatient();
  if (!patientId) return { error: "Sign in required." };
  const result = await getPortalStore().noteFile(patientId, slotId);
  if (!result.ok) return { error: result.error };
  return { ok: true as const };
}

export async function portalFilesAction() {
  const patientId = await signedInPatient();
  if (!patientId) return { ok: false as const, message: "Sign in required.", files: [] };
  const listed = await listChartFiles(patientId);
  if (!listed.ok) return { ok: false as const, message: listed.message, files: [] };
  return {
    ok: true as const,
    files: listed.files.filter((file) => !file.slotId.startsWith("claim-")),
  };
}
