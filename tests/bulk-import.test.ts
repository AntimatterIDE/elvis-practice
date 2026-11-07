import { describe, expect, it } from "vitest";
import { emptyOnboardDraft } from "@/lib/ocr/onboard-draft";
import { bulkCardNeedsName, groupBulkImportFiles, isBulkRecordFile } from "@/lib/ocr/bulk-import";

function fakeFile(name: string, relativePath: string, type = "application/pdf"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
  return file;
}

describe("isBulkRecordFile", () => {
  it("accepts pdf and common images", () => {
    expect(isBulkRecordFile({ name: "a.pdf", type: "application/pdf" })).toBe(true);
    expect(isBulkRecordFile({ name: "a.jpg", type: "image/jpeg" })).toBe(true);
    expect(isBulkRecordFile({ name: "a.png", type: "image/png" })).toBe(true);
    expect(isBulkRecordFile({ name: "a.webp", type: "image/webp" })).toBe(true);
  });

  it("rejects non-record types", () => {
    expect(isBulkRecordFile({ name: "notes.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBe(
      false,
    );
    expect(isBulkRecordFile({ name: "readme.txt", type: "text/plain" })).toBe(false);
  });

  it("falls back to extension when type is empty", () => {
    expect(isBulkRecordFile({ name: "scan.PDF", type: "" })).toBe(true);
    expect(isBulkRecordFile({ name: "scan.txt", type: "" })).toBe(false);
  });
});

describe("groupBulkImportFiles", () => {
  it("groups nested subfolders into one packet per patient folder", () => {
    const files = [
      fakeFile("note.pdf", "Imports/Ada Lovelace/note.pdf"),
      fakeFile("id.jpg", "Imports/Ada Lovelace/id.jpg", "image/jpeg"),
      fakeFile("mri.pdf", "Imports/Ada Lovelace/imaging/mri.pdf"),
      fakeFile("chart.pdf", "Imports/Bo Chen/chart.pdf"),
    ];
    const packets = groupBulkImportFiles(files);
    expect(packets).toHaveLength(2);
    expect(packets[0]?.label).toBe("Ada Lovelace");
    expect(packets[0]?.files).toHaveLength(3);
    expect(packets[1]?.label).toBe("Bo Chen");
    expect(packets[1]?.files).toHaveLength(1);
  });

  it("treats root-level files as one packet each", () => {
    const files = [
      fakeFile("jane.pdf", "Imports/jane.pdf"),
      fakeFile("john.pdf", "Imports/john.pdf"),
      fakeFile("skip.docx", "Imports/skip.docx", "application/msword"),
    ];
    const packets = groupBulkImportFiles(files);
    expect(packets).toHaveLength(2);
    expect(packets.map((p) => p.label).sort()).toEqual(["jane", "john"]);
    expect(packets.every((p) => p.files.length === 1)).toBe(true);
  });

  it("skips non-record files entirely", () => {
    const files = [
      fakeFile("readme.txt", "Imports/Ada/readme.txt", "text/plain"),
      fakeFile("note.pdf", "Imports/Ada/note.pdf"),
    ];
    const packets = groupBulkImportFiles(files);
    expect(packets).toHaveLength(1);
    expect(packets[0]?.files.map((f) => f.name)).toEqual(["note.pdf"]);
  });

  it("returns empty when nothing is a record", () => {
    expect(groupBulkImportFiles([fakeFile("a.txt", "Imports/a.txt", "text/plain")])).toEqual([]);
  });
});

describe("bulkCardNeedsName", () => {
  it("requires first and last name", () => {
    const draft = emptyOnboardDraft();
    expect(bulkCardNeedsName(draft)).toBe(true);
    draft.firstName = "Ada";
    expect(bulkCardNeedsName(draft)).toBe(true);
    draft.lastName = "Lovelace";
    expect(bulkCardNeedsName(draft)).toBe(false);
    expect(bulkCardNeedsName(null)).toBe(true);
  });
});
