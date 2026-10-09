"use server";

import { placeClinicCall, sendClinicEmail, sendClinicSms } from "@/lib/bird/send";
import { getStaffSession } from "@/lib/supabase/session";

const limit = 320;

function staffMessage(text: string) {
  const note = text.replace(/\s+/g, " ").trim();
  if (note.length < 2) return "Write a short message first.";
  if (note.length > limit) return `Keep the message under ${limit} characters.`;
  return null;
}

async function gate(text: string) {
  const session = await getStaffSession();
  if (!session) return "Sign in as staff before contacting a patient.";
  return staffMessage(text);
}

export async function emailPatient(input: { email: string; text: string }) {
  const blocked = await gate(input.text);
  if (blocked) return { ok: false, message: blocked };
  if (!input.email.includes("@")) return { ok: false, message: "This chart has no email address." };
  return sendClinicEmail({
    to: input.email,
    subject: "A message from The Alignment Clinic",
    text: input.text,
    html: `<p>${escapeHtml(input.text)}</p><p>The Alignment Clinic</p>`,
  });
}

export async function textPatient(input: { phone: string; text: string }) {
  const blocked = await gate(input.text);
  if (blocked) return { ok: false, message: blocked };
  return sendClinicSms({ to: input.phone, text: `The Alignment Clinic: ${input.text}` });
}

export async function callPatient(input: { phone: string; text: string }) {
  const blocked = await gate(input.text);
  if (blocked) return { ok: false, message: blocked };
  return placeClinicCall({ to: input.phone, spoken: `This is The Alignment Clinic. ${input.text}` });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
