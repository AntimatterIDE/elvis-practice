import { describe, expect, it } from "vitest";
import { starterAgreements } from "@/lib/agreements/starters";
import { defaultDocuments, withDocumentSlots } from "@/lib/rcm/chart";
import type { ChartDocument } from "@/lib/rcm/types";

describe("starter agreements", () => {
  it("covers the papers a New York orthopedic office collects, without a fee", () => {
    const titles = starterAgreements.map((item) => item.title);
    expect(titles).toEqual([
      "Consent to evaluate and treat",
      "Privacy notice acknowledgment",
      "Assignment of benefits and financial responsibility",
      "Permission to email and text",
      "Permission to obtain and send records",
    ]);
    const ids = new Set(starterAgreements.map((item) => item.id));
    expect(ids.size).toBe(starterAgreements.length);
    for (const item of starterAgreements) {
      expect(item.body.length).toBeGreaterThan(20);
      expect(item.body.length).toBeLessThanOrEqual(12000);
      expect(item.body.includes("$")).toBe(false);
    }
  });
});

describe("chart file slots", () => {
  it("keeps stored files and adds the orthopedic slots", () => {
    const stored: ChartDocument[] = [
      { id: "photo-id", name: "Photo ID", status: "received", note: "front" },
      { id: "consent-to-treat", name: "Consent to treat", status: "missing", note: "" },
      { id: "privacy-acknowledgment", name: "Privacy acknowledgment", status: "signed", note: "paper" },
    ];
    const next = withDocumentSlots(stored);
    expect(next.find((item) => item.id === "photo-id")).toMatchObject({ status: "received", note: "front" });
    expect(next.some((item) => item.id === "consent-to-treat")).toBe(false);
    expect(next.find((item) => item.id === "privacy-acknowledgment")?.status).toBe("signed");
    expect(next.map((item) => item.id)).toEqual([
      ...defaultDocuments().map((item) => item.id),
      "privacy-acknowledgment",
    ]);
  });
});
