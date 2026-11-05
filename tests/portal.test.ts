import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addPortalMessage, createInvite, createPortalDb, issueLogin, pushCharts, saveForm, submitIntake, updateOwnIntake } from "@/lib/portal/engine";
import { attachMailbox } from "@/lib/portal/mailbox";
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

  it("keeps charges on a chart until the desk sends a new list", () => {
    const chart = {
      ...withChart({
        firstName: "Ada",
        lastName: "Lovelace",
        dateOfBirth: "1990-01-01",
        sex: "female",
        phone: "404-555-0100",
        email: "ada@example.com",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        payerName: "",
        memberId: "",
      }),
      id: "p_ada",
    };
    const invoice = {
      id: "c1",
      patientId: "p_ada",
      date: "2026-10-01",
      description: "Office visit",
      charge: 200,
      paid: 0,
      owed: 40,
      status: "submitted",
    };
    const saved = pushCharts(createPortalDb(), [chart], [], new Date("2026-10-14T16:00:00.000Z"), [], [invoice]);
    expect(saved.patients[0]?.invoices?.[0]?.owed).toBe(40);
    const kept = pushCharts(saved, [{ ...chart, phone: "404-555-0199" }], []);
    expect(kept.patients[0]?.invoices?.[0]?.description).toBe("Office visit");
    const cleared = pushCharts(kept, [chart], [], new Date(), [], []);
    expect(cleared.patients[0]?.invoices).toEqual([]);
    const view = toPortalView(saved.patients[0]!, []);
    expect(view.invoices[0]?.owed).toBe(40);
    expect(JSON.stringify(view.savedAnswers)).not.toContain("Office visit");
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

  it("updates the signed-in chart without opening a second one", () => {
    const created = createInvite(createPortalDb(), { name: "Maya", email: "maya@example.com" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = submitIntake(created.db, created.value.token, answersFor(created.db));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const patient = submitted.db.patients[0];
    if (!patient) throw new Error("missing patient");
    const withAllergy = {
      ...submitted.db,
      patients: submitted.db.patients.map((item) => ({
        ...item,
        chart: {
          ...item.chart,
          allergies: [{ id: "a1", substance: "Penicillin", reaction: "Rash", severity: "mild" as const }],
        },
      })),
    };
    const answers = answersFor(withAllergy);
    const phone = withAllergy.form.fields.find((field) => field.mapsTo === "phone");
    if (phone) answers[phone.id] = "404-555-0111";
    const updated = updateOwnIntake(withAllergy, patient.id, answers);
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.db.patients).toHaveLength(1);
    expect(updated.db.patients[0]?.id).toBe(patient.id);
    expect(updated.db.patients[0]?.chart.phone).toBe("404-555-0111");
    expect(updated.db.patients[0]?.chart.allergies[0]?.substance).toBe("Penicillin");
    expect(updated.db.patients[0]?.chart.documents.find((document) => document.name === "New patient intake")?.status).toBe("received");
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
    if (!session.ok) return;
    const sent = await fileStore.sendMessage({
      patientId: submitted.value.patientId,
      from: "patient",
      author: "Maya",
      body: "Can I move Thursday?",
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const reply = await fileStore.sendMessage({
      patientId: submitted.value.patientId,
      from: "practice",
      author: "Front desk",
      body: "Thursday still works.",
    });
    expect(reply.ok).toBe(true);
    const thread = await fileStore.messagesFor(submitted.value.patientId);
    expect(thread.map((message) => message.body)).toEqual(["Can I move Thursday?", "Thursday still works."]);
    const seen = await fileStore.seeMessages(submitted.value.patientId, "patient");
    expect(seen.ok).toBe(true);
    if (!seen.ok) return;
    expect(seen.value.every((message) => message.seenByPatient)).toBe(true);
  });

  it("keeps portal messages when the desk syncs the chart", () => {
    const created = createInvite(createPortalDb(), { name: "Maya", email: "maya@example.com" });
    if (!created.ok) return;
    const submitted = submitIntake(created.db, created.value.token, answersFor(created.db));
    if (!submitted.ok) return;
    const patient = submitted.db.patients[0];
    if (!patient) throw new Error("missing patient");
    const sent = addPortalMessage(submitted.db, {
      patientId: patient.id,
      from: "patient",
      author: "Maya",
      body: "Can I move Thursday?",
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const blank = addPortalMessage(sent.db, { patientId: patient.id, from: "patient", author: "Maya", body: "   " });
    expect(blank.ok).toBe(false);
    const synced = pushCharts(sent.db, [{ ...patient.chart, phone: "404-555-0100" }], []);
    const kept = synced.patients.find((item) => item.id === patient.id);
    expect(kept?.chart.phone).toBe("404-555-0100");
    expect(kept?.messages?.[0]?.body).toBe("Can I move Thursday?");
    const packed = attachMailbox({
      ...patient,
      answers: { ...patient.answers, __messages: JSON.stringify(sent.value) },
      messages: [],
    });
    expect(packed.answers.__messages).toBeUndefined();
    expect(packed.messages?.[0]?.body).toBe("Can I move Thursday?");
    const view = toPortalView(packed, []);
    expect(JSON.stringify(view.answers)).not.toContain("Thursday");
  });
});
