import type { PracticeProfile, Sex } from "@/lib/rcm/types";

export type SubmissionLine = {
  cpt: string;
  modifiers: string[];
  units: number;
  charge: number;
  diagnoses: string[];
  includeOnBill: boolean;
  physician: string;
};

export type ClaimSubmissionInput = {
  claimId: string;
  status: string;
  controlNumber: string;
  idempotencyKey: string;
  stediClaimId?: string;
  tradingPartnerId: string;
  payerName: string;
  dateOfService: string;
  placeOfService: string;
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: Sex;
    memberId: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  };
  practice: Pick<PracticeProfile, "legalName" | "physicianName" | "npi" | "taxId" | "taxonomy" | "phone" | "address">;
  lines: SubmissionLine[];
};

const TEST_NPI = "1999999984";
const TEST_TAX_ID = "123456789";
const TEST_TAXONOMY = "207X00000X";

function splitAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const street = parts.slice(0, -2).join(", ");
  const city = parts.at(-2) ?? "";
  const tail = (parts.at(-1) ?? "").match(/^([A-Za-z]{2})\s+(\d{5})(?:-?(\d{4}))?$/);
  if (!street || !city || !tail) return null;
  return {
    address1: street,
    city,
    state: tail[1].toUpperCase(),
    postalCode: `${tail[2]}${tail[3] ?? "0000"}`,
  };
}

export function productionClaimProblems(input: ClaimSubmissionInput) {
  const problems: string[] = [];
  const npi = input.practice.npi.replace(/\D/g, "");
  const taxId = input.practice.taxId.replace(/\D/g, "");
  if (npi.length !== 10 || npi === TEST_NPI) problems.push("Enter the practice NPI on the Practice page before submitting.");
  if (taxId.length !== 9 || taxId === TEST_TAX_ID) problems.push("Enter the practice tax id on the Practice page before submitting.");
  if (!splitAddress(input.practice.address)) problems.push("Enter the practice address as street, city, ST ZIP.");
  if (!input.patient.address.trim() || !input.patient.city.trim() || input.patient.state.trim().length < 2 || input.patient.postalCode.replace(/\D/g, "").length < 5) {
    problems.push("The patient needs a street, city, state, and ZIP before a claim is submitted.");
  }
  if (!input.patient.memberId.trim() || input.patient.memberId.startsWith("STEDI")) {
    problems.push("Enter the patient’s real member id. A demo member id was not sent.");
  }
  if (!input.tradingPartnerId.trim() || input.tradingPartnerId === "STEDI") {
    problems.push("Choose the real payer. The test payer STEDI was not used.");
  }
  if (!input.lines.some((line) => line.includeOnBill && line.cpt && line.charge > 0)) {
    problems.push("Include at least one charged line before submitting.");
  }
  return problems;
}

export function compactDate(value: string) {
  return value.replaceAll("-", "").slice(0, 8);
}

export function diagnosisCode(value: string) {
  return value.replaceAll(".", "").toUpperCase();
}

function gender(sex: Sex) {
  if (sex === "female") return "F";
  if (sex === "male") return "M";
  return "U";
}

function postal(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 9) return digits.slice(0, 9);
  if (digits.length === 5) return `${digits}0000`;
  return digits;
}

function money(value: number) {
  return value.toFixed(2);
}

export function billingIdentity(practice: ClaimSubmissionInput["practice"]) {
  const npi = practice.npi.replace(/\D/g, "");
  const taxId = practice.taxId.replace(/\D/g, "");
  const taxonomy = /^[A-Z0-9]{9}X$/.test(practice.taxonomy) ? practice.taxonomy : TEST_TAXONOMY;
  return {
    npi,
    employerId: taxId,
    taxonomy,
    organizationName: practice.legalName || "The Alignment Clinic",
    phone: practice.phone.replace(/\D/g, "").slice(0, 10),
  };
}

export function buildProfessionalClaim(input: ClaimSubmissionInput) {
  const included = input.lines.filter((line) => line.includeOnBill && line.cpt);
  const diagnoses = [...new Set(included.flatMap((line) => line.diagnoses.filter(Boolean)))];
  const billing = billingIdentity(input.practice);
  const physician = input.practice.physicianName || included[0]?.physician || "Elvis Francois";
  const [firstName, ...rest] = physician.replace(/,?\s*MD$/i, "").split(" ");
  const lastName = rest.join(" ") || "Francois";
  const total = included.reduce((sum, line) => sum + line.charge * line.units, 0);
  const control = input.controlNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);

  const practiceAddress = splitAddress(input.practice.address);
  return {
    body: {
      usageIndicator: "P" as const,
      tradingPartnerServiceId: input.tradingPartnerId,
      tradingPartnerName: input.payerName,
      submitter: {
        organizationName: billing.organizationName,
        submitterIdentification: billing.npi,
        contactInformation: { name: billing.organizationName, phoneNumber: billing.phone },
      },
      receiver: { organizationName: input.payerName },
      subscriber: {
        memberId: input.patient.memberId,
        paymentResponsibilityLevelCode: "P",
        firstName: input.patient.firstName,
        lastName: input.patient.lastName,
        gender: gender(input.patient.sex),
        dateOfBirth: compactDate(input.patient.dateOfBirth),
        address: {
          address1: input.patient.address,
          city: input.patient.city,
          state: input.patient.state.slice(0, 2).toUpperCase(),
          postalCode: postal(input.patient.postalCode),
        },
      },
      billing: {
        providerType: "BillingProvider",
        npi: billing.npi,
        employerId: billing.employerId,
        taxonomyCode: billing.taxonomy,
        organizationName: billing.organizationName,
        address: practiceAddress ?? {
          address1: input.practice.address,
          city: "",
          state: "",
          postalCode: "",
        },
        contactInformation: { name: billing.organizationName, phoneNumber: billing.phone },
      },
      claimInformation: {
        claimFilingCode: "CI",
        patientControlNumber: control,
        claimChargeAmount: money(total),
        placeOfServiceCode: input.placeOfService || "11",
        claimFrequencyCode: "1",
        signatureIndicator: "Y",
        planParticipationCode: "A",
        benefitsAssignmentCertificationIndicator: "Y",
        releaseInformationCode: "Y",
        healthCareCodeInformation: diagnoses.map((code, index) => ({
          diagnosisTypeCode: index === 0 ? "ABK" : "ABF",
          diagnosisCode: diagnosisCode(code),
        })),
        serviceLines: included.map((line, index) => {
          const pointers = line.diagnoses
            .map((code) => String(diagnoses.indexOf(code) + 1))
            .filter((pointer) => pointer !== "0");
          return {
            serviceDate: compactDate(input.dateOfService),
            professionalService: {
              procedureIdentifier: "HC",
              procedureCode: line.cpt,
              ...(line.modifiers.length ? { procedureModifiers: line.modifiers } : {}),
              lineItemChargeAmount: money(line.charge * line.units),
              measurementUnit: "UN",
              serviceUnitCount: String(line.units),
              compositeDiagnosisCodePointers: { diagnosisCodePointers: pointers.length ? pointers : ["1"] },
            },
            providerControlNumber: `${control}${index + 1}`.slice(0, 30),
            renderingProvider: {
              providerType: "RenderingProvider",
              npi: billing.npi,
              taxonomyCode: billing.taxonomy,
              firstName: firstName || "Elvis",
              lastName,
            },
          };
        }),
      },
    },
  };
}
