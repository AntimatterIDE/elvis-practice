import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInvite, createPortalDb, issueLogin, pushCharts, saveForm, submitIntake } from "@/lib/portal/engine";
import { emptyVitals, withChart } from "@/lib/rcm/chart";
import { fileStore } from "@/lib/portal/file-store";
import { hashPassword, verifyPassword } from "@/lib/portal/password";
import type { IntakeForm } from "@/lib/portal/types";
import { toPortalView } from "@/lib/portal/view";
import type { Appointment } from "@/lib/rcm/types";

const tempDirs: string[] = [];

afterEach(async () => {
  delete process.env.PORTAL_DATA_PATH;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function answersFor(db = createPortalDb()) {
  const answers: Record<string, string> = {};
  for (const field of db.form.fields) {
    if (field.id === "firstName") answers[field.id] = "Maya";
    else if (field.id === "lastName") answers[field.id] = "Chen";
    else if (field.id === "dateOfBirth") answers[field.id] = "1990-04-02";
    else if (field.id === "email") answers[field.id] = "maya@example.com";
    else if (field.id === "phone") answers[field.id] = "404-555-0199";
    else if (field.id === "sex") answers[field.id] = "female";
    else if (field.id === "reasonForVisit") answers[field.id] = "Low back pain";
    else if (field.type === "acknowledge") answers[field.id] = "yes";
    else answers[field.id] = "";
  }
  return answers;
}

describe("practice roster", () => {
  it("adds a desk chart and its visit for every staff login", () => {
    const chart = {
      ...withChart({
        firstName: "Ada",
        lastName: "Lovelace",
        dateOfBirth: "1990-04-02",
        sex: "female",
        memberId: "",
        payerName: "Self-pay",
        phone: "404-555-0100",
        email: "",
        address: "",
        city: "",
        state: "GA",
        postalCode: "",
      }),
      id: "p_ada",
      mrn: "100301",
      createdAt: "2026-10-14T15:00:00.000Z",
    };
    const visit: Appointment = {
      id: "a_ada",
      patientId: chart.id,
      providerName: "Elvis Francois, MD",
      start: "2026-10-16T14:00:00.000Z",
      durationMinutes: 30,
      reason: "New patient",
      status: "scheduled",
      notes: "",
      visitType: "new",
      room: "Room 1",
      confirmation: "unconfirmed",
      chiefComplaint: "New patient",
      assessment: "",
      plan: "",
      vitals: emptyVitals(),
      copayCollected: null,
      scheduledProcedures: [],
      opNoteStatus: "not_required",
      unableToCode: false,
      codingFlag: "",
    };
    const saved = pushCharts(createPortalDb(), [chart], [visit], new Date("2026-10-14T16:00:00.000Z"));
    expect(saved.patients.map((patient) => patient.chart.lastName)).toEqual(["Lovelace"]);
    expect(saved.visits.map((item) => item.id)).toEqual(["a_ada"]);
    const updated = pushCharts(saved, [{ ...chart, phone: "404-555-0199" }], [visit]);
    expect(updated.patients).toHaveLength(1);
    expect(updated.patients[0]?.chart.phone).toBe("404-555-0199");
    expect(updated.visits).toHaveLength(1);
    const fromAnotherLogin = pushCharts(updated, [{ ...chart, phone: "404-555-0199" }], []);
    expect(fromAnotherLogin.visits.map((item) => item.id)).toEqual(["a_ada"]);
    const removed = pushCharts(fromAnotherLogin, [chart], [], new Date(), ["a_ada"]);
    expect(removed.visits).toHaveLength(0);
    const skipped = pushCharts(removed, [{ ...chart, id: "p_blank", lastName: "" }], []);
    expect(skipped.patients.map((patient) => patient.id)).toEqual(["p_ada"]);
  });
});

describe("patient intake", () => {
  it("keeps identity questions on the form", () => {
    const db = createPortalDb();
    const form: IntakeForm = { ...db.form, fields: db.form.fields.filter((field) => field.id !== "email") };
    const saved = saveForm(db, form);
    expect(saved.ok).toBe(false);
  });

  it("opens a chart from a submitted form and refuses a second submit", () => {
    const created = createInvite(createPortalDb(), { name: "Maya", email: "maya@example.com" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = submitIntake(created.db, created.value.token, answersFor(created.db));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const patient = submitted.db.patients[0];
    expect(patient?.chart.firstName).toBe("Maya");
    expect(patient?.chart.email).toBe("maya@example.com");
    expect(patient?.chart.medicalHistory).toBe("Low back pain");
    expect(patient?.chart.documents.find((document) => document.name === "New patient intake")?.status).toBe("received");
    expect(patient?.chart.intakeAnswers?.some((answer) => answer.value === "Low back pain")).toBe(true);
    const again = submitIntake(submitted.db, created.value.token, answersFor());
    expect(again.ok).toBe(false);
  });

  it("hides the visit note from the patient view", () => {
    const created = createInvite(createPortalDb(), {});
    if (!created.ok) return;
    const submitted = submitIntake(created.db, created.value.token, answersFor(created.db));
    if (!submitted.ok) return;
    const patient = submitted.db.patients[0];
    if (!patient) throw new Error("missing patient");
    const visit = {
      id: "a1",
      patientId: patient.id,
      providerName: "Elvis Francois, MD",
      start: "2026-10-08T09:00:00",
      durationMinutes: 30,
      reason: "New patient",
      status: "scheduled",
      notes: "",
      visitType: "new",
      room: "Room 1",
      confirmation: "unconfirmed",
      chiefComplaint: "",
      assessment: "secret clinical note",
      plan: "secret plan",
      vitals: { bloodPressure: "", heartRate: "", weightLb: "", painScore: "" },
      copayCollected: null,
      scheduledProcedures: [],
      opNoteStatus: "not_required",
      unableToCode: false,
      codingFlag: "",
    } satisfies Appointment;
    const view = toPortalView(patient, [visit]);
    expect(JSON.stringify(view)).not.toContain("secret");
    expect(view.visits[0]?.reason).toBe("New patient");
    expect(view.email).toBe("maya@example.com");
  });

  it("rejects a second login on the same email", async () => {
    const created = createInvite(createPortalDb(), {});
    if (!created.ok) return;
    const submitted = submitIntake(created.db, created.value.token, answersFor(created.db));
    if (!submitted.ok) return;
    const patient = submitted.db.patients[0];
    if (!patient) throw new Error("missing patient");
    const hash = await hashPassword("temporary-pass");
    const first = issueLogin(submitted.db, { patientId: patient.id, email: "maya@example.com", passwordHash: hash });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const other = issueLogin(first.db, {
      patientId: "pt_other",
      email: "maya@example.com",
      passwordHash: hash,
      chart: { ...patient.chart, id: "pt_other" },
    });
    expect(other.ok).toBe(false);
    expect(await verifyPassword("temporary-pass", hash)).toBe(true);
    expect(await verifyPassword("nope", hash)).toBe(false);
  });

  it("stores the submission on disk", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "portal-"));
    tempDirs.push(dir);
    process.env.PORTAL_DATA_PATH = path.join(dir, "store.json");
    const invite = await fileStore.createInvite({ name: "Maya", email: "maya@example.com" });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;
    const token = invite.value.path.split("/").pop() ?? "";
    const submitted = await fileStore.submit(token, answersFor());
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const home = await fileStore.home(submitted.value.patientId);
    expect(home?.firstName).toBe("Maya");
    const login = await fileStore.issueLogin({ patientId: submitted.value.patientId, email: "maya@example.com" });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    const session = await fileStore.login("maya@example.com", login.value.password);
    expect(session.ok).toBe(true);
  });
});
