import type { RcmState } from "@/lib/rcm/types";

export const STORAGE_KEY = "alignment-practice-v2";

export function createSeedState(): RcmState {
  return {
    practice: {
      legalName: "The Alignment Clinic",
      physicianName: "Elvis Francois, MD",
      npi: "",
      taxId: "",
      taxonomy: "",
      phone: "",
      address: "",
      posCode: "11",
    },
    patients: [],
    appointments: [],
    tasks: [],
    claims: [],
    eligibility: [],
  };
}
