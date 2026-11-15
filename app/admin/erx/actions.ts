"use server";

import { getErxAdapter, getErxMode, isControlledSchedule } from "@/lib/erx";
import type { ErxCodedDraft, ErxPatientSync } from "@/lib/erx/types";
import { prescriptionFileSlot } from "@/lib/rcm/claim-files";
import { storeChartBytes } from "@/lib/chart-files/store";
import { getStaffSession } from "@/lib/supabase/session";

async function staffGate() {
  const session = await getStaffSession();
  if (!session) return "Sign in as staff before using e-prescribing.";
  return null;
}

export async function erxStatus() {
  const session = await getStaffSession();
  return {
    signedIn: Boolean(session),
    mode: getErxMode(),
    adapter: getErxAdapter().name,
  };
}

export async function searchErxPharmacies(query: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, pharmacies: [] };
  const pharmacies = await getErxAdapter().searchPharmacies(query);
  return { ok: true as const, message: pharmacies.length ? `Found ${pharmacies.length}.` : "No pharmacies matched.", pharmacies };
}

export async function searchErxDrugs(query: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, drugs: [] };
  const drugs = await getErxAdapter().searchDrugs(query);
  return { ok: true as const, message: drugs.length ? `Found ${drugs.length}.` : "No drugs matched.", drugs };
}

export async function syncErxPatient(patient: ErxPatientSync) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, externalId: "" };
  return getErxAdapter().upsertPatient(patient);
}

export async function createErxVendorDraft(draft: ErxCodedDraft) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, vendorPrescriptionId: undefined as string | undefined };
  return getErxAdapter().createDraft(draft);
}

export async function queueErxForSignature(vendorPrescriptionId: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, vendorPrescriptionId };
  return getErxAdapter().queueForSignature(vendorPrescriptionId);
}

export async function sendErxPrescription(input: {
  vendorPrescriptionId: string;
  schedule: string;
  pin?: string;
}) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked };
  const adapter = getErxAdapter();
  if (isControlledSchedule(input.schedule)) {
    return adapter.sendEpcs(input.vendorPrescriptionId, input.pin || "");
  }
  return adapter.send(input.vendorPrescriptionId);
}

export async function listErxInbox(patientExternalId?: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked, items: [] };
  const items = await getErxAdapter().listInbox(patientExternalId);
  return { ok: true as const, message: items.length ? `${items.length} inbox item(s).` : "Inbox empty.", items };
}

export async function cancelErxPrescription(vendorPrescriptionId: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked };
  return getErxAdapter().cancel(vendorPrescriptionId);
}

/** File a plain-text proof on the chart after a successful send (mock or live). */
export async function fileErxSendProof(input: {
  patientId: string;
  prescriptionId: string;
  drugName: string;
  pharmacyName: string;
  vendorPrescriptionId?: string;
  message: string;
}) {
  const blocked = await staffGate();
  if (blocked) return { ok: false as const, message: blocked };
  const lines = [
    "ClaimX practice — e-prescription transmission record",
    "",
    `Drug: ${input.drugName}`,
    `Pharmacy: ${input.pharmacyName}`,
    input.vendorPrescriptionId ? `Vendor id: ${input.vendorPrescriptionId}` : "",
    `Mode: ${getErxMode()} (${getErxAdapter().name})`,
    `At: ${new Date().toISOString()}`,
    "",
    input.message,
    "",
    "This beta proof is filed on the patient chart. Live DoseSpot/Surescripts routing requires vendor credentials.",
  ].filter((line) => line !== undefined);
  const body = lines.join("\n");
  const stored = await storeChartBytes({
    patientId: input.patientId,
    slotId: prescriptionFileSlot(input.prescriptionId),
    fileName: `Prescription-${input.prescriptionId}.txt`,
    contentType: "text/plain",
    bytes: Buffer.from(body, "utf8"),
  });
  if (!stored.ok) return { ok: false as const, message: stored.message };
  return {
    ok: true as const,
    message: "Prescription proof filed on the chart.",
    path: stored.path,
    url: stored.url,
    fileName: `Prescription-${input.prescriptionId}.txt`,
  };
}
