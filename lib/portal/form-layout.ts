import type { IntakeField, IntakeMap } from "@/lib/portal/types";

export const intakeSections = {
  you: {
    title: "About you",
    lede: "This is the name and date of birth on your chart.",
  },
  reach: {
    title: "How we reach you",
    lede: "We use this the day of your visit. A portal login, if the practice sends one, goes to this email.",
  },
  coverage: {
    title: "Insurance",
    lede: "Bring the card to the visit. Leave this blank if you are paying yourself.",
  },
  emergency: {
    title: "If we cannot reach you",
    lede: "Someone we can call. This is not your referring physician.",
  },
  pharmacy: {
    title: "Pharmacy",
    lede: "Where a prescription should go, if you need one.",
  },
  visit: {
    title: "Why you are coming",
    lede: "A few sentences is enough. Please do not attach photos.",
  },
  other: {
    title: "A few more questions",
    lede: "The practice added these for your visit.",
  },
  safety: {
    title: "Before you send",
    lede: "This form does not reach a clinician in real time.",
  },
} as const;

export type IntakeSectionKey = keyof typeof intakeSections;

const mappedSection: Record<IntakeMap, IntakeSectionKey> = {
  firstName: "you",
  lastName: "you",
  preferredName: "you",
  dateOfBirth: "you",
  sex: "you",
  phone: "reach",
  email: "reach",
  address: "reach",
  city: "reach",
  state: "reach",
  postalCode: "reach",
  payerName: "coverage",
  memberId: "coverage",
  emergencyName: "emergency",
  emergencyPhone: "emergency",
  emergencyRelation: "emergency",
  pharmacyName: "pharmacy",
  pharmacyPhone: "pharmacy",
};

export function intakeSectionKey(field: IntakeField): IntakeSectionKey {
  if (field.type === "acknowledge") return "safety";
  if (field.mapsTo) return mappedSection[field.mapsTo];
  if (field.type === "long_text" || field.id === "reasonForVisit") return "visit";
  return "other";
}

export function intakeBlocks(fields: IntakeField[]) {
  const safety = fields.filter((field) => field.type === "acknowledge");
  const rest = fields.filter((field) => field.type !== "acknowledge");
  const grouped: { key: IntakeSectionKey; fields: IntakeField[] }[] = [];
  for (const field of rest) {
    const key = intakeSectionKey(field);
    const last = grouped[grouped.length - 1];
    if (last?.key === key) last.fields.push(field);
    else grouped.push({ key, fields: [field] });
  }
  if (safety.length) grouped.push({ key: "safety", fields: safety });
  return grouped;
}

export function intakeFieldSpan(field: IntakeField) {
  if (field.type === "long_text" || field.type === "acknowledge" || field.type === "yes_no") return "min-w-0 sm:col-span-6";
  if (field.type === "select") return "min-w-0 sm:col-span-6";
  if (field.mapsTo === "address" || field.mapsTo === "preferredName") return "min-w-0 sm:col-span-6";
  if (field.mapsTo === "city" || field.mapsTo === "state" || field.mapsTo === "postalCode") return "min-w-0 sm:col-span-2";
  return "min-w-0 sm:col-span-3";
}
