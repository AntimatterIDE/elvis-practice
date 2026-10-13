"use server";

import { headers } from "next/headers";
import { sendClinicEmail } from "@/lib/bird/send";
import { noteLooksClinical } from "@/lib/contact/guard";
import { consultationInboxes, consultationNotice } from "@/lib/consultations/notice";
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
        "Thanks for writing. Leave out insurance numbers, member IDs, and dates of birth. A name, a way to reach you, and a short note is enough.",
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
  if (env.BIRD_API_KEY) {
    const notice = consultationNotice(parsed.data);
    await Promise.all(
      consultationInboxes.map(async (to) => {
        const sent = await sendClinicEmail({ to, ...notice });
        if (!sent.ok) console.error(`Consultation email was not accepted: ${sent.message}`);
      }),
    );
  }

  return {
    status: "saved",
    message: "The office has your request and will reach out when they can. This does not schedule the visit.",
  };
}

