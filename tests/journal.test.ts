import { describe, expect, it } from "vitest";
import { journalBody } from "@/lib/journal/body";
import { chooseJournalPhoto, type JournalPhoto } from "@/lib/journal/photo";
import { journalSections, readingMinutes } from "@/lib/journal/sections";
import { parseJournalDraft } from "@/lib/journal/draft-json";
import { articleSlug, journalSearchQuery, papersForDraft, papersFromEuropePmc } from "@/lib/journal/papers";
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
    expect(journalSearchQuery("lumbar stenosis")).toContain("lumbar stenosis");
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
      pageUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
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

describe("ads config", () => {
  it("uses the campaign tag from the Google Ads setup", () => {
    expect(googleMeasurementId({} as NodeJS.ProcessEnv)).toBe("G-LN3NRNLSPN");
    expect(googleAdsCampaignId({} as NodeJS.ProcessEnv)).toBe("24340110437");
    expect(ga4PropertyId({} as NodeJS.ProcessEnv)).toBeNull();
    expect(explainAdsError("User does not have sufficient permissions for this property.", "ga4-reader@example.iam.gserviceaccount.com", "558410687")).toContain("ga4-reader@example.iam.gserviceaccount.com");
    expect(googleMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "not-a-tag" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
