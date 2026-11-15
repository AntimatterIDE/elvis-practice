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

const NOT_CONFIGURED =
  "DoseSpot credentials are not configured. Keep ERX_MODE=mock, or add ERX_DOSESPOT_SUBSCRIPTION_KEY and ERX_DOSESPOT_BASE_URL.";

function notConfiguredResult(): ErxDraftResult {
  return { ok: false, message: NOT_CONFIGURED };
}

function notConfiguredSend(): ErxSendResult {
  return { ok: false, message: NOT_CONFIGURED };
}

/**
 * Thin DoseSpot-shaped stub. Live HTTP wiring lands when credentials exist
 * (same pattern as OCR service_config / env).
 */
export function createDoseSpotErxAdapter(input?: {
  baseUrl?: string;
  subscriptionKey?: string;
}): ErxAdapter {
  const configured = Boolean(input?.baseUrl?.trim() && input?.subscriptionKey?.trim());

  return {
    name: "dosespot",
    async searchPharmacies(_query: string): Promise<ErxPharmacyHit[]> {
      if (!configured) return [];
      throw new Error(NOT_CONFIGURED);
    },
    async searchDrugs(_query: string): Promise<ErxDrugHit[]> {
      if (!configured) return [];
      throw new Error(NOT_CONFIGURED);
    },
    async upsertPatient(_patient: ErxPatientSync) {
      return { ok: false, message: NOT_CONFIGURED, externalId: "" };
    },
    async createDraft(_draft: ErxCodedDraft) {
      return notConfiguredResult();
    },
    async queueForSignature(_vendorPrescriptionId: string) {
      return notConfiguredResult();
    },
    async send(_vendorPrescriptionId: string) {
      return notConfiguredSend();
    },
    async sendEpcs(_vendorPrescriptionId: string, _pin: string) {
      return notConfiguredSend();
    },
    async listInbox(_patientExternalId?: string): Promise<ErxInboxItem[]> {
      return [];
    },
    async cancel(_vendorPrescriptionId: string) {
      return notConfiguredSend();
    },
    signatureFrameUrl(vendorPrescriptionId: string) {
      if (!configured || !input?.baseUrl) return null;
      const base = input.baseUrl.replace(/\/$/, "");
      return `${base}/sign/${encodeURIComponent(vendorPrescriptionId)}`;
    },
  };
}
