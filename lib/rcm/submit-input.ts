import type { ClaimSubmissionInput } from "@/lib/stedi/payload";
import type { Claim, Patient, PracticeProfile } from "@/lib/rcm/types";

export function claimSubmissionInput(claim: Claim, patient: Patient, practice: PracticeProfile): ClaimSubmissionInput {
  return {
    claimId: claim.id,
    status: claim.status,
    controlNumber: claim.controlNumber,
    idempotencyKey: claim.idempotencyKey || claim.id,
    stediClaimId: claim.stediClaimId,
    tradingPartnerId: claim.tradingPartnerId || patient.coverages.find((coverage) => coverage.rank === "primary")?.tradingPartnerId || "",
    payerName: claim.payerName,
    filingCode: claim.filingCode,
    dateOfService: claim.dateOfService,
    placeOfService: claim.placeOfService,
    assignmentOfBenefits: claim.assignmentOfBenefits !== false,
    priorAuthNumber: claim.priorAuthNumber?.trim() || undefined,
    claimFrequencyCode: claim.claimFrequencyCode === "7" || claim.claimFrequencyCode === "8" ? claim.claimFrequencyCode : "1",
    payerClaimControlNumber: claim.payerClaimControlNumber?.trim() || undefined,
    patient: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      // Fidelis/Stedi claim submission rejects punctuation in subscriber IDs (e.g. 746193066-00 → 74619306600).
      memberId: patient.memberId.replace(/[^A-Za-z0-9]/g, ""),
      address: patient.address,
      city: patient.city,
      state: patient.state,
      postalCode: patient.postalCode,
    },
    practice,
    lines: claim.lines.map((line) => ({
      cpt: line.cpt,
      modifiers: line.modifiers,
      units: line.units,
      charge: line.charge,
      diagnoses: line.diagnoses,
      includeOnBill: line.includeOnBill,
      physician: line.physician,
    })),
  };
}
