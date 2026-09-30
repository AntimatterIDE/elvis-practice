export const practice = {
  name: "The Alignment Clinic",
  physicianName: "Elvis Francois, MD",
  physicianPath: "/dr-elvis-francois",
  description:
    "The Alignment Clinic is a spine practice led by Elvis Francois, MD. Visits are unhurried, explanations are plain, and decisions are made with you.",
} as const;

export const emergencyNote =
  "This website does not provide emergency care. If you have sudden weakness, trouble walking, loss of bowel or bladder control, fever with severe back or neck pain, or a recent serious injury, call 911 or go to the nearest emergency department.";

export const publicNav = [
  { href: "/about", label: "About" },
  { href: "/conditions", label: "Conditions" },
  { href: "/treatments", label: "Treatments" },
  { href: "/visit", label: "Your visit" },
  { href: "/questions", label: "Questions" },
  { href: "/contact", label: "Contact" },
] as const;

export const carePathways = [
  {
    id: "neck",
    label: "Neck pain",
    body: "Neck pain can come from muscles, joints, discs, or pressure on a nerve. A guide is being written for this practice and will be published only after a clinician reviews it.",
  },
  {
    id: "low-back",
    label: "Low back pain",
    body: "Low back pain is common, and most episodes are not a surgical problem. The written guide stays in draft until the practice confirms how this care is offered here.",
  },
  {
    id: "after-surgery",
    label: "Pain after spine surgery",
    body: "Pain that continues after an operation needs a careful second look, not a slogan. That page will not go live until Dr. Francois confirms it belongs on this site.",
  },
  {
    id: "visit",
    label: "How a visit works",
    href: "/visit",
    body: "A visit is a conversation, an examination, and a plan you can understand. Surgery is one possible path, not the starting assumption.",
  },
] as const;

export function canonicalOrigin() {
  return process.env.CANONICAL_ORIGIN?.replace(/\/$/, "") || "https://thealignmentclinic.com";
}

export function canonicalHost() {
  return process.env.CANONICAL_HOST || "thealignmentclinic.com";
}

export function isIndexingEnabled() {
  return process.env.INDEXING_ENABLED === "true" && process.env.VERCEL_ENV === "production";
}

export function canViewDraftsWithoutAuth() {
  return process.env.NODE_ENV !== "production";
}

export function isAdminHostAllowed(hostHeader: string | null) {
  if (!hostHeader) return false;
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname === canonicalHost().toLowerCase()) return true;
  if (process.env.VERCEL_ENV === "preview" && hostname.endsWith(".vercel.app")) return true;
  return false;
}
