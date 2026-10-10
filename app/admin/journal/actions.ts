"use server";

import { revalidatePath } from "next/cache";
import { draftClinicArticle } from "@/lib/journal/draft";
import { searchSpineJournals } from "@/lib/journal/search";
import { approveJournalArticle, journalStorageReady, saveJournalDraft } from "@/lib/journal/store";
import { getStaffSession } from "@/lib/supabase/session";
import type { AdminFormState } from "@/app/admin/actions";

async function staff() {
  const session = await getStaffSession();
  if (!session) return { error: "Sign in again to draft an article." } as const;
  return { session } as const;
}

export async function researchAndDraft(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const gate = await staff();
  if ("error" in gate) return gate;
  if (!journalStorageReady()) {
    return { error: "Article drafts save after Supabase is connected." };
  }
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 180);
  try {
    const papers = await searchSpineJournals(topic);
    const copy = await draftClinicArticle(topic, papers);
    const article = await saveJournalDraft(copy, papers);
    revalidatePath("/admin/journal");
    return { message: `Draft saved: ${article.title}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The draft could not be written." };
  }
}

export async function publishJournalDraft(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const gate = await staff();
  if ("error" in gate) return gate;
  if (gate.session.role === "editor") return { error: "An admin approves an article before it goes on the site." };
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "That draft could not be found." };
  try {
    const article = await approveJournalArticle(id);
    revalidatePath("/admin/journal");
    revalidatePath("/journal");
    revalidatePath(`/journal/${article.slug}`);
    return { message: `Published ${article.title}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The article was not published." };
  }
}
