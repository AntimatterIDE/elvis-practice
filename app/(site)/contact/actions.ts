"use server";

import { headers } from "next/headers";
import { noteLooksClinical } from "@/lib/contact/guard";
import { contactInquirySchema } from "@/lib/content/schema";
import { readServerEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type ContactState = {
  status: "idle" | "error" | "not_sent";
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitInquiry(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactInquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    reason: formData.get("reason"),
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

  const env = readServerEnv();
  if (!env.CONTACT_INBOX) {
    return {
      status: "not_sent",
      message:
        "This message was not sent and was not saved. The practice has not connected an inbox. Do not include medical information in a later attempt until a phone number or approved channel is published.",
    };
  }

  return {
    status: "not_sent",
    message:
      "An inbox address is configured, but this site does not deliver mail and does not store the note. A separate, approved channel is required before messages can be sent.",
  };
}
