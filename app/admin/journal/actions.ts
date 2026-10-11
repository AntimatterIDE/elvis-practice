"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { draftClinicArticle } from "@/lib/journal/draft";
import { createJournalHero, saveJournalCoverFile } from "@/lib/journal/hero";
import { papersForDraft } from "@/lib/journal/papers";
import { searchSpineJournals } from "@/lib/journal/search";
import {
  approveJournalArticle,
  deleteJournalArticle,
  journalArticle,
  journalStorageReady,
  saveJournalDraft,
  unpublishJournalArticle,
} from "@/lib/journal/store";
import { getStaffSession } from "@/lib/supabase/session";
import type { AdminFormState } from "@/app/admin/actions";

async function staff() {
  return getStaffSession();
}

function canPublish(role: string) {
  return role === "owner" || role === "admin";
}

export type FoundPaper = {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  authors: string;
  abstract: string;
  doi: string | null;
};

export async function findJournalPapers(topic: string): Promise<{ papers: FoundPaper[] } | { error: string }> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  try {
    const papers = await searchSpineJournals(topic.trim().slice(0, 180));
    return { papers };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The journal search did not finish." };
  }
}

export async function composeJournalDraft(
  topic: string,
  found: FoundPaper[],
): Promise<{ id: string; title: string } | { error: string }> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  if (!journalStorageReady()) return { error: "Article drafts save after Supabase is connected." };
  const papers = papersForDraft(found);
  if (papers.length < 3) return { error: "The search did not keep enough papers to draft from." };
  try {
    const copy = await draftClinicArticle(topic.trim().slice(0, 180), papers);
    const article = await saveJournalDraft(copy, papers);
    await createJournalHero(topic.trim().slice(0, 180) || copy.title, copy.title, article.slug).catch(() => null);
    revalidatePath("/admin/journal");
    return { id: article.id, title: article.title };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The draft could not be written." };
  }
}

function articleId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

export async function publishJournalDraft(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  if (!canPublish(session.role)) return { error: "An admin approves an article before it goes on the site." };
  const id = articleId(formData);
  if (!id) return { error: "That draft could not be found." };
  try {
    const article = await approveJournalArticle(id);
    revalidatePath("/admin/journal");
    revalidatePath(`/admin/journal/${article.id}`);
    revalidatePath("/journal");
    revalidatePath(`/journal/${article.slug}`);
    return { message: `Published ${article.title}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The article was not published." };
  }
}

export async function unpublishJournalDraft(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  if (!canPublish(session.role)) return { error: "An admin unpublishes an article." };
  const id = articleId(formData);
  if (!id) return { error: "That article could not be found." };
  try {
    const article = await unpublishJournalArticle(id);
    revalidatePath("/admin/journal");
    revalidatePath(`/admin/journal/${article.id}`);
    revalidatePath("/journal");
    revalidatePath(`/journal/${article.slug}`);
    return { message: `${article.title} is back in drafts.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The article was not unpublished." };
  }
}

function pictureMime(bytes: Uint8Array, reported: string) {
  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (jpeg && reported !== "image/png") return "image/jpeg" as const;
  if (png && reported !== "image/jpeg" && reported !== "image/jpg") return "image/png" as const;
  return null;
}

export async function uploadJournalCover(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const session = await staff();
  if (!session) return { error: "Sign in again to update the cover." };
  if (!canPublish(session.role)) return { error: "An admin updates the cover picture." };
  const id = articleId(formData);
  if (!id) return { error: "That note could not be found." };
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size < 1000) return { error: "Choose a JPEG or PNG to use as the cover." };
  if (file.size > 7_000_000) return { error: "Use a picture smaller than 7 MB." };
  try {
    const article = await journalArticle(id);
    if (!article) return { error: "That note could not be found." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = pictureMime(bytes, file.type);
    if (!mime) return { error: "Use a JPEG or PNG." };
    const saved = await saveJournalCoverFile(article.slug, bytes, mime);
    if (!saved) return { error: "The picture did not save. Try a smaller JPEG or PNG." };
    revalidatePath("/admin/journal");
    revalidatePath(`/admin/journal/${article.id}`);
    revalidatePath("/journal");
    revalidatePath(`/journal/${article.slug}`);
    return { message: "The cover picture is updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The picture did not save." };
  }
}

export async function removeJournalDraft(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  if (!canPublish(session.role)) return { error: "An admin deletes an article." };
  if (String(formData.get("confirm") ?? "") !== "delete") return { error: "Confirm the deletion before removing the article." };
  const id = articleId(formData);
  if (!id) return { error: "That article could not be found." };
  try {
    const article = await deleteJournalArticle(id);
    revalidatePath("/admin/journal");
    revalidatePath("/journal");
    revalidatePath(`/journal/${article.slug}`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The article was not deleted." };
  }
  redirect("/admin/journal");
}
