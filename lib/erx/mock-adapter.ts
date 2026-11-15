import type { ErxAdapter } from "@/lib/erx/adapter";
import type {
  ErxCodedDraft,
  ErxDraftResult,
  ErxDrugHit,
  ErxInboxItem,
  ErxPatientSync,
  ErxPharmacyHit,
  ErxSendResult,
} from "@/lib/erx/types";

const PHARMACIES: ErxPharmacyHit[] = [
  {
    ncpdpId: "3312345",
    name: "Bay Parkway Pharmacy",
    phone: "7185550101",
    address: "8700 Bay Pkwy",
    city: "Brooklyn",
    state: "NY",
    zip: "11214",
  },
  {
    ncpdpId: "3398765",
    name: "CVS Pharmacy #10821",
    phone: "7185550199",
    address: "8601 18th Ave",
    city: "Brooklyn",
    state: "NY",
    zip: "11214",
  },
  {
    ncpdpId: "3355511",
    name: "Duane Reade #14455",
    phone: "7185550144",
    address: "5002 18th Ave",
    city: "Brooklyn",
    state: "NY",
    zip: "11204",
  },
];

const DRUGS: ErxDrugHit[] = [
  {
    name: "Ibuprofen",
    dose: "600 mg",
    rxNorm: "197806",
    ndc: "00904673160",
    schedule: "non_controlled",
    defaultSig: "Take 1 tablet by mouth every 8 hours as needed for pain",
  },
  {
    name: "Cyclobenzaprine",
    dose: "10 mg",
    rxNorm: "828320",
    ndc: "00093081201",
    schedule: "non_controlled",
    defaultSig: "Take 1 tablet by mouth at bedtime as needed for muscle spasm",
  },
  {
    name: "Gabapentin",
    dose: "300 mg",
    rxNorm: "310431",
    ndc: "00093721301",
    schedule: "non_controlled",
    defaultSig: "Take 1 capsule by mouth three times daily",
  },
  {
    name: "Oxycodone",
    dose: "5 mg",
    rxNorm: "1049621",
    ndc: "00406055201",
    schedule: "II",
    defaultSig: "Take 1 tablet by mouth every 6 hours as needed for severe pain",
  },
  {
    name: "Tramadol",
    dose: "50 mg",
    rxNorm: "836677",
    ndc: "00093721001",
    schedule: "IV",
    defaultSig: "Take 1 tablet by mouth every 6 hours as needed for pain",
  },
];

type MockRx = ErxCodedDraft & {
  vendorPrescriptionId: string;
  status: "draft" | "pending_signature" | "sent" | "cancelled";
  patientExternalId: string;
};

const drafts = new Map<string, MockRx>();
const patients = new Map<string, ErxPatientSync>();
let inboxSeeded = false;
const inbox: ErxInboxItem[] = [];

function match(query: string, hay: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return hay.toLowerCase().includes(q);
}

function ensureInbox() {
  if (inboxSeeded) return;
  inboxSeeded = true;
  inbox.push(
    {
      id: "inbox_renew_1",
      kind: "renewal",
      patientExternalId: "demo",
      drugName: "Gabapentin 300 mg",
      summary: "Pharmacy requests 30-day renewal (mock).",
      requestedAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: "inbox_change_1",
      kind: "change",
      patientExternalId: "demo",
      drugName: "Ibuprofen 600 mg",
      summary: "Pharmacy asks to substitute OTC strength (mock).",
      requestedAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
  );
}

export function createMockErxAdapter(): ErxAdapter {
  return {
    name: "mock",
    async searchPharmacies(query) {
      return PHARMACIES.filter(
        (row) => match(query, row.name) || match(query, row.zip) || match(query, row.ncpdpId),
      );
    },
    async searchDrugs(query) {
      return DRUGS.filter((row) => match(query, row.name) || match(query, row.rxNorm || "") || match(query, row.ndc || ""));
    },
    async upsertPatient(patient) {
      patients.set(patient.externalId, patient);
      return { ok: true, message: "Patient synced (mock).", externalId: patient.externalId };
    },
    async createDraft(draft) {
      const vendorPrescriptionId = `mock_rx_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      drafts.set(vendorPrescriptionId, {
        ...draft,
        vendorPrescriptionId,
        status: "draft",
        patientExternalId: draft.patientExternalId,
      });
      return { ok: true, message: "Draft created (mock).", vendorPrescriptionId };
    },
    async queueForSignature(vendorPrescriptionId) {
      const row = drafts.get(vendorPrescriptionId);
      if (!row) return { ok: false, message: "Unknown mock prescription.", vendorPrescriptionId };
      row.status = "pending_signature";
      drafts.set(vendorPrescriptionId, row);
      return { ok: true, message: "Queued for signature (mock).", vendorPrescriptionId };
    },
    async send(vendorPrescriptionId) {
      return finishSend(vendorPrescriptionId, false);
    },
    async sendEpcs(vendorPrescriptionId, pin) {
      if (!/^\d{4,8}$/.test(pin.trim())) {
        return { ok: false, message: "Enter a 4–8 digit mock EPCS PIN." };
      }
      return finishSend(vendorPrescriptionId, true);
    },
    async listInbox(patientExternalId) {
      ensureInbox();
      if (!patientExternalId) return [...inbox];
      return inbox.filter((item) => item.patientExternalId === patientExternalId || item.patientExternalId === "demo");
    },
    async cancel(vendorPrescriptionId) {
      const row = drafts.get(vendorPrescriptionId);
      if (!row) return { ok: false, message: "Unknown mock prescription." };
      row.status = "cancelled";
      drafts.set(vendorPrescriptionId, row);
      return { ok: true, message: "Prescription cancelled (mock).", vendorPrescriptionId };
    },
    signatureFrameUrl() {
      return null;
    },
  };
}

async function finishSend(vendorPrescriptionId: string, epcs: boolean): Promise<ErxSendResult> {
  const row = drafts.get(vendorPrescriptionId);
  if (!row) return { ok: false, message: "Unknown mock prescription." };
  if (row.status === "cancelled") return { ok: false, message: "That prescription was cancelled." };
  // Brief delay so the UI can show signing progress.
  await new Promise((resolve) => setTimeout(resolve, 350));
  row.status = "sent";
  drafts.set(vendorPrescriptionId, row);
  const fillSimulatedAt = new Date(Date.now() + 2_000).toISOString();
  return {
    ok: true,
    message: epcs
      ? "Controlled substance sent to pharmacy (mock EPCS)."
      : "Prescription sent to pharmacy (mock).",
    vendorPrescriptionId,
    fillSimulatedAt,
  };
}

/** Test helper: reset in-memory mock state. */
export function resetMockErxState() {
  drafts.clear();
  patients.clear();
  inbox.length = 0;
  inboxSeeded = false;
}

export function getMockDraft(vendorPrescriptionId: string) {
  return drafts.get(vendorPrescriptionId) ?? null;
}

export { PHARMACIES as MOCK_PHARMACIES, DRUGS as MOCK_DRUGS };
