import "server-only";
import type { ErxAdapter } from "@/lib/erx/adapter";
import { createDoseSpotErxAdapter } from "@/lib/erx/dosespot-adapter";
import { createMockErxAdapter } from "@/lib/erx/mock-adapter";
import type { ErxMode } from "@/lib/erx/types";

export type { ErxAdapter } from "@/lib/erx/adapter";
export type {
  ErxCodedDraft,
  ErxDraftResult,
  ErxDrugHit,
  ErxInboxItem,
  ErxMode,
  ErxPatientSync,
  ErxPharmacyHit,
  ErxSendResult,
} from "@/lib/erx/types";

function modeFromEnv(): ErxMode {
  const raw = (process.env.ERX_MODE || "mock").trim().toLowerCase();
  return raw === "live" ? "live" : "mock";
}

/** Resolve eRx adapter. Default mock; live DoseSpot when ERX_MODE=live + keys. */
export function getErxAdapter(): ErxAdapter {
  const mode = modeFromEnv();
  if (mode === "live") {
    return createDoseSpotErxAdapter({
      baseUrl: process.env.ERX_DOSESPOT_BASE_URL,
      subscriptionKey: process.env.ERX_DOSESPOT_SUBSCRIPTION_KEY,
    });
  }
  return createMockErxAdapter();
}

export function getErxMode(): ErxMode {
  return modeFromEnv();
}

export function isControlledSchedule(schedule: string) {
  return schedule === "II" || schedule === "III" || schedule === "IV" || schedule === "V";
}
