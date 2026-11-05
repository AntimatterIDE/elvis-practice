import { describe, expect, it } from "vitest";
import { objectKey, storedFileName } from "@/lib/chart-files/names";

describe("chart file names", () => {
  it("keeps the original file name on the patient's chart", () => {
    const key = objectKey("Office records.pdf");
    expect(storedFileName(key)).toBe("Office records.pdf");
  });

  it("still recognizes files saved before names were stored", () => {
    expect(storedFileName("3f1c2a40-7b6e-4d11-9a2c-0e5b6a7c8d90")).toBe("");
  });

  it("drops folders and odd names out of the chart", () => {
    expect(storedFileName("../secret")).toBeNull();
    expect(storedFileName("notes.pdf")).toBeNull();
    expect(objectKey("../../etc/passwd")).not.toContain("/");
    expect(storedFileName(objectKey("../../etc/passwd"))).not.toBeNull();
  });
});
