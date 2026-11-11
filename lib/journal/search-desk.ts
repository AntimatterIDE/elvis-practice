import { clinicalHref, getClinicalDocument } from "@/lib/content";

export type SearchTheme = {
  phrase: string;
  label: string;
  href: string;
  intent: string;
  slug: string;
};

const themeDefs: Omit<SearchTheme, "href">[] = [
  { phrase: "neck pain", label: "Neck pain", slug: "neck-pain", intent: "Neck and arm pain searches" },
  { phrase: "low back pain", label: "Low back pain", slug: "low-back-pain", intent: "Back pain searches" },
  { phrase: "sciatica", label: "Sciatica", slug: "sciatica", intent: "Leg pain searches" },
  { phrase: "herniated disc", label: "Herniated disc", slug: "herniated-disc", intent: "Disc herniation searches" },
  { phrase: "spinal stenosis", label: "Spinal stenosis", slug: "spinal-stenosis", intent: "Stenosis and walking searches" },
  { phrase: "cervical myelopathy", label: "Cervical myelopathy", slug: "cervical-myelopathy", intent: "Spinal cord compression searches" },
  { phrase: "spondylolisthesis", label: "Spondylolisthesis", slug: "spondylolisthesis", intent: "Slip of a vertebra searches" },
  { phrase: "after spine surgery", label: "After spine surgery", slug: "pain-after-spine-surgery", intent: "People who already had an operation" },
  { phrase: "spinal fusion", label: "Spinal fusion", slug: "spinal-fusion", intent: "Fusion searches" },
  { phrase: "anterior cervical", label: "ACDF", slug: "acdf", intent: "Neck fusion searches" },
  { phrase: "cervical fusion", label: "Cervical fusion", slug: "cervical-fusion", intent: "Neck fusion searches" },
  { phrase: "cervical disc", label: "Cervical disc surgery", slug: "cervical-disc-surgery", intent: "Disc replacement and neck disc searches" },
  { phrase: "microdiscectomy", label: "Lumbar microdiscectomy", slug: "lumbar-microdiscectomy", intent: "Disc surgery searches" },
  { phrase: "laminectomy", label: "Laminectomy", slug: "laminectomy", intent: "Decompression searches" },
  { phrase: "lumbar fusion", label: "Lumbar fusion", slug: "lumbar-fusion", intent: "Low-back fusion searches" },
  { phrase: "minimally invasive", label: "Minimally invasive surgery", slug: "minimally-invasive-spine-surgery", intent: "Smaller-incision searches" },
  { phrase: "image-guided", label: "Image-guided surgery", slug: "image-guided-spine-surgery", intent: "Navigation searches" },
  { phrase: "revision", label: "Revision surgery", slug: "revision-spine-surgery", intent: "Another operation searches" },
  { phrase: "scoliosis", label: "Scoliosis surgery", slug: "scoliosis-surgery", intent: "Curve and alignment searches" },
];

function hrefForSlug(slug: string) {
  const document = getClinicalDocument(slug);
  if (!document) return `/conditions#${slug}`;
  return clinicalHref(document);
}

export const searchThemes: SearchTheme[] = themeDefs.map((theme) => ({
  ...theme,
  href: hrefForSlug(theme.slug),
}));

const filler = new Set(["the", "and", "for", "with", "from", "that", "this", "what", "how", "alignment", "clinic", "specializes", "understanding", "insights", "recent", "research"]);

export function journalKeywords(input: { title: string; summary: string; seoTitle: string }) {
  const fromThemes = searchThemes
    .filter((theme) => `${input.title} ${input.summary} ${input.seoTitle}`.toLowerCase().includes(theme.phrase))
    .map((theme) => theme.label);
  const words = input.seoTitle
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !filler.has(word));
  return [...new Set([input.seoTitle.trim(), ...fromThemes, ...words])].filter(Boolean).slice(0, 8);
}

export function metadataChecks(seoTitle: string, seoDescription: string) {
  return [
    {
      label: "Search title",
      detail: `${seoTitle.length} characters. Aim for 45 to 60.`,
      ok: seoTitle.length >= 20 && seoTitle.length <= 60,
    },
    {
      label: "Search description",
      detail: `${seoDescription.length} characters. Aim for 110 to 160.`,
      ok: seoDescription.length >= 80 && seoDescription.length <= 170,
    },
  ];
}

export function themesInText(text: string) {
  const haystack = text.toLowerCase();
  return searchThemes.filter((theme) => haystack.includes(theme.phrase));
}

export function uncoveredThemes(notes: { title: string; summary: string; body: string; reviewStatus: string }[]) {
  const haystack = notes
    .filter((note) => note.reviewStatus === "approved")
    .map((note) => `${note.title} ${note.summary} ${note.body}`)
    .join("\n")
    .toLowerCase();
  return searchThemes.filter((theme) => !haystack.includes(theme.phrase));
}
