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
  return "123450000";
}

function money(value: number) {
  return value.toFixed(2);
}

export function billingIdentity(practice: ClaimSubmissionInput["practice"]) {
  const npi = /^\d{10}$/.test(practice.npi) ? practice.npi : TEST_NPI;
  const taxId = practice.taxId.replace(/\D/g, "");
  const employerId = taxId.length === 9 ? taxId : TEST_TAX_ID;
  const taxonomy = /^[A-Z0-9]{9}X$/.test(practice.taxonomy) ? practice.taxonomy : TEST_TAXONOMY;
  const usedTestProvider = npi === TEST_NPI || employerId === TEST_TAX_ID;
  return {
    npi,
    employerId,
    taxonomy,
    usedTestProvider,
    organizationName: practice.legalName || "The Alignment Clinic",
    phone: practice.phone.replace(/\D/g, "").slice(0, 10) || "5552223333",
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

  return {
    usedTestProvider: billing.usedTestProvider,
    body: {
      usageIndicator: "T" as const,
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
          address1: input.patient.address || "2222 Random St",
          city: input.patient.city || "A City",
          state: (input.patient.state || "NY").slice(0, 2).toUpperCase(),
          postalCode: postal(input.patient.postalCode),
        },
      },
      billing: {
        providerType: "BillingProvider",
        npi: billing.npi,
        employerId: billing.employerId,
        taxonomyCode: billing.taxonomy,
        organizationName: billing.organizationName,
        address: {
          address1: "123 Some St",
          city: "A City",
          state: "NY",
          postalCode: "123450000",
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
