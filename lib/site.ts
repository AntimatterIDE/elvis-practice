export const practice = {
  name: "The Alignment Clinic",
  physicianName: "Elvis Francois, MD",
  physicianPath: "/dr-elvis-francois",
  specialty: "Orthopedic spine surgery",
  npi: "1114306040",
  description:
    "The Alignment Clinic is an orthopedic spine practice led by Elvis Francois, MD. Visits start with the problem, explain the findings in plain language, and decide the next step with you.",
} as const;

export const physicianTraining = [
  {
    label: "Spine surgery fellowship",
    value: "Harvard Medical School, Beth Israel Deaconess Medical Center, Boston",
  },
  {
    label: "Orthopedic surgery residency",
    value: "Mayo Clinic, Rochester, Minnesota",
  },
  {
    label: "Medical degree",
    value: "Meharry Medical College, Nashville",
  },
  {
    label: "Undergraduate degree",
    value: "Oberlin College, neuroscience and biology",
  },
] as const;

export const clinicalFocus = [
  "Minimally invasive spine surgery",
  "Cervical and lumbar disc disease",
  "Spinal deformity",
  "Motion-preserving techniques",
] as const;

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
    href: "/conditions#neck-pain",
    body: "Neck pain can come from muscles, joints, a disc, or pressure on a nerve or the spinal cord. The visit starts with your story and an examination.",
  },
  {
    id: "low-back",
    label: "Low back pain",
    href: "/conditions#low-back-pain",
    body: "Low back pain is common, and most episodes are not a surgical problem. A visit looks for the pattern before anyone talks about a procedure.",
  },
  {
    id: "after-surgery",
    label: "Pain after spine surgery",
    href: "/conditions#pain-after-spine-surgery",
    body: "Pain that continues after an operation has more than one explanation. It needs a fresh history, an examination, and a look at the imaging you already have.",
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
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}
