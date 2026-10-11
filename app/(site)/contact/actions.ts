"use server";

import { headers } from "next/headers";
import { sendClinicEmail } from "@/lib/bird/send";
import { noteLooksClinical } from "@/lib/contact/guard";
import { consultationStorageReady, saveConsultationRequest } from "@/lib/consultations/store";
import { contactInquirySchema } from "@/lib/content/schema";
import { readServerEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { practice } from "@/lib/site";

export type ContactState = {
  status: "idle" | "error" | "not_sent" | "saved";
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitInquiry(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactInquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    reason: formData.get("reason"),
    preferredTime: formData.get("preferredTime") ?? "",
    note: formData.get("note") ?? "",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Check the form and try again.",
      fieldErrors,
    };
  }

  if (parsed.data.website) {
    return {
      status: "not_sent",
      message: "This message was not sent and was not saved.",
    };
  }

  if (parsed.data.note && noteLooksClinical(parsed.data.note)) {
    return {
      status: "error",
      message:
        "Please remove symptoms, history, test results, and insurance details. This form cannot accept medical information.",
    };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`contact:${ip}`)) {
    return {
      status: "error",
      message: "Too many submissions. Please wait a few minutes and try again.",
    };
  }

  if (!consultationStorageReady()) {
    return {
      status: "not_sent",
      message: `This request was not saved. Please call the clinic at ${practice.phone}.`,
    };
  }

  try {
    await saveConsultationRequest(parsed.data);
  } catch {
    return {
      status: "not_sent",
      message: `This request was not saved. Please call the clinic at ${practice.phone}.`,
    };
  }

  const env = readServerEnv();
  if (env.CONTACT_INBOX && env.BIRD_API_KEY) {
    await sendClinicEmail({
      to: env.CONTACT_INBOX,
      subject: `Consultation request: ${parsed.data.name}`,
      text: [
        `From: ${parsed.data.name}`,
        parsed.data.email,
        parsed.data.phone,
        parsed.data.preferredTime ? `Preferred time: ${parsed.data.preferredTime}` : "",
        parsed.data.reason,
        "",
        parsed.data.note,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `<p>From ${escapeHtml(parsed.data.name)}</p><p>${escapeHtml(parsed.data.email)} ${escapeHtml(parsed.data.phone)}</p><p>${escapeHtml(parsed.data.preferredTime)}</p><p>${escapeHtml(parsed.data.note)}</p>`,
    }).catch(() => null);
  }

  return {
    status: "saved",
    message: "The office has your request and will reach out when they can. This does not schedule the visit.",
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
