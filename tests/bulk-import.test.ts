import { describe, expect, it } from "vitest";
import { emptyOnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  bulkCardNeedsName,
  groupBulkImportFiles,
  isBulkRecordFile,
  resolveBulkCardMatch,
} from "@/lib/ocr/bulk-import";
import { withChart } from "@/lib/rcm/chart";
import type { Patient } from "@/lib/rcm/types";

const hashA = "a".repeat(64);

function existingPatient(extra: Partial<Patient> = {}): Patient {
  return {
    ...withChart({
      firstName: "Angela",
      lastName: "Morales",
      dateOfBirth: "1985-01-27",
      sex: "female",
      memberId: "74619306600",
      payerName: "Fidelis Care",
      phone: "555-555-0100",
      email: "a@example.com",
      address: "",
      city: "",
      state: "",
      postalCode: "",
    }),
    id: "p_existing",
    createdAt: "2026-01-01T00:00:00.000Z",
    mrn: "100301",
    ocrImportHashes: [hashA],
    ...extra,
  };
}

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

describe("resolveBulkCardMatch", () => {
  it("marks name+DOB hits as update with chart snapshot", () => {
    const draft = emptyOnboardDraft();
    draft.firstName = "Angela";
    draft.lastName = "Morales";
    draft.dateOfBirth = "1985-01-27";
    const resolved = resolveBulkCardMatch([existingPatient()], draft, []);
    expect(resolved.intent).toBe("update");
    expect(resolved.match?.patientId).toBe("p_existing");
    expect(resolved.match?.reason).toBe("name_dob");
    expect(resolved.match?.payerName).toBe("Fidelis Care");
    expect(resolved.match?.memberId).toBe("74619306600");
  });

  it("keeps fingerprint hits as update even when forceCreate is set", () => {
    const draft = emptyOnboardDraft();
    draft.firstName = "Other";
    draft.lastName = "Person";
    draft.dateOfBirth = "1999-01-01";
    const resolved = resolveBulkCardMatch([existingPatient()], draft, [hashA], true);
    expect(resolved.intent).toBe("update");
    expect(resolved.match?.reason).toBe("fingerprint");
  });

  it("allows forceCreate only for name+DOB matches", () => {
    const draft = emptyOnboardDraft();
    draft.firstName = "Angela";
    draft.lastName = "Morales";
    draft.dateOfBirth = "1985-01-27";
    const resolved = resolveBulkCardMatch([existingPatient()], draft, [], true);
    expect(resolved.intent).toBe("create");
    expect(resolved.match?.patientId).toBe("p_existing");
  });

  it("creates when nobody matches", () => {
    const draft = emptyOnboardDraft();
    draft.firstName = "Ada";
    draft.lastName = "Lovelace";
    draft.dateOfBirth = "1815-12-10";
    expect(resolveBulkCardMatch([existingPatient()], draft, []).intent).toBe("create");
  });
});
