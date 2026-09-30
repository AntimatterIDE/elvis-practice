"use server";

import { redirect } from "next/navigation";
import { canPublish } from "@/lib/content/publish";
import { clinicalDocumentSchema, type ClinicalDocument } from "@/lib/content/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession, type StaffRole } from "@/lib/supabase/session";

export type AdminFormState = { error?: string; message?: string };

function productionMfaBlocked(aal: "aal1" | "aal2") {
  return process.env.VERCEL_ENV === "production" && aal !== "aal2";
}

export async function signIn(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Those credentials were not accepted." };

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    redirect("/admin/mfa");
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
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

export async function enrollTotp(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Sign in required." };
  const supabase = await createSupabaseServerClient();
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
  if (productionMfaBlocked(staff.aal)) return { error: "Multi-factor authentication is required before production changes." };

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
  if (productionMfaBlocked(staff.aal)) return { error: "Multi-factor authentication is required before production changes." };

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
  if (productionMfaBlocked(staff.aal)) return { error: "Multi-factor authentication is required before production changes." };
  if (staff.role === "editor" && formData.get("rightsStatus") === "approved") {
    return { error: "Editors cannot approve media rights." };
  }

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
  if (productionMfaBlocked(staff.aal)) return { error: "Multi-factor authentication is required before production changes." };

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

  const supabase = await createSupabaseServerClient();
  const saved = await supabase.from("invitations").insert({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    display_name: String(formData.get("displayName") ?? "") || null,
    role: role as StaffRole,
    invited_by: staff.userId,
  });
  if (saved.error) return { error: "The invitation was not created." };
  return { message: "Invitation recorded. Create the auth user only after this row exists, and keep public sign-up disabled." };
}
