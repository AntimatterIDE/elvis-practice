import "server-only";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import type { ContactInquiry } from "@/lib/content/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ConsultationStatus = "new" | "reached" | "closed";

export type ConsultationRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredTime: string;
  note: string;
  kind: "consultation" | "general";
  status: ConsultationStatus;
  createdAt: string;
};

export function consultationStorageReady() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

function fromRow(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferred_time: string;
  note: string;
  kind: "consultation" | "general";
  status: ConsultationStatus;
  created_at: string;
}): ConsultationRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    preferredTime: row.preferred_time,
    note: row.note,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function saveConsultationRequest(inquiry: ContactInquiry) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("consultation_requests").insert({
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    preferred_time: inquiry.preferredTime,
    note: inquiry.note,
    kind: inquiry.reason,
    status: "new",
  });
  if (error) throw new Error(error.message);
}

export async function listConsultationRequests() {
  if (!consultationStorageReady()) return [];
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("consultation_requests").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function setConsultationStatus(id: string, status: ConsultationStatus) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("consultation_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
