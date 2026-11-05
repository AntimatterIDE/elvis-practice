export type BenefitSummary = {
  active: boolean | null;
  copay: number | null;
  coinsurance: number | null;
  deductibleRemaining: number | null;
  summary: string;
  mentionsAuthorization: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function amount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function summarizeEligibility(body: unknown): BenefitSummary {
  const record = asRecord(body);
  if (!record) {
    return { active: null, copay: null, coinsurance: null, deductibleRemaining: null, summary: "Stedi returned an empty eligibility response.", mentionsAuthorization: false };
  }
  const errors = Array.isArray(record.errors) ? record.errors : [];
  const errorText = errors
    .map((error) => {
      const item = asRecord(error);
      return typeof item?.description === "string" ? item.description : typeof item?.message === "string" ? item.message : "";
    })
    .find(Boolean);
  const benefits = Array.isArray(record.benefitsInformation) ? record.benefitsInformation : [];
  let copay: number | null = null;
  let coinsurance: number | null = null;
  let deductibleRemaining: number | null = null;
  let mentionsAuthorization = false;
  let active: boolean | null = null;
  let sawOutOfNetwork = false;
  let sawInNetwork = false;

  function networkRank(item: Record<string, unknown>) {
    const raw = String(item.inPlanNetworkIndicator ?? item.inNetworkIndicator ?? item.networkIndicator ?? "").toUpperCase();
    if (raw === "N" || /out.?of.?network/i.test(String(item.name ?? ""))) return "out";
    if (raw === "Y" || /in.?network/i.test(String(item.name ?? ""))) return "in";
    return "unknown";
  }

  function takeAmount(current: number | null, next: number | null, network: "out" | "in" | "unknown", preferredTaken: boolean) {
    if (next == null) return { value: current, preferredTaken };
    if (network === "out") return { value: next, preferredTaken: true };
    if (preferredTaken) return { value: current, preferredTaken };
    if (current == null) return { value: next, preferredTaken: false };
    return { value: current, preferredTaken };
  }

  let preferredCopay = false;
  let preferredCoins = false;
  let preferredDeductible = false;
  for (const benefit of benefits) {
    const item = asRecord(benefit);
    if (!item) continue;
    const code = String(item.code ?? "");
    const name = String(item.name ?? "");
    const network = networkRank(item);
    if (network === "out") sawOutOfNetwork = true;
    if (network === "in") sawInNetwork = true;
    if (code === "1" || /active coverage/i.test(name)) active = true;
    if (code === "6" || /inactive/i.test(name)) active = false;
    if (item.authOrCertIndicator === "Y") mentionsAuthorization = true;
    if (code === "B") {
      const taken = takeAmount(copay, amount(item.benefitAmount), network, preferredCopay);
      copay = taken.value;
      preferredCopay = taken.preferredTaken;
    }
    if (code === "A") {
      const percent = amount(item.benefitPercent);
      const coins = percent == null ? null : percent <= 1 ? percent * 100 : percent;
      const taken = takeAmount(coinsurance, coins, network, preferredCoins);
      coinsurance = taken.value;
      preferredCoins = taken.preferredTaken;
    }
    if (code === "C" || code === "D") {
      const taken = takeAmount(deductibleRemaining, amount(item.benefitAmount), network, preferredDeductible);
      deductibleRemaining = taken.value;
      preferredDeductible = taken.preferredTaken;
    }
  }
  const planStatus = Array.isArray(record.planStatus) ? record.planStatus : [];
  for (const plan of planStatus) {
    const item = asRecord(plan);
    const status = String(item?.status ?? item?.statusCode ?? "");
    if (/active/i.test(status) || status === "1") active = active ?? true;
    if (/inactive/i.test(status)) active = false;
  }
  if (errorText && benefits.length === 0) {
    return { active: null, copay: null, coinsurance: null, deductibleRemaining: null, summary: errorText, mentionsAuthorization: false };
  }
  const missing = [
    copay == null ? "copay unknown" : null,
    coinsurance == null ? "coinsurance unknown" : null,
    deductibleRemaining == null ? "deductible unknown" : null,
  ].filter(Boolean);
  const state = active == null ? "Coverage status unknown" : active ? "Coverage active" : "Coverage inactive";
  const networkNote = sawOutOfNetwork
    ? "Amounts shown prefer out-of-network benefits."
    : sawInNetwork
      ? "Only in-network amounts were returned. Out-of-network benefits were not listed."
      : "";
  const summary = [state, missing.join(", "), networkNote, mentionsAuthorization ? "The response mentions authorization. That is not an approval." : ""]
    .filter(Boolean)
    .join(". ");
  return { active, copay, coinsurance, deductibleRemaining, summary, mentionsAuthorization };
}

export type RemitMatch = {
  controlNumber: string;
  paid: number | null;
  patientResponsibility: number | null;
  adjustment: number | null;
  reasonCode: string;
  outcome: "paid" | "partial" | "denied" | "unknown";
};

function walkRemits(value: unknown, found: RemitMatch[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkRemits(item, found);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.patientControlNumber === "string") {
    const paid = amount(record.claimPaymentAmount ?? record.paidAmount);
    const patientResponsibility = amount(record.patientResponsibilityAmount);
    const total = amount(record.totalClaimChargeAmount);
    const status = String(record.claimStatusCode ?? "");
    let reasonCode = "";
    let adjustment: number | null = null;
    const adjustments = record.serviceAdjustments ?? record.claimAdjustments;
    if (Array.isArray(adjustments)) {
      for (const adjustmentRow of adjustments) {
        const row = asRecord(adjustmentRow);
        if (!row) continue;
        if (!reasonCode && typeof row.adjustmentReasonCode1 === "string") reasonCode = row.adjustmentReasonCode1;
        if (!reasonCode && typeof row.claimAdjustmentReasonCode === "string") reasonCode = row.claimAdjustmentReasonCode;
        adjustment = adjustment ?? amount(row.adjustmentAmount1 ?? row.adjustmentAmount);
      }
    }
    let outcome: RemitMatch["outcome"] = "unknown";
    if (status === "4" || reasonCode === "31" || (paid === 0 && total && total > 0)) outcome = "denied";
    else if (paid != null && total != null && paid > 0 && paid < total) outcome = "partial";
    else if (paid != null && total != null && paid >= total) outcome = "paid";
    else if (paid != null && paid > 0 && patientResponsibility) outcome = "partial";
    else if (paid != null && paid > 0) outcome = "paid";
    found.push({
      controlNumber: record.patientControlNumber,
      paid,
      patientResponsibility,
      adjustment,
      reasonCode,
      outcome,
    });
  }
  for (const child of Object.values(record)) walkRemits(child, found);
}

export function readRemits(body: unknown) {
  const found: RemitMatch[] = [];
  walkRemits(body, found);
  return found;
}
