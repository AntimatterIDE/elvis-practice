import { describe, expect, it } from "vitest";
import { allClinicalDocuments } from "@/lib/content";
import { renderMarkdown } from "@/lib/content/markdown";
import { canPublish, findBannedPhrases, isPubliclyVisible, retiredSlugs } from "@/lib/content/publish";
import type { ClinicalDocument } from "@/lib/content/schema";
import { noteLooksClinical } from "@/lib/contact/guard";
import { consultationNotice } from "@/lib/consultations/notice";

const heldSlugs = [
  "spine-tumors",
  "neck-fractures",
  "scoliosis-surgery",
  "spine-fracture-surgery",
  "spinal-tumor-surgery",
  "image-guided-spine-surgery",
];

describe("publish guards", () => {
  it("keeps every seeded clinical page unpublished", () => {
    for (const document of allClinicalDocuments()) {
      expect(retiredSlugs.has(document.slug)).toBe(false);
      expect(findBannedPhrases(document)).toEqual([]);
      expect(canPublish(document).ok).toBe(false);
      expect(isPubliclyVisible(document)).toBe(false);
    }
  });

  it("holds high-risk topics as unconfirmed drafts", () => {
    const bySlug = new Map(allClinicalDocuments().map((document) => [document.slug, document]));
    for (const slug of heldSlugs) {
      const document = bySlug.get(slug);
      expect(document?.offeringStatus).toBe("unconfirmed");
      expect(document?.reviewStatus).toBe("draft");
    }
  });

  it("refuses unconfirmed or unreviewed pages even with a timestamp", () => {
    const document = {
      ...allClinicalDocuments()[0],
      publishedAt: new Date().toISOString(),
    } satisfies ClinicalDocument;
    expect(canPublish(document).ok).toBe(false);

    const approved = canPublish({
      ...document,
      offeringStatus: "offered",
      reviewStatus: "approved",
    });
    expect(approved.ok).toBe(true);
  });

  it("refuses retired template slugs", () => {
    const document = {
      ...allClinicalDocuments()[0],
      slug: "lowe-back-pain",
      offeringStatus: "offered",
      reviewStatus: "approved",
      publishedAt: new Date().toISOString(),
    } satisfies ClinicalDocument;
    expect(canPublish(document).reasons.join(" ")).toMatch(/old template/i);
  });
});

describe("markdown", () => {
  it("escapes html instead of rendering it", () => {
    const html = renderMarkdown('<script>alert("x")</script>\n\n**Safe**');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>Safe</strong>");
  });

  it("allows only internal links", () => {
    const html = renderMarkdown("[Visit](/visit) and [Off](https://example.com)");
    expect(html).toContain('href="/visit"');
    expect(html).not.toContain('href="https://example.com"');
  });
});

describe("contact guard", () => {
  it("flags identifiers and lets a short note through", () => {
    expect(noteLooksClinical("Please call after 3.")).toBe(false);
    expect(noteLooksClinical("back pain")).toBe(false);
    expect(noteLooksClinical("Member ID 12345")).toBe(true);
  });
});

describe("consultation notice", () => {
  it("includes every field from the form", () => {
    const notice = consultationNotice({
      name: "Paul Wallace",
      email: "paul@antimatterai.com",
      phone: "470-484-1472",
      reason: "consultation",
      preferredTime: "Weekday afternoons",
      note: "back pain",
      website: "",
    });
    expect(notice.subject).toBe("Consultation request: Paul Wallace");
    expect(notice.text).toContain("Name: Paul Wallace");
    expect(notice.text).toContain("Reason: Request a consultation");
    expect(notice.text).toContain("Email: paul@antimatterai.com");
    expect(notice.text).toContain("Phone: 470-484-1472");
    expect(notice.text).toContain("Best time for a call: Weekday afternoons");
    expect(notice.text).toContain("Note: back pain");
  });
});
