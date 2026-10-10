import { describe, expect, it } from "vitest";
import { parseJournalDraft } from "@/lib/journal/draft-json";
import { articleSlug, journalSearchQuery, papersFromEuropePmc } from "@/lib/journal/papers";
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

  it("rejects a draft that is too short to publish", () => {
    expect(() => parseJournalDraft(JSON.stringify({ title: "Too short", summary: "no", seoTitle: "no", seoDescription: "no", body: "no" }))).toThrow();
  });
});

describe("ads config", () => {
  it("uses the campaign tag from the Google Ads setup", () => {
    expect(googleMeasurementId({} as NodeJS.ProcessEnv)).toBe("G-LN3NRNLSPN");
    expect(googleAdsCampaignId({} as NodeJS.ProcessEnv)).toBe("24340110437");
    expect(ga4PropertyId({} as NodeJS.ProcessEnv)).toBeNull();
    expect(googleMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "not-a-tag" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
