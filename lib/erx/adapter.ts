import type {
  ErxCodedDraft,
  ErxDraftResult,
  ErxDrugHit,
  ErxInboxItem,
  ErxPatientSync,
  ErxPharmacyHit,
  ErxSendResult,
} from "@/lib/erx/types";

/** Vendor-neutral eRx boundary. Mock today; DoseSpot (or ScriptSure) later. */
export type ErxAdapter = {
  readonly name: string;
  searchPharmacies(query: string): Promise<ErxPharmacyHit[]>;
  searchDrugs(query: string): Promise<ErxDrugHit[]>;
  upsertPatient(patient: ErxPatientSync): Promise<{ ok: boolean; message: string; externalId: string }>;
  createDraft(draft: ErxCodedDraft): Promise<ErxDraftResult>;
  queueForSignature(vendorPrescriptionId: string): Promise<ErxDraftResult>;
  send(vendorPrescriptionId: string): Promise<ErxSendResult>;
  sendEpcs(vendorPrescriptionId: string, pin: string): Promise<ErxSendResult>;
  listInbox(patientExternalId?: string): Promise<ErxInboxItem[]>;
  cancel(vendorPrescriptionId: string): Promise<ErxSendResult>;
  /** Hosted sign URL when live; empty for mock (UI draws its own panel). */
  signatureFrameUrl?(vendorPrescriptionId: string): string | null;
};
