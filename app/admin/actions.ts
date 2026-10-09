"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canPublish } from "@/lib/content/publish";
import { clinicalDocumentSchema, type ClinicalDocument } from "@/lib/content/schema";
import {
  DEMO_ADMIN_COOKIE,
  DEMO_ADMIN_COOKIE_VALUE,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  isDemoAdminEnabled,
} from "@/lib/demo-admin";
import { sendClinicEmail } from "@/lib/bird/send";
import { isSupabaseConfigured } from "@/lib/env";
import { canonicalOrigin } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffRole } from "@/lib/supabase/session";

export type AdminFormState = { error?: string; message?: string };

const demoCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

function demoSaveBlocked(): AdminFormState | null {
  if (isSupabaseConfigured()) return null;
  return { error: "Site content saves after Supabase is connected. Practice desk changes stay in this browser." };
}

export async function signIn(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (isDemoAdminEnabled()) {
    if (email.toLowerCase() !== DEMO_ADMIN_EMAIL || password !== DEMO_ADMIN_PASSWORD) {
      return { error: "Those credentials were not accepted." };
    }
    const cookieStore = await cookies();
    cookieStore.set(DEMO_ADMIN_COOKIE, DEMO_ADMIN_COOKIE_VALUE, demoCookie);
    redirect("/admin/operations");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Those credentials were not accepted." };

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userData.user.id).maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      return { error: "This email is not a staff account." };
    }
  }

  redirect("/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_ADMIN_COOKIE, "", { ...demoCookie, maxAge: 0 });
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

export async function verifyTotp(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createSupabaseServerClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: "Could not start verification." };
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verified.error) return { error: "That code was not accepted." };
  redirect("/admin");
}

export async function requestStaffPasswordReset(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@") || email.length > 320) return { error: "Enter the email on the staff account." };
  if (!isSupabaseConfigured()) return { error: "Password reset is available once Supabase is connected." };

  const sent = await sendStaffAuthEmail({ email, kind: "recovery" });
  if (sent === "missing") {
    return {
      message: "If that email has a staff account, a reset link is on its way from hello@thealignmentclinic.com. Open it and press Continue. It expires in one hour.",
    };
  }
  if (sent === "rate") return { error: "Too many reset emails were just sent. Wait a few minutes and try again." };
  if (sent !== "sent") return { error: "The reset email could not be sent. Try again in a few minutes." };
  return {
    message: "If that email has a staff account, a reset link is on its way from hello@thealignmentclinic.com. Open it and press Continue. It expires in one hour.",
  };
}

export async function updateStaffPassword(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || password.length > 128) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  if (!isSupabaseConfigured()) return { error: "Password reset is available once Supabase is connected." };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "The new password was not saved. Request a fresh link and try again." };
  redirect("/admin");
}

export async function enrollTotp(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
  const existing = await supabase.auth.mfa.listFactors();
  for (const factor of existing.data?.all ?? []) {
    if (factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Alignment Clinic admin",
  });
  if (enrolled.error || !enrolled.data?.totp) return { error: "Could not start authenticator enrollment." };
  return {
    factorId: enrolled.data.id,
    qr: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret,
  };
}

function collectSections(formData: FormData) {
  const sections = [];
  for (let index = 0; index < 12; index += 1) {
    const id = formData.get(`sections.${index}.id`);
    if (typeof id !== "string" || !id) continue;
    sections.push({
      id,
      heading: String(formData.get(`sections.${index}.heading`) ?? ""),
      body: String(formData.get(`sections.${index}.body`) ?? ""),
    });
  }
  return sections;
}

function collectFaqs(formData: FormData) {
  const faqs = [];
  for (let index = 0; index < 8; index += 1) {
    const question = formData.get(`faqs.${index}.question`);
    const answer = formData.get(`faqs.${index}.answer`);
    if (typeof question !== "string" || !question.trim()) continue;
    faqs.push({ question, answer: String(answer ?? "") });
  }
  return faqs;
}

function assertRole(role: StaffRole, allowed: StaffRole[]) {
  return allowed.includes(role);
}

export async function saveClinical(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  const blocked = demoSaveBlocked();
  if (blocked) return blocked;

  const kind: ClinicalDocument["kind"] =
    formData.get("kind") === "treatment" ? "treatment" : "condition";
  const intent = String(formData.get("intent") ?? "save");
  const base = {
    kind,
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    sections: collectSections(formData),
    faqs: collectFaqs(formData),
    relatedSlugs: String(formData.get("relatedSlugs") ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
    offeringStatus: "unconfirmed" as const,
    reviewStatus: "draft" as const,
    publishedAt: null as string | null,
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
  };

  if (intent === "publish" || intent === "unpublish") {
    if (!assertRole(staff.role, ["admin", "owner"])) {
      return { error: "Editors cannot publish or unpublish." };
    }
  }

  let next: ClinicalDocument = base;
  if (intent === "publish") {
    next = {
      ...base,
      offeringStatus: "offered",
      reviewStatus: "approved",
      publishedAt: new Date().toISOString(),
    };
    const guard = canPublish(next);
    if (!guard.ok) return { error: guard.reasons.join(" ") };
  }

  const parsed = clinicalDocumentSchema.safeParse(next);
  if (!parsed.success) return { error: "The page is not valid yet. Check the slug and required fields." };

  const table = kind === "treatment" ? "treatments" : "conditions";
  const supabase = await createSupabaseServerClient();
  const saved = await supabase.from(table).upsert(
    {
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      sections: parsed.data.sections,
      faqs: parsed.data.faqs,
      related_slugs: parsed.data.relatedSlugs,
      offering_status: parsed.data.offeringStatus,
      review_status: parsed.data.reviewStatus,
      seo_title: parsed.data.seoTitle,
      seo_description: parsed.data.seoDescription,
      published_at: parsed.data.publishedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (saved.error) return { error: "The database rejected that change." };

  await supabase.from("audit_log").insert({
    actor_id: staff.userId,
    action: intent,
    entity_table: table,
    entity_id: parsed.data.slug,
    summary: `${intent} ${parsed.data.slug}`.slice(0, 280),
  });

  return {
    message:
      intent === "publish"
        ? "Published."
        : intent === "unpublish"
          ? "Unpublished. The public site will hide it once it is reading Supabase."
          : "Draft saved.",
  };
}

export async function saveFaq(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  const blocked = demoSaveBlocked();
  if (blocked) return blocked;

  const intent = String(formData.get("intent") ?? "save");
  if (intent === "publish" && staff.role === "editor") return { error: "Editors cannot publish." };

  const reviewStatus = intent === "publish" ? "approved" : "draft";
  const publishedAt = intent === "publish" ? new Date().toISOString() : null;
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    review_status: reviewStatus as "approved" | "draft",
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("faqs").update(payload).eq("id", id)
    : await supabase.from("faqs").insert(payload);
  if (result.error) return { error: "The database rejected that change." };

  await supabase.from("audit_log").insert({
    actor_id: staff.userId,
    action: intent,
    entity_table: "faqs",
    entity_id: id || "new",
    summary: `${intent} faq`.slice(0, 280),
  });
  return { message: intent === "publish" ? "FAQ published." : "FAQ saved." };
}

export async function saveMedia(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  if (staff.role === "editor" && formData.get("rightsStatus") === "approved") {
    return { error: "Editors cannot approve media rights." };
  }
  const blocked = demoSaveBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const saved = await supabase.from("media_assets").insert({
    storage_path: String(formData.get("storagePath") ?? ""),
    alt: String(formData.get("alt") ?? ""),
    credit: String(formData.get("credit") ?? "") || null,
    rights_status: staff.role === "editor" ? "pending" : (String(formData.get("rightsStatus") ?? "pending") as "pending"),
  });
  if (saved.error) return { error: "Could not save media metadata. Approved files still need a rights status." };
  return { message: "Media record saved. No file was uploaded to a public bucket." };
}

export async function saveSettings(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  if (staff.role !== "owner") return { error: "Only an owner can change site settings." };
  const blocked = demoSaveBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const saved = await supabase
    .from("site_settings")
    .update({
      phone: String(formData.get("phone") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      hours: String(formData.get("hours") ?? "") || null,
      booking_url: String(formData.get("bookingUrl") ?? "") || null,
      announcement: String(formData.get("announcement") ?? "") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (saved.error) return { error: "Settings were not saved." };

  await supabase.from("audit_log").insert({
    actor_id: staff.userId,
    action: "update",
    entity_table: "site_settings",
    entity_id: "1",
    summary: "Updated public contact settings.",
  });
  return { message: "Settings saved." };
}

export async function inviteEditor(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  if (!assertRole(staff.role, ["owner", "admin"])) return { error: "You cannot invite users." };
  const role = String(formData.get("role") ?? "editor");
  if (staff.role === "admin" && role !== "editor") return { error: "Admins can invite editors only." };
  if (!["owner", "admin", "editor"].includes(role)) return { error: "Unknown role." };
  const blocked = demoSaveBlocked();
  if (blocked) return blocked;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email.includes("@") || email.length > 320) return { error: "Enter an email address." };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: "Invitations need the Supabase service connection." };
  }

  const saved = await admin
    .from("invitations")
    .insert({
      email,
      display_name: displayName || null,
      role: role as StaffRole,
      invited_by: staff.userId,
    })
    .select("id")
    .single();
  if (saved.error || !saved.data) {
    if (saved.error?.code === "23505") return { error: "That email already has an open invitation." };
    return { error: "The invitation was not created." };
  }

  const invited = await sendStaffAuthEmail({ email, kind: "invite", displayName });
  if (invited !== "sent") {
    await admin.from("invitations").delete().eq("id", saved.data.id);
    return { error: invited === "exists" ? "That email already has an account." : "The invitation email was not sent. Try again." };
  }

  return { message: "Invitation sent from hello@thealignmentclinic.com." };
}

async function sendStaffAuthEmail(input: { email: string; kind: "recovery" | "invite"; displayName?: string }) {
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return "failed" as const;
  }
  const redirectTo = `${canonicalOrigin()}/auth/confirm?next=/admin/reset-password`;
  const generated = input.kind === "invite"
    ? await admin.auth.admin.generateLink({
        type: "invite",
        email: input.email,
        options: {
          redirectTo,
          data: input.displayName ? { display_name: input.displayName } : undefined,
        },
      })
    : await admin.auth.admin.generateLink({
        type: "recovery",
        email: input.email,
        options: { redirectTo },
      });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (generated.error || !tokenHash) {
    const message = generated.error?.message ?? "";
    if (/rate/i.test(message)) return "rate" as const;
    if (/already|registered|exists/i.test(message)) return "exists" as const;
    if (/not found|does not exist|doesn't exist/i.test(message)) return "missing" as const;
    return "failed" as const;
  }
  const link = new URL("/auth/confirm", canonicalOrigin());
  link.searchParams.set("token_hash", tokenHash);
  link.searchParams.set("type", input.kind);
  link.searchParams.set("next", "/admin/reset-password");
  const subject = input.kind === "invite" ? "You're invited to The Alignment Clinic" : "Reset your password";
  const intro = input.kind === "invite"
    ? "You have been invited to the practice desk. Open this link and press Continue to choose a password."
    : "Open this link and press Continue to choose a new password. The link is not used until you press Continue.";
  const sent = await sendClinicEmail({
    to: input.email,
    subject,
    text: `${intro}\n\n${link.toString()}\n\nThe Alignment Clinic`,
    html: `<p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(link.toString())}">Continue</a></p><p>The Alignment Clinic</p>`,
  });
  if (!sent.ok && input.kind === "invite" && generated.data.user?.id) {
    await admin.auth.admin.deleteUser(generated.data.user.id);
  }
  return sent.ok ? ("sent" as const) : ("failed" as const);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
