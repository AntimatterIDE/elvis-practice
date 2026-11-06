import "server-only";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { deskFromState, normalizePractice } from "@/lib/rcm/desk-merge";
import type { EligibilityResult, PracticeDeskSnapshot, PracticeProfile, PracticeTask } from "@/lib/rcm/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database";

const DESK_ID = "default";

export function deskStoreReady() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function asPractice(value: unknown): PracticeProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return normalizePractice({
      legalName: "",
      physicianName: "",
      npi: "",
      taxId: "",
      taxonomy: "",
      phone: "",
      address: "",
      posCode: "11",
    });
  }
  return normalizePractice(value as PracticeProfile);
}

function asTasks(value: unknown): PracticeTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PracticeTask => Boolean(item && typeof item === "object" && typeof (item as PracticeTask).id === "string"));
}

function asEligibility(value: unknown): EligibilityResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is EligibilityResult => Boolean(item && typeof item === "object" && typeof (item as EligibilityResult).id === "string"),
  );
}

function rowToDesk(row: { practice: Json; tasks: Json; eligibility: Json; updated_at: string }): PracticeDeskSnapshot {
  const desk = deskFromState(asPractice(row.practice), asTasks(row.tasks), asEligibility(row.eligibility));
  return { ...desk, updatedAt: row.updated_at || desk.updatedAt };
}

export async function loadPracticeDesk(): Promise<{ ok: true; desk: PracticeDeskSnapshot | null } | { ok: false; error: string }> {
  if (!deskStoreReady()) return { ok: false, error: "Supabase is not connected." };
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("practice_desk").select("practice, tasks, eligibility, updated_at").eq("id", DESK_ID).maybeSingle();
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The practice desk table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "The practice profile could not be loaded." };
    }
    if (!data) return { ok: true, desk: null };
    return { ok: true, desk: rowToDesk(data) };
  } catch {
    return { ok: false, error: "The practice profile could not be loaded." };
  }
}

export async function upsertPracticeDesk(desk: PracticeDeskSnapshot): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!deskStoreReady()) return { ok: false, error: "Supabase is not connected." };
  const practice = normalizePractice(desk.practice);
  const updatedAt = practice.updatedAt || desk.updatedAt || new Date().toISOString();
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("practice_desk").upsert(
      {
        id: DESK_ID,
        practice: asJson(practice),
        tasks: asJson(desk.tasks ?? []),
        eligibility: asJson(desk.eligibility ?? []),
        updated_at: updatedAt,
      },
      { onConflict: "id" },
    );
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The practice desk table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "The practice profile could not be shared with the practice." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "The practice profile could not be shared with the practice." };
  }
}

export type ComplianceDeskPayload = {
  checked: string[];
  drafts: Record<string, string>;
  messages: { role: "user" | "assistant"; content: string }[];
  updatedAt: string;
};

export async function loadComplianceDesk(): Promise<
  { ok: true; payload: ComplianceDeskPayload | null } | { ok: false; error: string }
> {
  if (!deskStoreReady()) return { ok: false, error: "Supabase is not connected." };
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("compliance_desk").select("payload, updated_at").eq("id", DESK_ID).maybeSingle();
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The compliance desk table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "Compliance notes could not be loaded." };
    }
    if (!data) return { ok: true, payload: null };
    const payload = data.payload && typeof data.payload === "object" && !Array.isArray(data.payload) ? (data.payload as Record<string, unknown>) : {};
    return {
      ok: true,
      payload: {
        checked: Array.isArray(payload.checked) ? payload.checked.filter((id): id is string => typeof id === "string") : [],
        drafts:
          payload.drafts && typeof payload.drafts === "object" && !Array.isArray(payload.drafts)
            ? Object.fromEntries(Object.entries(payload.drafts).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
            : {},
        messages: Array.isArray(payload.messages)
          ? payload.messages.filter(
              (turn): turn is { role: "user" | "assistant"; content: string } =>
                (turn?.role === "user" || turn?.role === "assistant") && typeof turn.content === "string",
            )
          : [],
        updatedAt: data.updated_at,
      },
    };
  } catch {
    return { ok: false, error: "Compliance notes could not be loaded." };
  }
}

export async function upsertComplianceDesk(payload: ComplianceDeskPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!deskStoreReady()) return { ok: false, error: "Supabase is not connected." };
  const updatedAt = payload.updatedAt || new Date().toISOString();
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("compliance_desk").upsert(
      {
        id: DESK_ID,
        payload: asJson({
          checked: payload.checked,
          drafts: payload.drafts,
          messages: payload.messages,
          updatedAt,
        }),
        updated_at: updatedAt,
      },
      { onConflict: "id" },
    );
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The compliance desk table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "Compliance notes could not be shared with the practice." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Compliance notes could not be shared with the practice." };
  }
}
