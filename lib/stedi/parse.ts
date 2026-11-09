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

/** Stedi portal / modern eligibility JSON nests benefits under plans[].benefits. */
function modernBenefitBags(record: Record<string, unknown>): Record<string, unknown>[] {
  const plans = Array.isArray(record.plans) ? record.plans : [];
  const bags: Record<string, unknown>[] = [];
  for (const plan of plans) {
    const row = asRecord(plan);
    const benefits = asRecord(row?.benefits);
    if (benefits) bags.push(benefits);
  }
  return bags;
}

function coverageActiveFromStatus(status: string): boolean | null {
  const value = status.trim();
  if (!value) return null;
  if (/inactive/i.test(value)) return false;
  // Stedi portal "Active" maps from ACTIVE_COVERAGE (and plain Active Coverage).
  if (/active/i.test(value) || value === "1") return true;
  return null;
}

function serviceCode(item: Record<string, unknown>): string {
  const service = asRecord(item.service);
  return String(service?.value ?? item.serviceTypeCode ?? "");
}

function networkRank(item: Record<string, unknown>): "out" | "in" | "unknown" {
  const nested = asRecord(item.network);
  const raw = String(
    item.inPlanNetworkIndicator ?? item.inNetworkIndicator ?? item.networkIndicator ?? nested?.indicator ?? "",
  ).toUpperCase();
  if (raw === "N" || raw === "OUT_OF_NETWORK" || /out.?of.?network/i.test(String(item.name ?? ""))) return "out";
  // Treat dual-network rows as the OON-preferring choice when a pure OON row is absent.
  if (raw === "IN_AND_OUT_OF_NETWORK") return "out";
  if (raw === "Y" || raw === "IN_NETWORK" || /in.?network/i.test(String(item.name ?? ""))) return "in";
  return "unknown";
}

/** Compact diagnostic for staff when active/inactive cannot be determined. */
export function describeEligibilityPayload(body: unknown): string {
  const record = asRecord(body);
  if (!record) return "empty body";
  const bits: string[] = [];
  const meta = [
    record.id,
    record.controlNumber,
    record.transactionId,
    record.eligibilitySearchId,
    record.traceId,
    asRecord(record.meta)?.traceId,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (meta[0]) bits.push(`id ${meta[0]}`);
  const payer = asRecord(record.payer);
  const payerOrg = asRecord(payer?.name)?.organization;
  const payerName =
    typeof payer?.name === "string"
      ? payer.name
      : typeof payerOrg === "string"
        ? payerOrg
        : typeof record.payerName === "string"
          ? record.payerName
          : "";
  if (payerName) bits.push(`payer ${payerName}`);
  const errors = Array.isArray(record.errors) ? record.errors : [];
  for (const error of errors.slice(0, 3)) {
    const item = asRecord(error);
    const text = typeof item?.description === "string" ? item.description : typeof item?.message === "string" ? item.message : typeof item?.code === "string" ? item.code : "";
    if (text.trim()) bits.push(text.trim());
  }
  const planStatus = Array.isArray(record.planStatus) ? record.planStatus : [];
  for (const plan of planStatus.slice(0, 3)) {
    const item = asRecord(plan);
    const status = typeof item?.status === "string" ? item.status : typeof item?.statusCode === "string" ? item.statusCode : "";
    if (status.trim()) bits.push(`plan ${status.trim()}`);
  }
  const modernStatuses: string[] = [];
  for (const bag of modernBenefitBags(record)) {
    const statuses = Array.isArray(bag.statuses) ? bag.statuses : [];
    for (const row of statuses.slice(0, 6)) {
      const item = asRecord(row);
      const status = typeof item?.status === "string" ? item.status.trim() : "";
      if (status) modernStatuses.push(status);
    }
  }
  if (modernStatuses.length) {
    bits.push(`statuses ${[...new Set(modernStatuses)].slice(0, 4).join(",")}`);
  }
  const benefits = Array.isArray(record.benefitsInformation) ? record.benefitsInformation : [];
  if (benefits.length) {
    const codes = benefits
      .map((benefit) => {
        const item = asRecord(benefit);
        return typeof item?.code === "string" ? item.code : "";
      })
      .filter(Boolean)
      .slice(0, 8);
    bits.push(codes.length ? `benefits ${codes.join(",")}` : `${benefits.length} benefits`);
  } else if (!modernStatuses.length) {
    bits.push("no benefitsInformation");
  }
  const subscriber = asRecord(record.subscriber);
  if (subscriber) {
    const person = asRecord(asRecord(subscriber.name)?.person) || asRecord(subscriber);
    const first = typeof person?.firstName === "string" ? person.firstName : "";
    const last = typeof person?.lastName === "string" ? person.lastName : "";
    const memberId = typeof subscriber.memberId === "string" ? subscriber.memberId : "";
    const who = [first, last].filter(Boolean).join(" ");
    if (who || memberId) bits.push(`returned ${[who, memberId].filter(Boolean).join(" / ")}`);
  }
  return bits.join(" · ").slice(0, 280) || "no diagnostic fields";
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
  const modernBags = modernBenefitBags(record);
  let copay: number | null = null;
  let coinsurance: number | null = null;
  let deductibleRemaining: number | null = null;
  let mentionsAuthorization = false;
  let active: boolean | null = null;
  let planLevelActive: boolean | null = null;
  let sawOutOfNetwork = false;
  let sawInNetwork = false;

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

  // Classic X12-mapped Stedi body (benefitsInformation EB codes).
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

  // Track whether the chosen copay/coins came from Medical Care (STC 1).
  let copayIsMedical = false;
  let coinsIsMedical = false;
  let deductibleIsPlan = false;

  // Modern Stedi portal shape: plans[].benefits.{statuses,coPayment,coInsurance,deductible}.
  for (const bag of modernBags) {
    const statuses = Array.isArray(bag.statuses) ? bag.statuses : [];
    for (const row of statuses) {
      const item = asRecord(row);
      if (!item) continue;
      const flag = coverageActiveFromStatus(String(item.status ?? ""));
      if (flag == null) continue;
      if (serviceCode(item) === "30") planLevelActive = flag;
      else if (active == null) active = flag;
      if (flag === false) active = false;
    }
    for (const row of Array.isArray(bag.coPayment) ? bag.coPayment : []) {
      const item = asRecord(row);
      if (!item) continue;
      const network = networkRank(item);
      if (network === "out") sawOutOfNetwork = true;
      if (network === "in") sawInNetwork = true;
      const svc = serviceCode(item);
      if (String(item.priorAuthIndicator ?? "").toUpperCase() === "REQUIRED" && (svc === "1" || svc === "30" || !svc)) {
        mentionsAuthorization = true;
      }
      const value = amount(item.amount);
      if (value == null) continue;
      const medical = svc === "1";
      if (medical && !copayIsMedical) {
        copay = value;
        preferredCopay = network === "out";
        copayIsMedical = true;
      } else if (medical === copayIsMedical || !copayIsMedical) {
        if (!medical && copayIsMedical) continue;
        const taken = takeAmount(copay, value, network, preferredCopay);
        copay = taken.value;
        preferredCopay = taken.preferredTaken;
        if (medical) copayIsMedical = true;
      }
    }
    for (const row of Array.isArray(bag.coInsurance) ? bag.coInsurance : []) {
      const item = asRecord(row);
      if (!item) continue;
      const network = networkRank(item);
      if (network === "out") sawOutOfNetwork = true;
      if (network === "in") sawInNetwork = true;
      const svc = serviceCode(item);
      if (String(item.priorAuthIndicator ?? "").toUpperCase() === "REQUIRED" && (svc === "1" || svc === "30" || !svc)) {
        mentionsAuthorization = true;
      }
      const percent = amount(item.percent ?? item.benefitPercent);
      const value = percent == null ? null : percent <= 1 ? percent * 100 : percent;
      if (value == null) continue;
      const medical = svc === "1";
      if (medical && !coinsIsMedical) {
        coinsurance = value;
        preferredCoins = network === "out";
        coinsIsMedical = true;
      } else if (medical === coinsIsMedical || !coinsIsMedical) {
        if (!medical && coinsIsMedical) continue;
        const taken = takeAmount(coinsurance, value, network, preferredCoins);
        coinsurance = taken.value;
        preferredCoins = taken.preferredTaken;
        if (medical) coinsIsMedical = true;
      }
    }
    for (const row of Array.isArray(bag.deductible) ? bag.deductible : []) {
      const item = asRecord(row);
      if (!item) continue;
      const network = networkRank(item);
      if (network === "out") sawOutOfNetwork = true;
      if (network === "in") sawInNetwork = true;
      const period = String(item.timePeriod ?? "").toUpperCase();
      const level = String(item.coverageLevel ?? "").toUpperCase();
      // Match Stedi overview: individual remaining deductible on plan coverage (STC 30).
      if (period && period !== "REMAINING") continue;
      if (level === "FAMILY") continue;
      const value = amount(item.amount);
      if (value == null) continue;
      const planCoverage = serviceCode(item) === "30" || !serviceCode(item);
      if (planCoverage && !deductibleIsPlan) {
        deductibleRemaining = value;
        preferredDeductible = network === "out";
        deductibleIsPlan = true;
      } else if (planCoverage === deductibleIsPlan || !deductibleIsPlan) {
        if (!planCoverage && deductibleIsPlan) continue;
        const taken = takeAmount(deductibleRemaining, value, network, preferredDeductible);
        deductibleRemaining = taken.value;
        preferredDeductible = taken.preferredTaken;
        if (planCoverage) deductibleIsPlan = true;
      }
    }
  }
  if (planLevelActive != null) active = planLevelActive;

  const planStatus = Array.isArray(record.planStatus) ? record.planStatus : [];
  for (const plan of planStatus) {
    const item = asRecord(plan);
    const flag = coverageActiveFromStatus(String(item?.status ?? item?.statusCode ?? ""));
    if (flag == null) continue;
    if (flag === false) active = false;
    else active = active ?? true;
  }
  if (errorText && benefits.length === 0 && modernBags.length === 0) {
    return {
      active: null,
      copay: null,
      coinsurance: null,
      deductibleRemaining: null,
      summary: `${errorText} (${describeEligibilityPayload(body)})`,
      mentionsAuthorization: false,
    };
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
  const diagnostic = active == null ? describeEligibilityPayload(body) : "";
  const summary = [state, missing.join(", "), networkNote, mentionsAuthorization ? "The response mentions authorization. That is not an approval." : "", diagnostic ? `(${diagnostic})` : ""]
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

function textField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const record = asRecord(value);
  if (!record) return "";
  for (const key of ["description", "message", "statusCodeValue", "value", "code", "name"]) {
    const nested = record[key];
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return "";
}

/** Pull human-readable 276/277 claim-status detail from a Stedi JSON body. */
export function summarizeClaimStatus(body: unknown): string {
  const record = asRecord(body);
  if (!record) return "Claim status returned with an empty body.";

  const chunks: string[] = [];
  const errors = Array.isArray(record.errors) ? record.errors : [];
  for (const error of errors) {
    const text = textField(error);
    if (text) chunks.push(text);
  }

  const claims = Array.isArray(record.claims) ? record.claims : Array.isArray(record.claimStatusInformation) ? record.claimStatusInformation : [];
  for (const claim of claims) {
    const row = asRecord(claim);
    if (!row) continue;
    const category = textField(row.statusCategoryCode ?? row.claimStatusCategoryCode);
    const code = textField(row.statusCode ?? row.claimStatusCode);
    const status = textField(row.status ?? row.statusCodeValue ?? row.claimStatus);
    const effective = textField(row.statusEffectiveDate ?? row.effectiveDate);
    const control = textField(row.patientControlNumber ?? row.payerClaimControlNumber);
    const parts = [
      category && code ? `${category}:${code}` : category || code || "",
      status,
      control ? `control ${control}` : "",
      effective ? `as of ${effective}` : "",
    ].filter(Boolean);
    if (parts.length) chunks.push(parts.join(" · "));

    const infos = Array.isArray(row.claimStatusInformation)
      ? row.claimStatusInformation
      : Array.isArray(row.serviceLineStatusInformation)
        ? row.serviceLineStatusInformation
        : [];
    for (const info of infos) {
      const detail = asRecord(info);
      if (!detail) continue;
      const dCategory = textField(detail.statusCategoryCode);
      const dCode = textField(detail.statusCode);
      const dStatus = textField(detail.status ?? detail.statusCodeValue);
      const line = [dCategory && dCode ? `${dCategory}:${dCode}` : dCategory || dCode || "", dStatus].filter(Boolean).join(" · ");
      if (line) chunks.push(line);
    }
  }

  if (!chunks.length) {
    const message = textField(record.message);
    if (message) return message.slice(0, 240);
    return "Claim status returned. That is the payer’s status, not a new payment.";
  }
  return chunks.join("; ").slice(0, 240);
}
