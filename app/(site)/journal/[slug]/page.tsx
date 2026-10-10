import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticleView, journalCoverPath } from "@/components/site/journal-article";
import { publishedJournalArticle } from "@/lib/journal/store";
import { publicPageMetadata, unlistedShareMetadata } from "@/lib/share-metadata";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) return { title: "Not published", ...unlistedShareMetadata };
  return publicPageMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    canonical: `/journal/${article.slug}`,
    image: { url: journalCoverPath(article.slug), alt: article.title },
  });
}

export default async function JournalArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) notFound();
  return <JournalArticleView article={article} />;
}
