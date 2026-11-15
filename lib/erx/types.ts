import type { PrescriptionSchedule } from "@/lib/rcm/types";

export type ErxMode = "mock" | "live";

export type ErxPharmacyHit = {
  ncpdpId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type ErxDrugHit = {
  name: string;
  dose: string;
  rxNorm?: string;
  ndc?: string;
  schedule: PrescriptionSchedule;
  defaultSig: string;
};

export type ErxPatientSync = {
  externalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  allergies: string[];
};

export type ErxCodedDraft = {
  patientExternalId: string;
  drugName: string;
  rxNorm?: string;
  ndc?: string;
  dose: string;
  sig: string;
  quantity: string;
  daysSupply: string;
  refills: number;
  schedule: PrescriptionSchedule;
  pharmacyNcpdpId: string;
  diagnosisNote?: string;
  pharmacyNote?: string;
};

export type ErxInboxItem = {
  id: string;
  kind: "renewal" | "change";
  patientExternalId: string;
  drugName: string;
  summary: string;
  requestedAt: string;
};

export type ErxSendResult = {
  ok: boolean;
  message: string;
  vendorPrescriptionId?: string;
  fillSimulatedAt?: string;
};

export type ErxDraftResult = {
  ok: boolean;
  message: string;
  vendorPrescriptionId?: string;
};
