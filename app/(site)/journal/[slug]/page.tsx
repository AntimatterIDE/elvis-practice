import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticleView } from "@/components/site/journal-article";
import { ensureJournalHero } from "@/lib/journal/hero";
import { publishedJournalArticle } from "@/lib/journal/store";
import { publicPageMetadata, unlistedShareMetadata } from "@/lib/share-metadata";

type Params = { slug: string };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) return { title: "Not published", ...unlistedShareMetadata };
  const heroUrl = await ensureJournalHero(article);
  return publicPageMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    canonical: `/journal/${article.slug}`,
    ...(heroUrl ? { image: { url: heroUrl, alt: article.title } } : {}),
  });
}

export default async function JournalArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) notFound();
  const heroUrl = await ensureJournalHero(article);
  return <JournalArticleView article={article} heroUrl={heroUrl} />;
}
