import { defaultDocuments, withChart, withDocumentSlots } from "@/lib/rcm/chart";
import type { Appointment, Patient, Sex } from "@/lib/rcm/types";
import { CHART_FIELDS, LOCKED_FIELD_IDS, defaultIntakeForm } from "@/lib/portal/defaults";
import { newToken } from "@/lib/portal/password";
import type {
  IntakeField,
  IntakeFieldType,
  IntakeForm,
  IntakeInvite,
  IntakeMap,
  PortalDb,
  PortalInvoice,
  PortalMessage,
  PortalPatientRecord,
} from "@/lib/portal/types";

const FIELD_TYPES = new Set<IntakeFieldType>([
  "short_text",
  "long_text",
  "email",
  "phone",
  "date",
  "select",
  "yes_no",
  "acknowledge",
]);

const LOCKED_SPEC: Record<(typeof LOCKED_FIELD_IDS)[number], { type: IntakeFieldType; mapsTo: IntakeMap }> = {
  firstName: { type: "short_text", mapsTo: "firstName" },
  lastName: { type: "short_text", mapsTo: "lastName" },
  dateOfBirth: { type: "date", mapsTo: "dateOfBirth" },
  email: { type: "email", mapsTo: "email" },
};

const MAPS = new Set<string>(CHART_FIELDS.map((field) => field.id));
const SEX_OPTIONS = ["female", "male", "other", "unknown"];
const INVITE_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_MS = INVITE_MS;

export type Mutation<T> = { ok: true; db: PortalDb; value: T } | { ok: false; error: string };

export function createPortalDb(now = new Date().toISOString()): PortalDb {
  return {
    form: defaultIntakeForm(now),
    invites: [],
    submissions: [],
    patients: [],
    accounts: [],
    visits: [],
    sessions: [],
    nextMrn: 200100,
  };
}

function fail(error: string): Mutation<never> {
  return { ok: false, error };
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function asSex(value: string): Sex {
  if (value === "female" || value === "male" || value === "other" || value === "unknown") return value;
  return "unknown";
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function dateOk(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function phoneOk(value: string) {
  return value.replace(/\D/g, "").length >= 7;
}

export function saveForm(db: PortalDb, input: IntakeForm, now = new Date()): Mutation<IntakeForm> {
  const title = input.title?.trim() ?? "";
  const introduction = input.introduction?.trim() ?? "";
  if (!title || title.length > 120) return fail("Give the form a title of 120 characters or fewer.");
  if (introduction.length > 2000) return fail("Shorten the introduction.");
  if (!Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > 40) {
    return fail("Keep between 1 and 40 questions.");
  }

  const fields: IntakeField[] = [];
  const seenIds = new Set<string>();
  const seenMaps = new Set<string>();
  for (const raw of input.fields) {
    if (!raw || typeof raw !== "object") return fail("One of the questions could not be read.");
    const id = String(raw.id ?? "").trim();
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return fail("Each question needs a short id.");
    if (seenIds.has(id)) return fail("Two questions share the same id.");
    seenIds.add(id);
    const label = String(raw.label ?? "").trim();
    if (!label || label.length > 160) return fail("Each question needs a label of 160 characters or fewer.");
    const help = String(raw.help ?? "").trim();
    if (help.length > 400) return fail(`Shorten the help text for ${label}.`);
    const locked = (LOCKED_FIELD_IDS as readonly string[]).includes(id);
    const type = locked ? LOCKED_SPEC[id as keyof typeof LOCKED_SPEC].type : raw.type;
    if (!FIELD_TYPES.has(type)) return fail(`Choose a field type for ${label}.`);
    const mapsTo = locked ? LOCKED_SPEC[id as keyof typeof LOCKED_SPEC].mapsTo : raw.mapsTo || null;
    if (mapsTo && !MAPS.has(mapsTo)) return fail(`Choose a chart field for ${label}.`);
    if (mapsTo && seenMaps.has(mapsTo)) return fail(`Only one question can fill ${mapsTo}.`);
    if (mapsTo) seenMaps.add(mapsTo);
    const options = Array.isArray(raw.options)
      ? raw.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 20)
      : [];
    if (type === "select" && mapsTo !== "sex" && options.length === 0) {
      return fail(`Add at least one choice for ${label}.`);
    }
    if (options.some((option) => option.length > 80)) return fail(`Shorten the choices for ${label}.`);
    fields.push({
      id,
      label,
      help,
      type,
      required: locked ? true : Boolean(raw.required),
      options: mapsTo === "sex" ? SEX_OPTIONS : type === "select" ? options : [],
      mapsTo,
      locked,
    });
  }

  for (const id of LOCKED_FIELD_IDS) {
    if (!seenIds.has(id)) return fail("First name, last name, date of birth, and email stay on the form.");
  }

  const form: IntakeForm = { id: "active", title, introduction, fields, updatedAt: now.toISOString() };
  return { ok: true, db: { ...db, form }, value: form };
}

export function cleanAnswers(
  fields: IntakeField[],
  raw: Record<string, string>,
): { ok: true; answers: Record<string, string> } | { ok: false; error: string } {
  const answers: Record<string, string> = {};
  for (const field of fields) {
    const value = String(raw[field.id] ?? "").trim().slice(0, 4000);
    if (field.required && !value) return { ok: false, error: `Enter ${field.label}.` };
    if (!value) {
      answers[field.id] = "";
      continue;
    }
    if (field.type === "email" && !emailOk(value)) return { ok: false, error: `Enter a valid email for ${field.label}.` };
    if (field.type === "phone" && !phoneOk(value)) return { ok: false, error: `Enter a phone number for ${field.label}.` };
    if (field.type === "date" && !dateOk(value)) return { ok: false, error: `Enter a date for ${field.label}.` };
    if (field.type === "select" && !field.options.includes(value)) {
      return { ok: false, error: `Choose an option for ${field.label}.` };
    }
    if ((field.type === "yes_no" || field.type === "acknowledge") && value !== "yes" && value !== "no") {
      return { ok: false, error: `Answer ${field.label}.` };
    }
    if (field.type === "acknowledge" && field.required && value !== "yes") {
      return { ok: false, error: `Confirm ${field.label}.` };
    }
    answers[field.id] = value;
  }
  return { ok: true, answers };
}

function mappedValue(fields: IntakeField[], answers: Record<string, string>, key: IntakeMap) {
  const match = fields.find((field) => field.mapsTo === key);
  return match ? (answers[match.id] ?? "").trim() : "";
}

export function patientFromAnswers(fields: IntakeField[], answers: Record<string, string>, id: string, mrn: string, now: string): Patient {
  const input = {
    firstName: mappedValue(fields, answers, "firstName"),
    lastName: mappedValue(fields, answers, "lastName"),
    dateOfBirth: mappedValue(fields, answers, "dateOfBirth"),
    sex: asSex(mappedValue(fields, answers, "sex")),
    memberId: mappedValue(fields, answers, "memberId"),
    payerName: mappedValue(fields, answers, "payerName"),
    phone: mappedValue(fields, answers, "phone"),
    email: mappedValue(fields, answers, "email").toLowerCase(),
    address: mappedValue(fields, answers, "address"),
    city: mappedValue(fields, answers, "city"),
    state: mappedValue(fields, answers, "state"),
    postalCode: mappedValue(fields, answers, "postalCode"),
  };
  const reason = answers.reasonForVisit?.trim() ?? "";
  const intakeAnswers = fields
    .filter((field) => !field.mapsTo && answers[field.id])
    .map((field) => ({ label: field.label, value: displayAnswer(field, answers[field.id] ?? "") }));
  return withChart(input, {
    id,
    mrn,
    createdAt: now,
    preferredName: mappedValue(fields, answers, "preferredName"),
    emergencyName: mappedValue(fields, answers, "emergencyName"),
    emergencyPhone: mappedValue(fields, answers, "emergencyPhone"),
    emergencyRelation: mappedValue(fields, answers, "emergencyRelation"),
    pharmacyName: mappedValue(fields, answers, "pharmacyName"),
    pharmacyPhone: mappedValue(fields, answers, "pharmacyPhone"),
    medicalHistory: reason,
    portalStatus: "none",
    intakeAnswers,
    documents: defaultDocuments().map((document) =>
      document.name === "New patient intake" ? { ...document, status: "received", note: "Submitted online" } : document,
    ),
  });
}

function displayAnswer(field: IntakeField, value: string) {
  if (field.mapsTo === "sex") {
    if (value === "female") return "Female";
    if (value === "male") return "Male";
    if (value === "other") return "Other";
    if (value === "unknown") return "Prefer not to say";
  }
  if (field.type === "acknowledge" || field.type === "yes_no") {
    if (value === "yes") return "Yes";
    if (value === "no") return "No";
  }
  return value;
}

export function createInvite(
  db: PortalDb,
  input: { email?: string; name?: string },
  now = new Date(),
): Mutation<IntakeInvite> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const name = String(input.name ?? "").trim();
  if (email && !emailOk(email)) return fail("Enter a valid email, or leave it blank.");
  if (name.length > 120) return fail("Shorten the recipient name.");
  const invite: IntakeInvite = {
    id: newId("inv"),
    token: newToken(),
    recipientEmail: email,
    recipientName: name,
    expiresAt: new Date(now.getTime() + INVITE_MS).toISOString(),
    submittedAt: null,
    patientId: null,
    createdAt: now.toISOString(),
  };
  return { ok: true, db: { ...db, invites: [invite, ...db.invites] }, value: invite };
}

export function findInvite(db: PortalDb, token: string) {
  return db.invites.find((invite) => invite.token === token) ?? null;
}

export function submitIntake(db: PortalDb, token: string, raw: Record<string, string>, now = new Date()): Mutation<{ patientId: string }> {
  const invite = findInvite(db, token);
  if (!invite) return fail("This link is not valid.");
  if (invite.submittedAt) return fail("This form was already submitted.");
  if (Date.parse(invite.expiresAt) <= now.getTime()) return fail("This link has expired. Ask the practice for a new one.");
  const cleaned = cleanAnswers(db.form.fields, raw);
  if (!cleaned.ok) return cleaned;
  const patientId = newId("pt");
  const mrn = String(db.nextMrn);
  const chart = patientFromAnswers(db.form.fields, cleaned.answers, patientId, mrn, now.toISOString());
  const patient: PortalPatientRecord = {
    id: patientId,
    mrn,
    chart,
    answers: cleaned.answers,
    fields: db.form.fields,
    messages: [],
    updatedAt: now.toISOString(),
  };
  return {
    ok: true,
    value: { patientId },
    db: {
      ...db,
      nextMrn: db.nextMrn + 1,
      patients: [patient, ...db.patients],
      submissions: [
        {
          id: newId("sub"),
          inviteId: invite.id,
          patientId,
          answers: cleaned.answers,
          fields: db.form.fields,
          createdAt: now.toISOString(),
        },
        ...db.submissions,
      ],
      invites: db.invites.map((item) =>
        item.id === invite.id ? { ...item, submittedAt: now.toISOString(), patientId } : item,
      ),
    },
  };
}

export function updateOwnIntake(db: PortalDb, patientId: string, raw: Record<string, string>, now = new Date()): Mutation<null> {
  const index = db.patients.findIndex((patient) => patient.id === patientId);
  const current = db.patients[index];
  if (!current) return fail("Sign in required.");
  const cleaned = cleanAnswers(db.form.fields, raw);
  if (!cleaned.ok) return cleaned;
  const built = patientFromAnswers(db.form.fields, cleaned.answers, current.id, current.mrn, current.chart.createdAt || now.toISOString());
  const intake = built.documents.find((document) => document.name === "New patient intake");
  const documents = current.chart.documents.some((document) => document.name === "New patient intake")
    ? current.chart.documents.map((document) =>
        document.name === "New patient intake" ? { ...document, status: "received" as const, note: document.note || "Submitted online" } : document,
      )
    : [...current.chart.documents, ...(intake ? [intake] : [])];
  const patients = db.patients.slice();
  patients[index] = {
    ...current,
    chart: {
      ...built,
      allergies: current.chart.allergies,
      medications: current.chart.medications,
      cases: current.chart.cases,
      accountNotes: current.chart.accountNotes,
      documents,
      portalStatus: current.chart.portalStatus === "none" ? "active" : current.chart.portalStatus,
    },
    answers: cleaned.answers,
    fields: db.form.fields,
    updatedAt: now.toISOString(),
  };
  return { ok: true, db: { ...db, patients }, value: null };
}

function assertChart(chart: Patient, patientId: string) {
  if (!chart || chart.id !== patientId) return "That chart does not match this patient.";
  if (!chart.firstName?.trim() || !chart.lastName?.trim()) return "The chart needs a first and last name.";
  if (JSON.stringify(chart).length > 200_000) return "That chart is too large to save.";
  return null;
}

export function issueLogin(
  db: PortalDb,
  input: { patientId: string; email: string; passwordHash: string; chart?: Patient },
  now = new Date(),
): Mutation<{ email: string }> {
  const patientId = input.patientId.trim();
  const email = input.email.trim().toLowerCase();
  if (!patientId) return fail("Choose a patient.");
  if (!emailOk(email)) return fail("Enter the email the patient will use to sign in.");
  if (!input.passwordHash) return fail("A password could not be created.");
  const taken = db.accounts.find((account) => account.email === email && account.patientId !== patientId);
  if (taken) return fail("That email already has a portal login.");
  const existing = db.patients.find((patient) => patient.id === patientId);
  if (!existing && !input.chart) return fail("Open the chart before creating a login.");
  if (input.chart) {
    const chartError = assertChart(input.chart, patientId);
    if (chartError) return fail(chartError);
  }
  const source = input.chart ?? existing!.chart;
  const mrn = existing?.mrn || source.mrn || String(db.nextMrn);
  const assigned = !existing?.mrn && !source.mrn;
  const status = existing?.chart.portalStatus === "active" ? "active" : "invited";
  const chart: Patient = {
    ...source,
    id: patientId,
    mrn,
    email,
    portalStatus: status,
    intakeAnswers: source.intakeAnswers ?? existing?.chart.intakeAnswers ?? [],
  };
  const record: PortalPatientRecord = {
    id: patientId,
    mrn,
    chart,
    answers: existing?.answers ?? {},
    fields: existing?.fields ?? [],
    messages: existing?.messages ?? [],
    updatedAt: now.toISOString(),
  };
  const account = {
    patientId,
    email,
    passwordHash: input.passwordHash,
    createdAt: existing ? (db.accounts.find((item) => item.patientId === patientId)?.createdAt ?? now.toISOString()) : now.toISOString(),
  };
  return {
    ok: true,
    value: { email },
    db: {
      ...db,
      nextMrn: assigned ? db.nextMrn + 1 : db.nextMrn,
      patients: [record, ...db.patients.filter((patient) => patient.id !== patientId)],
      accounts: [account, ...db.accounts.filter((item) => item.patientId !== patientId)],
    },
  };
}

export function markPortalActive(db: PortalDb, patientId: string, now = new Date()): PortalDb {
  return {
    ...db,
    patients: db.patients.map((patient) =>
      patient.id === patientId
        ? { ...patient, chart: { ...patient.chart, portalStatus: "active" }, updatedAt: now.toISOString() }
        : patient,
    ),
  };
}

export function createSession(db: PortalDb, input: { tokenHash: string; patientId: string; expiresAt: string }): PortalDb {
  return {
    ...db,
    sessions: [
      { tokenHash: input.tokenHash, patientId: input.patientId, expiresAt: input.expiresAt },
      ...db.sessions.filter((session) => session.tokenHash !== input.tokenHash),
    ],
  };
}

export function sessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_MS).toISOString();
}

export function readSession(db: PortalDb, tokenHash: string, now = new Date()) {
  const session = db.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= now.getTime()) return null;
  return session.patientId;
}

export function revokeSession(db: PortalDb, tokenHash: string): PortalDb {
  return { ...db, sessions: db.sessions.filter((session) => session.tokenHash !== tokenHash) };
}

function invoicesFor(patientId: string, invoices: PortalInvoice[] | undefined, previous: PortalInvoice[] | undefined) {
  if (!invoices) return previous ?? [];
  return invoices.filter((invoice) => invoice.patientId === patientId).slice(0, 40);
}

export function pushCharts(
  db: PortalDb,
  patients: Patient[],
  appointments: Appointment[],
  now = new Date(),
  removedAppointmentIds: string[] = [],
  invoices?: PortalInvoice[],
): PortalDb {
  const accepted = patients.filter((chart) => chart?.id && assertChart(chart, chart.id) === null).slice(0, 100);
  if (!accepted.length) return db;
  const acceptedIds = new Set(accepted.map((chart) => chart.id));
  const existingIds = new Set(db.patients.map((patient) => patient.id));
  let nextMrn = db.nextMrn;
  const created: PortalDb["patients"] = [];
  for (const chart of accepted) {
    if (existingIds.has(chart.id)) continue;
    const mrnSource = typeof chart.mrn === "string" ? chart.mrn.trim() : "";
    const mrn = mrnSource || String(nextMrn);
    if (!mrnSource) nextMrn += 1;
    created.push({
      id: chart.id,
      mrn,
      chart: { ...chart, id: chart.id, mrn, intakeAnswers: chart.intakeAnswers ?? [] },
      answers: {},
      fields: [],
      messages: [],
      invoices: invoicesFor(chart.id, invoices, []),
      updatedAt: now.toISOString(),
    });
  }
  const nextPatients = db.patients.map((patient) => {
    if (!acceptedIds.has(patient.id)) return patient;
    const chart = accepted.find((item) => item.id === patient.id);
    if (!chart) return patient;
    return {
      ...patient,
      chart: {
        ...chart,
        id: patient.id,
        mrn: patient.mrn || chart.mrn,
        intakeAnswers: chart.intakeAnswers ?? patient.chart.intakeAnswers,
      },
      invoices: invoicesFor(patient.id, invoices, patient.invoices),
      updatedAt: now.toISOString(),
    };
  });
  const drop = new Set(removedAppointmentIds.filter((id) => id.length > 0 && id.length < 80));
  const incoming = appointments
    .filter((visit) => acceptedIds.has(visit.patientId) && visit.id && !drop.has(visit.id))
    .slice(0, 500);
  const incomingIds = new Set(incoming.map((visit) => visit.id));
  const kept = db.visits.filter((visit) => {
    if (incomingIds.has(visit.id)) return false;
    if (drop.has(visit.id) && acceptedIds.has(visit.patientId)) return false;
    return true;
  });
  return { ...db, nextMrn, patients: [...created, ...nextPatients], visits: [...incoming, ...kept] };
}

export function removePatients(db: PortalDb, ids: string[]): PortalDb {
  const drop = new Set(ids);
  if (!drop.size) return db;
  return {
    ...db,
    patients: db.patients.filter((patient) => !drop.has(patient.id)),
    accounts: db.accounts.filter((account) => !drop.has(account.patientId)),
    visits: db.visits.filter((visit) => !drop.has(visit.patientId)),
    sessions: db.sessions.filter((session) => !drop.has(session.patientId)),
    submissions: db.submissions.filter((submission) => !drop.has(submission.patientId)),
    invites: db.invites.map((invite) => (invite.patientId && drop.has(invite.patientId) ? { ...invite, patientId: null } : invite)),
  };
}

export function accountFor(db: PortalDb, patientId: string) {
  const account = db.accounts.find((item) => item.patientId === patientId);
  return account ? { email: account.email } : null;
}

export function accountByEmail(db: PortalDb, email: string) {
  return db.accounts.find((account) => account.email === email.trim().toLowerCase()) ?? null;
}

export function addPortalMessage(
  db: PortalDb,
  input: { patientId: string; from: PortalMessage["from"]; author: string; body: string },
  now = new Date(),
): Mutation<PortalMessage[]> {
  const patient = db.patients.find((item) => item.id === input.patientId);
  if (!patient) return fail("That record is not on the portal.");
  const body = input.body.trim().replace(/\s+/g, " ");
  if (!body) return fail("Write a message before sending.");
  if (body.length > 2000) return fail("Keep the message under 2,000 characters.");
  const from = input.from === "practice" ? "practice" : "patient";
  const recent = (patient.messages ?? []).filter(
    (item) => item.from === from && Date.parse(item.createdAt) > now.getTime() - 60 * 60 * 1000,
  );
  if (recent.length >= 30) return fail("Too many messages. Wait a little and try again.");
  const author = input.author.trim().slice(0, 80) || (from === "patient" ? "Patient" : "The practice");
  const message: PortalMessage = {
    id: newId("msg"),
    from,
    author,
    body,
    createdAt: now.toISOString(),
    seenByPatient: from === "patient",
    seenByPractice: from === "practice",
  };
  const messages = [...(patient.messages ?? []), message].slice(-200);
  return {
    ok: true,
    value: messages,
    db: {
      ...db,
      patients: db.patients.map((item) =>
        item.id === patient.id ? { ...item, messages, updatedAt: now.toISOString() } : item,
      ),
    },
  };
}

export function seePortalMessages(db: PortalDb, patientId: string, side: "patient" | "practice"): Mutation<PortalMessage[]> {
  const patient = db.patients.find((item) => item.id === patientId);
  if (!patient) return fail("That record is not on the portal.");
  const key = side === "patient" ? "seenByPatient" : "seenByPractice";
  const messages = (patient.messages ?? []).map((item) => (item[key] ? item : { ...item, [key]: true }));
  return {
    ok: true,
    value: messages,
    db: { ...db, patients: db.patients.map((item) => (item.id === patientId ? { ...item, messages } : item)) },
  };
}

const portalFileSlots = new Set(["photo-id", "insurance-card", "portal-files"]);

export function notePortalFile(db: PortalDb, patientId: string, slotId: string, now = new Date()): Mutation<null> {
  const patient = db.patients.find((item) => item.id === patientId);
  if (!patient) return fail("That record is not on the portal.");
  if (!portalFileSlots.has(slotId)) return fail("Choose a document type.");
  const current = withDocumentSlots(patient.chart.documents);
  const documents = (current.some((document) => document.id === slotId)
    ? current
    : [...current, { id: slotId, name: "Files from the patient portal", status: "missing" as const, note: "" }]
  ).map((document) => (document.id === slotId ? { ...document, status: "received" as const } : document));
  return {
    ok: true,
    value: null,
    db: {
      ...db,
      patients: db.patients.map((item) =>
        item.id === patientId
          ? { ...item, chart: { ...item.chart, documents }, updatedAt: now.toISOString() }
          : item,
      ),
    },
  };
}
