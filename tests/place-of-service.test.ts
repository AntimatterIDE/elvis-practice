import { describe, expect, it } from "vitest";
import {
  looksLikeFacilitySurgery,
  officeSurgeryPosWarning,
} from "@/lib/rcm/place-of-service";

describe("place of service helpers", () => {
  it("flags major spine surgery codes as facility procedures", () => {
    expect(looksLikeFacilitySurgery("63047")).toBe(true);
    expect(looksLikeFacilitySurgery("22612")).toBe(true);
    expect(looksLikeFacilitySurgery("22853")).toBe(true);
    expect(looksLikeFacilitySurgery("63650")).toBe(true);
    expect(looksLikeFacilitySurgery("99213")).toBe(false);
    expect(looksLikeFacilitySurgery("64483")).toBe(false);
    expect(looksLikeFacilitySurgery("J1010")).toBe(false);
  });

  it("warns when office POS is paired with OR codes", () => {
    expect(officeSurgeryPosWarning("11", ["63047", "99214"])).toContain("63047");
    expect(officeSurgeryPosWarning("22", ["63047"])).toBe("");
    expect(officeSurgeryPosWarning("11", ["99213", "64483"])).toBe("");
  });
});
