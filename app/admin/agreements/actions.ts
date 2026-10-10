"use server";

import { revalidatePath } from "next/cache";
import { sendClinicEmail } from "@/lib/bird/send";
import {
  attachPackets,
  createPacket,
  deleteAgreement,
  listAgreements,
  listPackets,
  packetForResend,
  readPacket,
  saveAgreement,
  voidPacket,
} from "@/lib/agreements/store";
import type { PacketDetail } from "@/lib/agreements/store";
import { canonicalOrigin } from "@/lib/site";
import { getStaffSession } from "@/lib/supabase/session";

function cleanText(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanBody(value: string) {
  return value.replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

function emailOf(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return "";
  return email;
}

async function gate() {
  const session = await getStaffSession();
  if (!session) return null;
  return session;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function signLink(token: string) {
  return new URL(`/sign/${token}`, canonicalOrigin()).toString();
}

async function mailPacket(input: { email: string; title: string; token: string; expiresAt: string }) {
  const link = signLink(input.token);
  const when = new Date(input.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const text = `The Alignment Clinic sent you a document to sign: ${input.title}\n\nOpen this link, read it, and sign it. The link works until ${when}.\n\n${link}\n\nDo not reply with symptoms, images, or insurance numbers.`;
  const sent = await sendClinicEmail({
    to: input.email,
    subject: `Please sign: ${input.title}`,
    text,
    html: `<p>The Alignment Clinic sent you a document to sign: ${escapeHtml(input.title)}</p><p><a href="${escapeHtml(link)}">Read and sign</a></p><p>The link works until ${escapeHtml(when)}.</p><p>Do not reply with symptoms, images, or insurance numbers.</p>`,
  });
  return { sent, link };
}

export async function savePracticeAgreement(input: { id?: string; title: string; body: string }) {
  if (!(await gate())) return { ok: false, message: "Sign in as staff before editing an agreement." };
  const title = cleanText(input.title, 140);
  const body = cleanBody(input.body);
  if (title.length < 2) return { ok: false, message: "Give the agreement a title." };
  if (body.length < 20) return { ok: false, message: "Write the agreement before saving it." };
  const saved = await saveAgreement({ id: input.id, title, body });
  if (!saved.ok) return saved;
  revalidatePath("/admin/operations/agreements");
  return { ok: true, id: saved.id, message: "Agreement saved." };
}

export async function removePracticeAgreement(id: string) {
  if (!(await gate())) return { ok: false, message: "Sign in as staff before removing an agreement." };
  const removed = await deleteAgreement(id);
  if (!removed.ok) return removed;
  revalidatePath("/admin/operations/agreements");
  return { ok: true, message: "Agreement removed. Signed copies are kept." };
}

export async function sendPracticeAgreement(input: {
  agreementId: string;
  patientId?: string;
  name: string;
  email: string;
}) {
  const session = await gate();
  if (!session) return { ok: false, message: "Sign in as staff before sending an agreement." };
  const name = cleanText(input.name, 120);
  const email = emailOf(input.email);
  if (name.length < 2) return { ok: false, message: "Enter the person's name." };
  if (!email) return { ok: false, message: "Enter an email address." };
  const created = await createPacket({
    agreementId: input.agreementId,
    patientId: input.patientId?.slice(0, 80) ?? "",
    recipientName: name,
    recipientEmail: email,
    sentBy: session.email,
  });
  if (!created.ok) return created;
  const mailed = await mailPacket({ email, title: created.title, token: created.token, expiresAt: created.expiresAt });
  revalidatePath("/admin/operations/agreements");
  if (!mailed.sent.ok) {
    return { ok: false, message: `${mailed.sent.message} The signing link is ready: ${mailed.link}` };
  }
  return { ok: true, message: `Sent from hello@thealignmentclinic.com to ${email}.` };
}

export async function resendPracticeAgreement(id: string) {
  if (!(await gate())) return { ok: false, message: "Sign in as staff before sending an agreement." };
  const packet = await packetForResend(id);
  if (!packet.ok) return packet;
  const mailed = await mailPacket({ email: packet.email, title: packet.title, token: packet.token, expiresAt: packet.expiresAt });
  revalidatePath("/admin/operations/agreements");
  if (!mailed.sent.ok) return { ok: false, message: `${mailed.sent.message} The signing link is ready: ${mailed.link}` };
  return { ok: true, message: `Sent again to ${packet.email}.` };
}

export async function voidPracticeAgreement(id: string) {
  if (!(await gate())) return { ok: false, message: "Sign in as staff before withdrawing an agreement." };
  const result = await voidPacket(id);
  if (!result.ok) return result;
  revalidatePath("/admin/operations/agreements");
  return { ok: true, message: "The unsigned link no longer works." };
}

export async function agreementsForChart(patientId: string, email = "", name = "") {
  if (!(await gate())) return { ok: false as const, message: "Sign in as staff before opening agreements." };
  const [agreements, packets] = await Promise.all([listAgreements(), listPackets(patientId, email, name)]);
  if (!agreements.ok) return agreements;
  if (!packets.ok) return packets;
  const loose = packets.packets.filter((packet) => !packet.patientId).map((packet) => packet.id);
  if (patientId && loose.length) await attachPackets(patientId, loose);
  const copies: PacketDetail[] = [];
  for (const packet of packets.packets) {
    if (packet.status !== "signed") continue;
    const detail = await readPacket(packet.id);
    if (detail.ok) copies.push({ ...detail.packet, patientId: detail.packet.patientId || patientId });
  }
  return {
    ok: true as const,
    agreements: agreements.agreements.map(({ id, title }) => ({ id, title })),
    packets: packets.packets.map((packet) => ({ ...packet, patientId: packet.patientId || patientId })),
    copies,
  };
}

export async function signedCopy(id: string) {
  if (!(await gate())) return { ok: false as const, message: "Sign in as staff before opening a signed copy." };
  return readPacket(id);
}
