import { conditions } from "@/lib/content/conditions";
import { isPubliclyVisible } from "@/lib/content/publish";
import type { ClinicalDocument } from "@/lib/content/schema";
import { treatments } from "@/lib/content/treatments";

export function allClinicalDocuments(): ClinicalDocument[] {
  return [...conditions, ...treatments];
}

export function getCondition(slug: string) {
  return conditions.find((document) => document.slug === slug) ?? null;
}

export function getTreatment(slug: string) {
  return treatments.find((document) => document.slug === slug) ?? null;
}

export function getClinicalDocument(slug: string) {
  return allClinicalDocuments().find((document) => document.slug === slug) ?? null;
}

export function publicPath(document: ClinicalDocument) {
  return document.kind === "condition"
    ? `/conditions/${document.slug}`
    : `/treatments/${document.slug}`;
}

/** Hub anchors for drafts that are still unpublished on the public site. */
const hubOmittedTreatmentSlugs = new Set([
  "image-guided-spine-surgery",
  "scoliosis-surgery",
  "spine-fracture-surgery",
  "spinal-tumor-surgery",
]);

/** Prefer the detail page when published; otherwise land on the hub section. */
export function clinicalHref(document: ClinicalDocument, now = new Date()) {
  if (isPubliclyVisible(document, now)) return publicPath(document);
  if (document.kind === "treatment" && hubOmittedTreatmentSlugs.has(document.slug)) {
    return "/treatments#operations";
  }
  return document.kind === "condition"
    ? `/conditions#${document.slug}`
    : `/treatments#${document.slug}`;
}

export function previewPath(document: ClinicalDocument) {
  return document.kind === "condition"
    ? `/preview/conditions/${document.slug}`
    : `/preview/treatments/${document.slug}`;
}

export function publicConditions(now = new Date()) {
  return conditions.filter((document) => isPubliclyVisible(document, now));
}

export function publicTreatments(now = new Date()) {
  return treatments.filter((document) => isPubliclyVisible(document, now));
}

export function publicClinicalDocuments(now = new Date()) {
  return allClinicalDocuments().filter((document) => isPubliclyVisible(document, now));
}
