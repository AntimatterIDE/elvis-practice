"use server";

import { loadComplianceDesk, loadPracticeDesk, upsertComplianceDesk, upsertPracticeDesk, type ComplianceDeskPayload } from "@/lib/rcm/desk-store";
import type { PracticeDeskSnapshot } from "@/lib/rcm/types";
import { getStaffSession } from "@/lib/supabase/session";

export async function loadPracticeDeskAction() {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required.", desk: null };
  const result = await loadPracticeDesk();
  if (!result.ok) return { ok: false as const, error: result.error, desk: null };
  return { ok: true as const, desk: result.desk };
}

export async function upsertPracticeDeskAction(input: PracticeDeskSnapshot) {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required." };
  if (!input || typeof input !== "object") return { ok: false as const, error: "Practice profile is missing." };
  const result = await upsertPracticeDesk(input);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}

export async function loadComplianceDeskAction() {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required.", payload: null };
  const result = await loadComplianceDesk();
  if (!result.ok) return { ok: false as const, error: result.error, payload: null };
  return { ok: true as const, payload: result.payload };
}

export async function upsertComplianceDeskAction(input: ComplianceDeskPayload) {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required." };
  if (!input || typeof input !== "object") return { ok: false as const, error: "Compliance notes are missing." };
  const result = await upsertComplianceDesk(input);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}
