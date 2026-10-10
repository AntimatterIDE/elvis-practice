"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { draftClinicArticle } from "@/lib/journal/draft";
import { papersByPmids, searchSpineJournals } from "@/lib/journal/search";
import {
  approveJournalArticle,
  deleteJournalArticle,
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
  doi: string | null;
};

export async function findJournalPapers(topic: string): Promise<{ papers: FoundPaper[] } | { error: string }> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  try {
    const papers = await searchSpineJournals(topic.trim().slice(0, 180));
    return {
      papers: papers.map(({ abstract: _abstract, ...paper }) => paper),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The journal search did not finish." };
  }
}

export async function composeJournalDraft(
  topic: string,
  pmids: string[],
): Promise<{ id: string; title: string } | { error: string }> {
  const session = await staff();
  if (!session) return { error: "Sign in again to draft an article." };
  if (!journalStorageReady()) return { error: "Article drafts save after Supabase is connected." };
  try {
    const papers = await papersByPmids(pmids);
    const copy = await draftClinicArticle(topic.trim().slice(0, 180), papers);
    const article = await saveJournalDraft(copy, papers);
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
