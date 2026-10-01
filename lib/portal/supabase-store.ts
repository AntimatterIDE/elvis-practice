import "server-only";
import type { Appointment, Patient } from "@/lib/rcm/types";
import { normalizeAppointment, normalizePatient } from "@/lib/rcm/chart";
import { defaultIntakeForm } from "@/lib/portal/defaults";
import {
  accountByEmail,
  accountFor as findAccount,
  createInvite,
  createSession,
  findInvite,
  issueLogin,
  markPortalActive,
  pushCharts,
  readSession,
  revokeSession,
  saveForm,
  sessionExpiry,
  submitIntake,
  type Mutation,
} from "@/lib/portal/engine";
import { generatePassword, hashPassword, hashToken, newToken, verifyPassword } from "@/lib/portal/password";
import type {
  IntakeField,
  IntakeForm,
  IntakeInvite,
  IntakeSubmission,
  PortalAccount,
  PortalDb,
  PortalPatientRecord,
  PortalResult,
  PortalSession,
  PortalStore,
  PublicInviteResult,
} from "@/lib/portal/types";
import { rosterFrom, toAdminSnapshot, toPortalView } from "@/lib/portal/view";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database";

const storage = "database" as const;

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function failed(error: { message: string; code?: string } | null) {
  if (!error) return null;
  if (error.code === "42P01" || /does not exist/i.test(error.message)) {
    return "The patient portal tables are not in the database yet. Run the latest Supabase migration.";
  }
  if (error.code === "23505") return "That email already has a portal login.";
  return "That could not be saved.";
}

function asRecord(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const answers: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") answers[key] = entry;
  }
  return answers;
}

function asFields(value: Json): IntakeField[] {
  return Array.isArray(value) ? (value as IntakeField[]) : [];
}

function asPatient(value: Json, id: string, mrn: string): Patient | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const chart = normalizePatient({ ...(value as Patient), id, mrn });
  if (!chart.firstName || !chart.lastName) return null;
  return chart;
}

async function loadDb(): Promise<{ ok: true; db: PortalDb } | { ok: false; error: string }> {
  const supabase = createSupabaseAdminClient();
  const [forms, invites, submissions, patients, accounts, visits, sessions] = await Promise.all([
    supabase.from("intake_forms").select("*").eq("id", "active").maybeSingle(),
    supabase.from("intake_invites").select("*"),
    supabase.from("intake_submissions").select("*"),
    supabase.from("portal_patients").select("*"),
    supabase.from("portal_accounts").select("*"),
    supabase.from("portal_visits").select("*"),
    supabase.from("portal_sessions").select("*"),
  ]);
  const error =
    failed(forms.error) ||
    failed(invites.error) ||
    failed(submissions.error) ||
    failed(patients.error) ||
    failed(accounts.error) ||
    failed(visits.error) ||
    failed(sessions.error);
  if (error) return { ok: false, error };

  const formRow = forms.data;
  const form: IntakeForm = formRow
    ? {
        id: "active",
        title: formRow.title,
        introduction: formRow.introduction,
        fields: asFields(formRow.fields),
        updatedAt: formRow.updated_at,
      }
    : defaultIntakeForm(new Date().toISOString());

  const inviteRows: IntakeInvite[] = (invites.data ?? []).map((row) => ({
    id: row.id,
    token: row.token,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at,
    patientId: row.patient_id,
    createdAt: row.created_at,
  }));

  const patientRows: PortalPatientRecord[] = [];
  for (const row of patients.data ?? []) {
    const chart = asPatient(row.chart, row.id, row.mrn);
    if (!chart) continue;
    patientRows.push({
      id: row.id,
      mrn: row.mrn,
      chart,
      answers: asRecord(row.answers),
      fields: asFields(row.fields),
      updatedAt: row.updated_at,
    });
  }

  const submissionRows: IntakeSubmission[] = (submissions.data ?? []).map((row) => ({
    id: row.id,
    inviteId: row.invite_id,
    patientId: row.patient_id,
    answers: asRecord(row.answers),
    fields: asFields(row.fields),
    createdAt: row.created_at,
  }));

  const accountRows: PortalAccount[] = (accounts.data ?? []).map((row) => ({
    patientId: row.patient_id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }));

  const visitRows: Appointment[] = [];
  for (const row of visits.data ?? []) {
    if (!row.appointment || typeof row.appointment !== "object" || Array.isArray(row.appointment)) continue;
    visitRows.push(normalizeAppointment({ ...(row.appointment as Appointment), id: row.id, patientId: row.patient_id }));
  }

  const sessionRows: PortalSession[] = (sessions.data ?? []).map((row) => ({
    tokenHash: row.token_hash,
    patientId: row.patient_id,
    expiresAt: row.expires_at,
  }));

  const maxMrn = patientRows.reduce((max, patient) => Math.max(max, Number(patient.mrn) || 0), 200099);

  return {
    ok: true,
    db: {
      form,
      invites: inviteRows,
      submissions: submissionRows,
      patients: patientRows,
      accounts: accountRows,
      visits: visitRows,
      sessions: sessionRows,
      nextMrn: maxMrn + 1,
    },
  };
}

async function persistDiff(before: PortalDb, after: PortalDb) {
  const supabase = createSupabaseAdminClient();
  if (JSON.stringify(before.form) !== JSON.stringify(after.form)) {
    const saved = await supabase.from("intake_forms").upsert({
      id: "active",
      title: after.form.title,
      introduction: after.form.introduction,
      fields: asJson(after.form.fields),
      updated_at: after.form.updatedAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }

  for (const invite of after.invites) {
    const prev = before.invites.find((item) => item.id === invite.id);
    if (prev && JSON.stringify(prev) === JSON.stringify(invite)) continue;
    const saved = await supabase.from("intake_invites").upsert({
      id: invite.id,
      token: invite.token,
      recipient_email: invite.recipientEmail,
      recipient_name: invite.recipientName,
      expires_at: invite.expiresAt,
      submitted_at: invite.submittedAt,
      patient_id: invite.patientId,
      created_at: invite.createdAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }

  for (const patient of after.patients) {
    const prev = before.patients.find((item) => item.id === patient.id);
    if (prev && JSON.stringify(prev) === JSON.stringify(patient)) continue;
    const saved = await supabase.from("portal_patients").upsert({
      id: patient.id,
      mrn: patient.mrn,
      chart: asJson(patient.chart),
      answers: asJson(patient.answers),
      fields: asJson(patient.fields),
      created_at: patient.chart.createdAt || patient.updatedAt,
      updated_at: patient.updatedAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }

  for (const submission of after.submissions) {
    if (before.submissions.some((item) => item.id === submission.id)) continue;
    const saved = await supabase.from("intake_submissions").insert({
      id: submission.id,
      invite_id: submission.inviteId,
      patient_id: submission.patientId,
      answers: asJson(submission.answers),
      fields: asJson(submission.fields),
      created_at: submission.createdAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }

  for (const account of after.accounts) {
    const prev = before.accounts.find((item) => item.patientId === account.patientId);
    if (prev && prev.email === account.email && prev.passwordHash === account.passwordHash) continue;
    const saved = await supabase.from("portal_accounts").upsert({
      patient_id: account.patientId,
      email: account.email,
      password_hash: account.passwordHash,
      created_at: account.createdAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }

  const touched = new Set<string>();
  for (const visit of after.visits) {
    const prev = before.visits.find((item) => item.id === visit.id);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(visit)) touched.add(visit.patientId);
  }
  for (const visit of before.visits) {
    if (!after.visits.some((item) => item.id === visit.id)) touched.add(visit.patientId);
  }
  for (const patientId of touched) {
    const removed = await supabase.from("portal_visits").delete().eq("patient_id", patientId);
    const error = failed(removed.error);
    if (error) return error;
    const rows = after.visits.filter((visit) => visit.patientId === patientId);
    if (!rows.length) continue;
    const inserted = await supabase.from("portal_visits").insert(
      rows.map((visit) => ({
        id: visit.id,
        patient_id: visit.patientId,
        appointment: asJson(visit),
        start_at: visit.start,
      })),
    );
    const insertError = failed(inserted.error);
    if (insertError) return insertError;
  }

  for (const session of after.sessions) {
    if (before.sessions.some((item) => item.tokenHash === session.tokenHash)) continue;
    const saved = await supabase.from("portal_sessions").insert({
      token_hash: session.tokenHash,
      patient_id: session.patientId,
      expires_at: session.expiresAt,
    });
    const error = failed(saved.error);
    if (error) return error;
  }
  for (const session of before.sessions) {
    if (after.sessions.some((item) => item.tokenHash === session.tokenHash)) continue;
    const removed = await supabase.from("portal_sessions").delete().eq("token_hash", session.tokenHash);
    const error = failed(removed.error);
    if (error) return error;
  }
  return null;
}

async function mutate<T>(run: (db: PortalDb) => Promise<Mutation<T>> | Mutation<T>): Promise<PortalResult<T>> {
  const loaded = await loadDb();
  if (!loaded.ok) return loaded;
  const outcome = await run(loaded.db);
  if (!outcome.ok) return outcome;
  const error = await persistDiff(loaded.db, outcome.db);
  if (error) return { ok: false, error };
  return { ok: true, value: outcome.value };
}

export const supabaseStore: PortalStore = {
  async snapshot() {
    const loaded = await loadDb();
    if (!loaded.ok) return loaded;
    return { ok: true, value: toAdminSnapshot(loaded.db, storage) };
  },
  saveForm(form) {
    return mutate((db) => {
      const outcome = saveForm(db, form);
      if (!outcome.ok) return outcome;
      return { ok: true, db: outcome.db, value: toAdminSnapshot(outcome.db, storage) };
    });
  },
  createInvite(input) {
    return mutate((db) => {
      const outcome = createInvite(db, input);
      if (!outcome.ok) return outcome;
      return {
        ok: true,
        db: outcome.db,
        value: { snapshot: toAdminSnapshot(outcome.db, storage), path: `/intake/${outcome.value.token}` },
      };
    });
  },
  async publicInvite(token): Promise<PublicInviteResult> {
    const loaded = await loadDb();
    if (!loaded.ok) return { status: "missing" };
    const invite = findInvite(loaded.db, token);
    if (!invite) return { status: "missing" };
    if (invite.submittedAt) return { status: "used" };
    if (Date.parse(invite.expiresAt) <= Date.now()) return { status: "expired" };
    return {
      status: "open",
      form: {
        title: loaded.db.form.title,
        introduction: loaded.db.form.introduction,
        recipientName: invite.recipientName,
        fields: loaded.db.form.fields,
      },
    };
  },
  submit(token, answers) {
    return mutate((db) => submitIntake(db, token, answers));
  },
  async issueLogin(input) {
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const saved = await mutate((db) => issueLogin(db, { ...input, passwordHash }));
    if (!saved.ok) return saved;
    return { ok: true, value: { password, email: saved.value.email } };
  },
  async accountFor(patientId) {
    const loaded = await loadDb();
    if (!loaded.ok) return null;
    return findAccount(loaded.db, patientId);
  },
  login(email, password) {
    if (password.length < 1 || password.length > 128) {
      return Promise.resolve({ ok: false as const, error: "Those credentials were not accepted." });
    }
    return mutate(async (db) => {
      const account = accountByEmail(db, email);
      const valid = await verifyPassword(password, account?.passwordHash ?? null);
      if (!account || !valid) return { ok: false as const, error: "Those credentials were not accepted." };
      const token = newToken(32);
      const next = createSession(markPortalActive(db, account.patientId), {
        tokenHash: hashToken(token),
        patientId: account.patientId,
        expiresAt: sessionExpiry(),
      });
      return { ok: true, db: next, value: { token } };
    });
  },
  async patientIdForToken(token) {
    if (!token) return null;
    const loaded = await loadDb();
    if (!loaded.ok) return null;
    return readSession(loaded.db, hashToken(token));
  },
  async revoke(token) {
    if (!token) return;
    await mutate((db) => ({ ok: true, db: revokeSession(db, hashToken(token)), value: null }));
  },
  async home(patientId) {
    const loaded = await loadDb();
    if (!loaded.ok) return null;
    const patient = loaded.db.patients.find((item) => item.id === patientId);
    if (!patient) return null;
    return toPortalView(
      patient,
      loaded.db.visits.filter((visit) => visit.patientId === patientId),
    );
  },
  async roster() {
    const loaded = await loadDb();
    if (!loaded.ok) return loaded;
    return { ok: true, value: rosterFrom(loaded.db) };
  },
  pushCharts(input) {
    return mutate((db) => ({
      ok: true,
      db: pushCharts(db, input.patients, input.appointments),
      value: { saved: input.patients.length },
    }));
  },
  async removePatients(ids) {
    const unique = [...new Set(ids)].slice(0, 50);
    if (!unique.length) return { ok: true, value: { removed: 0 } };
    const supabase = createSupabaseAdminClient();
    const tables = ["portal_sessions", "portal_visits", "portal_accounts", "intake_submissions"] as const;
    for (const table of tables) {
      const removed = await supabase.from(table).delete().in("patient_id", unique);
      const error = failed(removed.error);
      if (error) return { ok: false, error };
    }
    const invites = await supabase.from("intake_invites").update({ patient_id: null }).in("patient_id", unique);
    const inviteError = failed(invites.error);
    if (inviteError) return { ok: false, error: inviteError };
    const patients = await supabase.from("portal_patients").delete().in("id", unique);
    const patientError = failed(patients.error);
    if (patientError) return { ok: false, error: patientError };
    return { ok: true, value: { removed: unique.length } };
  },
};
