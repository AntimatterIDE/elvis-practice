import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isServiceRoleConfigured, isSupabaseConfigured, readServerEnv } from "@/lib/env";
import { articleSlug } from "@/lib/journal/papers";
import type { JournalDraftCopy } from "@/lib/journal/draft-json";
import type { JournalPaper } from "@/lib/journal/papers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database";

export type JournalSource = {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  authors: string;
  doi: string | null;
};

export type JournalArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  sources: JournalSource[];
  reviewStatus: "draft" | "approved";
  publishedAt: string | null;
  createdAt: string;
};

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

function fromRow(row: ArticleRow): JournalArticle {
  const sources = Array.isArray(row.sources) ? (row.sources as JournalSource[]) : [];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    sources,
    reviewStatus: row.review_status === "approved" ? "approved" : "draft",
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function publicClient() {
  const env = readServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function journalStorageReady() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

export async function listJournalArticles(status?: "draft" | "approved") {
  if (!journalStorageReady()) return [];
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("articles").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("review_status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function publishedJournalArticles() {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("review_status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(fromRow);
}

export async function publishedJournalArticle(slug: string) {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("review_status", "approved")
    .not("published_at", "is", null)
    .maybeSingle();
  return data ? fromRow(data) : null;
}

async function uniqueSlug(title: string) {
  const supabase = createSupabaseAdminClient();
  const base = articleSlug(title);
  const { data } = await supabase.from("articles").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 20; n += 1) {
    const next = `${base}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${base}-${Date.now()}`;
}

export async function saveJournalDraft(copy: JournalDraftCopy, papers: JournalPaper[]) {
  const supabase = createSupabaseAdminClient();
  const slug = await uniqueSlug(copy.title);
  const { data, error } = await supabase
    .from("articles")
    .insert({
      slug,
      title: copy.title,
      summary: copy.summary,
      body: copy.body,
      seo_title: copy.seoTitle,
      seo_description: copy.seoDescription,
      sources: papers.map(({ abstract: _abstract, ...paper }) => paper),
      review_status: "draft",
      published_at: null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "The draft was not saved.");
  return fromRow(data);
}

export async function journalArticle(id: string) {
  if (!journalStorageReady()) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data) : null;
}

export async function approveJournalArticle(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .update({ review_status: "approved", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "The article was not published.");
  return fromRow(data);
}

export async function unpublishJournalArticle(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .update({ review_status: "draft", published_at: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "The article was not unpublished.");
  return fromRow(data);
}

export async function deleteJournalArticle(id: string) {
  const existing = await journalArticle(id);
  if (!existing) throw new Error("That article could not be found.");
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return existing;
}
