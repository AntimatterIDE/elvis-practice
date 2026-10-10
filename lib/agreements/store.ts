import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const fortnight = 14 * 24 * 60 * 60 * 1000;

export type Agreement = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

export type PacketStatus = "sent" | "signed" | "void" | "expired";

export type PacketSummary = {
  id: string;
  patientId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  status: PacketStatus;
  sentAt: string;
  signedAt: string;
  signerName: string;
  expiresAt: string;
};

export type PacketDetail = PacketSummary & {
  body: string;
  signaturePng: string;
};

export type PublicPacket =
  | { status: "missing" }
  | { status: "void" | "expired"; title: string }
  | { status: "signed"; title: string; body: string; signerName: string; signedAt: string; signaturePng: string }
  | { status: "open"; token: string; title: string; body: string; recipientName: string; expiresAt: string };

type AgreementRow = { id: string; title: string; body: string; updated_at: string };

type PacketRow = {
  id: string;
  token: string;
  patient_id: string | null;
  recipient_name: string;
  recipient_email: string;
  title: string;
  body: string;
  status: string;
  expires_at: string;
  sent_at: string;
  signed_at: string | null;
  signer_name: string | null;
  signature_png: string | null;
  signer_ip: string | null;
};

function client() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function failed(error: { code?: string; message?: string } | null) {
  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return "The agreement tables are not in the database yet.";
  }
  return "The agreement could not be saved.";
}

function packetStatus(row: Pick<PacketRow, "status" | "expires_at">): PacketStatus {
  if (row.status === "sent" && Date.parse(row.expires_at) < Date.now()) return "expired";
  if (row.status === "signed" || row.status === "void" || row.status === "sent") return row.status;
  return "void";
}

function summary(row: PacketRow): PacketSummary {
  return {
    id: row.id,
    patientId: row.patient_id ?? "",
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    title: row.title,
    status: packetStatus(row),
    sentAt: row.sent_at,
    signedAt: row.signed_at ?? "",
    signerName: row.signer_name ?? "",
    expiresAt: row.expires_at,
  };
}

export async function listAgreements(): Promise<{ ok: true; agreements: Agreement[] } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: "The practice database is not connected." };
  const result = await supabase.from("practice_agreements").select("id, title, body, updated_at").order("updated_at", { ascending: false });
  if (result.error) return { ok: false, message: failed(result.error) };
  return {
    ok: true,
    agreements: ((result.data ?? []) as AgreementRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      updatedAt: row.updated_at,
    })),
  };
}

export async function saveAgreement(input: { id?: string; title: string; body: string }) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const result = await supabase.from("practice_agreements").upsert({
    id,
    title: input.title,
    body: input.body,
    updated_at: now,
  });
  if (result.error) return { ok: false as const, message: failed(result.error) };
  return { ok: true as const, id };
}

export async function deleteAgreement(id: string) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  const result = await supabase.from("practice_agreements").delete().eq("id", id);
  if (result.error) return { ok: false as const, message: failed(result.error) };
  return { ok: true as const };
}

export async function listPackets(patientId = "") {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  let query = supabase
    .from("agreement_packets")
    .select("id, token, patient_id, recipient_name, recipient_email, title, status, expires_at, sent_at, signed_at, signer_name")
    .order("sent_at", { ascending: false })
    .limit(80);
  if (patientId) query = query.eq("patient_id", patientId);
  const result = await query;
  if (result.error) return { ok: false as const, message: failed(result.error) };
  return { ok: true as const, packets: ((result.data ?? []) as PacketRow[]).map(summary) };
}

export async function readPacket(id: string): Promise<{ ok: true; packet: PacketDetail } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: "The practice database is not connected." };
  const result = await supabase
    .from("agreement_packets")
    .select("id, token, patient_id, recipient_name, recipient_email, title, body, status, expires_at, sent_at, signed_at, signer_name, signature_png, signer_ip")
    .eq("id", id)
    .maybeSingle();
  if (result.error) return { ok: false, message: failed(result.error) };
  if (!result.data) return { ok: false, message: "That signed copy was not found." };
  const row = result.data as PacketRow;
  return { ok: true, packet: { ...summary(row), body: row.body, signaturePng: row.signature_png ?? "" } };
}

export async function createPacket(input: {
  agreementId: string;
  patientId: string;
  recipientName: string;
  recipientEmail: string;
  sentBy: string;
}) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  const agreement = await supabase.from("practice_agreements").select("id, title, body").eq("id", input.agreementId).maybeSingle();
  if (agreement.error) return { ok: false as const, message: failed(agreement.error) };
  if (!agreement.data) return { ok: false as const, message: "Save the agreement before sending it." };
  const row = agreement.data as { id: string; title: string; body: string };
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const id = crypto.randomUUID();
  const inserted = await supabase.from("agreement_packets").insert({
    id,
    agreement_id: row.id,
    token,
    patient_id: input.patientId || null,
    recipient_name: input.recipientName,
    recipient_email: input.recipientEmail,
    title: row.title,
    body: row.body,
    status: "sent",
    expires_at: new Date(Date.now() + fortnight).toISOString(),
    sent_by: input.sentBy,
  });
  if (inserted.error) return { ok: false as const, message: failed(inserted.error) };
  return { ok: true as const, id, token, title: row.title, expiresAt: new Date(Date.now() + fortnight).toISOString() };
}

export async function packetForResend(id: string) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  const result = await supabase
    .from("agreement_packets")
    .select("id, token, patient_id, recipient_name, recipient_email, title, body, status, expires_at, sent_at, signed_at, signer_name, signature_png, signer_ip")
    .eq("id", id)
    .maybeSingle();
  if (result.error) return { ok: false as const, message: failed(result.error) };
  if (!result.data) return { ok: false as const, message: "That request was not found." };
  const row = result.data as PacketRow;
  if (row.status !== "sent") return { ok: false as const, message: "A signed or voided copy cannot be sent again." };
  const expiresAt = new Date(Date.now() + fortnight).toISOString();
  const updated = await supabase.from("agreement_packets").update({ expires_at: expiresAt }).eq("id", id).eq("status", "sent");
  if (updated.error) return { ok: false as const, message: failed(updated.error) };
  return { ok: true as const, token: row.token, title: row.title, email: row.recipient_email, expiresAt };
}

export async function voidPacket(id: string) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  const result = await supabase.from("agreement_packets").update({ status: "void" }).eq("id", id).eq("status", "sent");
  if (result.error) return { ok: false as const, message: failed(result.error) };
  return { ok: true as const };
}

export async function publicPacket(token: string): Promise<PublicPacket> {
  const supabase = client();
  if (!supabase || token.length < 32) return { status: "missing" };
  const result = await supabase
    .from("agreement_packets")
    .select("id, token, patient_id, recipient_name, recipient_email, title, body, status, expires_at, sent_at, signed_at, signer_name, signature_png, signer_ip")
    .eq("token", token)
    .maybeSingle();
  if (result.error || !result.data) return { status: "missing" };
  const row = result.data as PacketRow;
  if (row.status === "void") return { status: "void", title: row.title };
  if (row.status === "signed") {
    return {
      status: "signed",
      title: row.title,
      body: row.body,
      signerName: row.signer_name ?? row.recipient_name,
      signedAt: row.signed_at ?? row.sent_at,
      signaturePng: row.signature_png ?? "",
    };
  }
  if (Date.parse(row.expires_at) < Date.now()) return { status: "expired", title: row.title };
  return {
    status: "open",
    token: row.token,
    title: row.title,
    body: row.body,
    recipientName: row.recipient_name,
    expiresAt: row.expires_at,
  };
}

export async function signPacket(input: { token: string; signerName: string; signaturePng: string; signerIp: string }) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "Signing is not available right now." };
  const existing = await publicPacket(input.token);
  if (existing.status === "missing") return { ok: false as const, message: "This link is not valid." };
  if (existing.status === "expired") return { ok: false as const, message: "This link has expired. Ask the practice to send it again." };
  if (existing.status === "void") return { ok: false as const, message: "The practice withdrew this document." };
  if (existing.status === "signed") return { ok: false as const, message: "This document is already signed." };
  const result = await supabase
    .from("agreement_packets")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signer_name: input.signerName,
      signature_png: input.signaturePng,
      signer_ip: input.signerIp.slice(0, 64),
    })
    .eq("token", input.token)
    .eq("status", "sent");
  if (result.error) return { ok: false as const, message: "The signature could not be saved." };
  return { ok: true as const };
}
