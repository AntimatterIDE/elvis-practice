import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Appointment, Patient } from "@/lib/rcm/types";
import {
  accountByEmail,
  accountFor as findAccount,
  createInvite,
  createPortalDb,
  createSession,
  findInvite,
  issueLogin,
  markPortalActive,
  pushCharts,
  readSession,
  removePatients,
  revokeSession,
  saveForm,
  sessionExpiry,
  submitIntake,
  type Mutation,
} from "@/lib/portal/engine";
import { generatePassword, hashPassword, hashToken, newToken, verifyPassword } from "@/lib/portal/password";
import type { IntakeForm, PortalDb, PortalResult, PortalStore, PublicInviteResult } from "@/lib/portal/types";
import { rosterFrom, toAdminSnapshot, toPortalView } from "@/lib/portal/view";

function storePath() {
  return process.env.PORTAL_DATA_PATH || path.join(process.cwd(), "data", "portal-store.json");
}

let queue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<PortalDb> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PortalDb>;
    if (!parsed.form?.fields || !Array.isArray(parsed.patients)) return createPortalDb();
    const fresh = createPortalDb();
    return {
      ...fresh,
      ...parsed,
      form: parsed.form,
      invites: parsed.invites ?? [],
      submissions: parsed.submissions ?? [],
      patients: parsed.patients ?? [],
      accounts: parsed.accounts ?? [],
      visits: parsed.visits ?? [],
      sessions: parsed.sessions ?? [],
      nextMrn: parsed.nextMrn || fresh.nextMrn,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createPortalDb();
    throw error;
  }
}

async function writeDb(db: PortalDb) {
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(db));
  await rename(temp, file);
}

function update<T>(mutate: (db: PortalDb) => Promise<Mutation<T>> | Mutation<T>): Promise<PortalResult<T>> {
  const run = queue.then(async () => {
    const db = await readDb();
    const outcome = await mutate(db);
    if (!outcome.ok) return { ok: false as const, error: outcome.error };
    await writeDb(outcome.db);
    return { ok: true as const, value: outcome.value };
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<PortalResult<T>>;
}

const storage = "server" as const;

export const fileStore: PortalStore = {
  async snapshot() {
    return { ok: true, value: toAdminSnapshot(await readDb(), storage) };
  },
  saveForm(form: IntakeForm) {
    return update((db) => {
      const outcome = saveForm(db, form);
      if (!outcome.ok) return outcome;
      return { ok: true, db: outcome.db, value: toAdminSnapshot(outcome.db, storage) };
    });
  },
  createInvite(input) {
    return update((db) => {
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
    const db = await readDb();
    const invite = findInvite(db, token);
    if (!invite) return { status: "missing" };
    if (invite.submittedAt) return { status: "used" };
    if (Date.parse(invite.expiresAt) <= Date.now()) return { status: "expired" };
    return {
      status: "open",
      form: {
        title: db.form.title,
        introduction: db.form.introduction,
        recipientName: invite.recipientName,
        fields: db.form.fields,
      },
    };
  },
  submit(token, answers) {
    return update((db) => submitIntake(db, token, answers));
  },
  async issueLogin(input) {
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const saved = await update((db) => issueLogin(db, { ...input, passwordHash }));
    if (!saved.ok) return saved;
    return { ok: true, value: { password, email: saved.value.email } };
  },
  async accountFor(patientId) {
    return findAccount(await readDb(), patientId);
  },
  login(email, password) {
    if (password.length < 1 || password.length > 128) {
      return Promise.resolve({ ok: false as const, error: "Those credentials were not accepted." });
    }
    return update(async (db) => {
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
    return readSession(await readDb(), hashToken(token));
  },
  async revoke(token) {
    if (!token) return;
    await update((db) => ({ ok: true, db: revokeSession(db, hashToken(token)), value: null }));
  },
  async home(patientId) {
    const db = await readDb();
    const patient = db.patients.find((item) => item.id === patientId);
    if (!patient) return null;
    return toPortalView(
      patient,
      db.visits.filter((visit) => visit.patientId === patientId),
    );
  },
  async roster() {
    return { ok: true, value: rosterFrom(await readDb()) };
  },
  pushCharts(input: { patients: Patient[]; appointments: Appointment[] }) {
    return update((db) => ({
      ok: true,
      db: pushCharts(db, input.patients, input.appointments),
      value: { saved: input.patients.length },
    }));
  },
  removePatients(ids) {
    return update((db) => ({
      ok: true,
      db: removePatients(db, ids),
      value: { removed: ids.length },
    }));
  },
};
