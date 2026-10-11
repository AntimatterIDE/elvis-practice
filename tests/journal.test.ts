import { describe, expect, it } from "vitest";
import { journalNotesMatching } from "@/lib/journal/browse";
import { journalKeywords, uncoveredThemes } from "@/lib/journal/search-desk";
import { journalBody } from "@/lib/journal/body";
import { articleSlug, journalSearchFallback, journalSearchQuery, papersForDraft, papersFromEuropePmc } from "@/lib/journal/papers";
import { chooseJournalPhoto, journalCoverKind, type JournalPhoto } from "@/lib/journal/photo";
import { journalSections, readingMinutes } from "@/lib/journal/sections";
import { parseJournalDraft } from "@/lib/journal/draft-json";
import { referenceNotes } from "@/lib/journal/reference-notes";
import { explainAdsError } from "@/lib/ads/access";
import { ga4PropertyId, googleAdsCampaignId, googleMeasurementId } from "@/lib/ads/config";

describe("journal research", () => {
  it("keeps pubmed papers and drops rows without an id", () => {
    const papers = papersFromEuropePmc({
      resultList: {
        result: [
          {
            pmid: "123",
            title: "Lumbar <i>stenosis</i> review",
            journalTitle: "The Spine Journal",
            pubYear: "2024",
            authorString: "Lee A",
            abstractText: "A short abstract.",
          },
          { title: "Missing id" },
          { pmid: "123", title: "Duplicate" },
          { pmid: "456", title: "Cervical cancer screening rates among women", abstractText: "Pap smear disparities." },
        ],
      },
    });
    expect(papers).toEqual([
      {
        pmid: "123",
        title: "Lumbar stenosis review",
        journal: "The Spine Journal",
        year: "2024",
        authors: "Lee A",
        abstract: "A short abstract.",
        doi: null,
      },
    ]);
  });

  it("builds a spine search from a topic and a fallback without one", () => {
    expect(journalSearchQuery("lumbar stenosis")).toContain("TITLE_ABS:lumbar");
    expect(journalSearchQuery("lumbar stenosis")).toContain("TITLE_ABS:stenosis");
    expect(journalSearchQuery("lumbar stenosis")).not.toContain("TITLE_ABS:cervical");
    expect(journalSearchQuery("Medicare Bundled Payments (TEAM Model)")).toContain(
      "TITLE_ABS:medicare AND TITLE_ABS:bundled AND TITLE_ABS:payments AND TITLE_ABS:team",
    );
    expect(journalSearchFallback("Medicare Bundled Payments (TEAM Model)")).toContain(
      "TITLE_ABS:medicare AND TITLE_ABS:bundled AND TITLE_ABS:payments AND",
    );
    expect(journalSearchQuery("")).toContain("FIRST_PDATE");
    expect(articleSlug("Cervical Myelopathy, Explained")).toBe("cervical-myelopathy-explained");
  });

  it("keeps the papers already found so drafting does not search again", () => {
    const papers = papersForDraft([
      { pmid: "35503342", title: "Diagnosis and Management of Lumbar Spinal Stenosis", journal: "Journal", year: "2022", authors: "Lee", abstract: "A review.", doi: null },
      { pmid: "32013278", title: "Percutaneous Endoscopic Lumbar Discectomy", journal: "Journal", year: "2020", authors: "Kim", abstract: "A review.", doi: null },
      { pmid: "nope", title: "Dropped", journal: "Journal", year: "2021", authors: "", abstract: "", doi: null },
      { pmid: "32095908", title: "Prevalence of lumbar spinal stenosis", journal: "Journal", year: "2020", authors: "Jensen", abstract: "A review.", doi: null },
    ]);
    expect(papers.map((paper) => paper.pmid)).toEqual(["35503342", "32013278", "32095908"]);
  });

  it("removes the website emergency disclaimer from a note", () => {
    const body = journalBody(
      "A useful paragraph.\n\nThis website does not provide emergency care. If you have sudden weakness, call 911 or go to the nearest emergency department.\n\nAnother paragraph.",
    );
    expect(body).not.toMatch(/emergency department/i);
    expect(body).toContain("A useful paragraph.");
    expect(body).toContain("Another paragraph.");
  });

  it("splits a note into the labeled sections", () => {
    const sections = journalSections(
      "**The Alignment Clinic and this problem** Opening paragraph.\n\n**What they found** A finding from the papers.",
    );
    expect(sections.map((section) => section.title)).toEqual([
      "The Alignment Clinic and this problem",
      "What they found",
    ]);
    expect(sections[0]?.body).toBe("Opening paragraph.");
    expect(sections[1]?.id).toBe("what-they-found");
    expect(readingMinutes("word ".repeat(220))).toBe(1);
  });

  it("picks a real photograph and skips generated or illustrated files", () => {
    const photo = (title: string, extra: Partial<JournalPhoto> = {}): JournalPhoto => ({
      title,
      mime: "image/jpeg",
      width: 1400,
      height: 900,
      license: "CC BY 4.0",
      categories: "",
      credit: "Photo · Example · Wikimedia Commons",
      thumbUrl: "https://upload.wikimedia.org/example.jpg",
      pageUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}.jpg`,
      ...extra,
    });
    const chosen = chooseJournalPhoto(
      [
        photo("3D CT reconstruction of human lumbar spine"),
        photo("Blausen lumbar spine illustration", { mime: "image/png" }),
        photo("Lumbar vertebrae drawing"),
        photo("LUMBAR TREFOIL CANAL", { width: 458, categories: "Medical illustrations of skeletons and bones" }),
        photo("Lumbar Sacralization", { categories: "X-rays of orthopaedic conditions" }),
      ],
      "Understanding Lumbar Spinal Stenosis at The Alignment Clinic",
    );
    expect(chosen?.title).toBe("Lumbar Sacralization");
  });

  it("uses a clinical film, and skips backyard models, gym photos, and a film already used", () => {
    const photo = (title: string, extra: Partial<JournalPhoto> = {}): JournalPhoto => ({
      title,
      mime: "image/jpeg",
      width: 1400,
      height: 900,
      license: "CC BY 4.0",
      categories: "",
      credit: "Photo · Example · Wikimedia Commons",
      thumbUrl: "https://upload.wikimedia.org/example.jpg",
      pageUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}.jpg`,
      ...extra,
    });
    const topic = "Wearable technology in spine recovery";
    const lateral = photo("Lateral lumbar x ray", { categories: "X-rays of the spine" });
    const chosen = chooseJournalPhoto(
      [
        photo("Spine model 1", { description: "A spine model photographed on the grass" }),
        photo("Lumbar physical therapy session", { description: "Navy gym fitness center" }),
        photo("3D CT reconstruction of human lumbar spine"),
        lateral,
        photo("Sagittal lumbar MRI", { categories: "MRI of the spine" }),
      ],
      topic,
      { preferPhoto: true },
    );
    expect(chosen?.title === "Lateral lumbar x ray" || chosen?.title === "Sagittal lumbar MRI").toBe(true);
    const next = chooseJournalPhoto(
      [lateral, photo("Sagittal lumbar MRI", { categories: "MRI of the spine" })],
      topic,
      { used: [chosen?.pageUrl ?? ""] },
    );
    expect(next?.pageUrl).not.toBe(chosen?.pageUrl);
    expect(journalCoverKind("https://commons.wikimedia.org/wiki/File:Lateral_lumbar_x_ray.jpg")).toBe("scan");
    expect(journalCoverKind("https://commons.wikimedia.org/wiki/File:Cervical_spine_CT.jpg")).toBe("skip");
    expect(journalCoverKind("https://commons.wikimedia.org/wiki/File:Spine_model_1.jpg")).toBe("skip");
    expect(journalCoverKind("https://commons.wikimedia.org/wiki/File:US_Navy_lumbar_physical_therapy.jpg")).toBe("skip");
  });

  it("prefers a vertebrae photograph over another x-ray", () => {
    const photo = (title: string, extra: Partial<JournalPhoto> = {}): JournalPhoto => ({
      title,
      mime: "image/jpeg",
      width: 1400,
      height: 900,
      license: "CC BY 4.0",
      categories: "",
      credit: "Photo · Example · Wikimedia Commons",
      thumbUrl: "https://upload.wikimedia.org/example.jpg",
      pageUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}.jpg`,
      ...extra,
    });
    const chosen = chooseJournalPhoto(
      [
        photo("Lateral lumbar x ray", { categories: "X-rays of the spine" }),
        photo("Lumbar vertebrae anatomy", { categories: "Bones of the human vertebral column" }),
        photo("Spine model on the grass", { description: "outdoor lawn" }),
      ],
      "Lumbar microdiscectomy",
    );
    expect(chosen?.title).toBe("Lumbar vertebrae anatomy");
    expect(journalCoverKind("https://commons.wikimedia.org/wiki/File:Lumbar_vertebrae_anatomy.jpg")).toBe("photo");
  });

  it("rejects a draft that is too short to publish", () => {
    expect(() => parseJournalDraft(JSON.stringify({ title: "Too short", summary: "no", seoTitle: "no", seoDescription: "no", body: "no" }))).toThrow();
  });

  it("keeps a long search title inside the saved limit", () => {
    const body = `${"The Alignment Clinic specializes in this procedure and explains the papers in plain language. ".repeat(8)}This note is general information.`;
    const draft = parseJournalDraft(
      JSON.stringify({
        title: "The Alignment Clinic specializes in unilateral laminotomy for bilateral decompression",
        summary: "The Alignment Clinic specializes in unilateral laminotomy for bilateral decompression and explains what the cited papers found for patients.",
        seoTitle: "The Alignment Clinic specializes in unilateral laminotomy for bilateral decompression today",
        seoDescription: "A patient note from The Alignment Clinic on what recent papers found about recovery after this decompression procedure.",
        body,
      }),
    );
    expect(draft.seoTitle.length).toBeLessThanOrEqual(70);
    expect(draft.seoTitle.length).toBeGreaterThanOrEqual(8);
    expect(draft.body.length).toBeGreaterThanOrEqual(400);
  });

  it("reads a draft when a finding is wrapped in quotes", () => {
    const body = `${"The Alignment Clinic specializes in robotic guidance. A 2021 paper said the guides were accurate enough for the cases studied. ".repeat(6)}This note is general information.`;
    const broken = `{
      "title": "The Alignment Clinic specializes in robotic spine guidance",
      "summary": "The Alignment Clinic specializes in robotic spine guidance and explains what the cited papers found for patients.",
      "seoTitle": "Robotic spine guidance",
      "seoDescription": "A patient note from The Alignment Clinic on what recent papers found about robotic guidance.",
      "body": "${body.replaceAll('"', "")} A review called the result "accurate" in the cases studied."
    }`;
    const draft = parseJournalDraft(broken);
    expect(draft.body).toContain("accurate");
  });
});

describe("journal search on the page", () => {
  const notes = [
    { title: "Lumbar stenosis and walking", summary: "What papers say about neurogenic claudication." },
    { title: "Cervical disc replacement", summary: "A note on motion-preserving surgery in the neck." },
  ];

  it("matches a title or a summary and keeps every note when the box is empty", () => {
    expect(journalNotesMatching(notes, "")).toHaveLength(2);
    expect(journalNotesMatching(notes, "  claudication ")).toEqual([notes[0]]);
    expect(journalNotesMatching(notes, "neck")).toEqual([notes[1]]);
    expect(journalNotesMatching(notes, "hip replacement")).toEqual([]);
  });

  it("names the search phrases a note can support and the topics still missing", () => {
    const keywords = journalKeywords({
      title: "Sciatica and the lumbar nerve",
      summary: "A note on sciatica for patients of The Alignment Clinic.",
      seoTitle: "Sciatica",
    });
    expect(keywords).toContain("Sciatica");
    const gaps = uncoveredThemes([
      { title: "Sciatica", summary: "A note on sciatica.", body: "sciatica", reviewStatus: "approved" },
      { title: "Draft only", summary: "microdiscectomy is mentioned here.", body: "microdiscectomy", reviewStatus: "draft" },
    ]);
    expect(gaps.some((theme) => theme.phrase === "sciatica")).toBe(false);
    expect(gaps.some((theme) => theme.phrase === "microdiscectomy")).toBe(true);
  });

  it("keeps the ten reference notes inside the publishing rules", () => {
    const banned = ["pain-free", "top-rated", "guaranteed", "cure", "arutyunyan", "big apple"];
    expect(referenceNotes).toHaveLength(10);
    for (const note of referenceNotes) {
      const parsed = parseJournalDraft(JSON.stringify(note.copy));
      const haystack = `${parsed.title}\n${parsed.summary}\n${parsed.body}`.toLowerCase();
      for (const phrase of banned) expect(haystack).not.toContain(phrase);
      expect(note.papers.length).toBeGreaterThanOrEqual(3);
      expect(parsed.seoDescription.length).toBeGreaterThanOrEqual(40);
    }
  });
});

describe("ads config", () => {
  it("uses the campaign tag from the Google Ads setup", () => {
    expect(googleMeasurementId({} as NodeJS.ProcessEnv)).toBe("G-LN3NRNLSPN");
    expect(googleAdsCampaignId({} as NodeJS.ProcessEnv)).toBe("24340110437");
    expect(ga4PropertyId({} as NodeJS.ProcessEnv)).toBeNull();
    expect(explainAdsError("User does not have sufficient permissions for this property.", "ga4-reader@example.iam.gserviceaccount.com", "558410687")).toContain("ga4-reader@example.iam.gserviceaccount.com");
    expect(googleMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "not-a-tag" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
