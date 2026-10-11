import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticleView } from "@/components/site/journal-article";
import { ensureJournalHero } from "@/lib/journal/hero";
import { publishedJournalArticle } from "@/lib/journal/store";
import { journalKeywords } from "@/lib/journal/search-desk";
import { canonicalOrigin, practice } from "@/lib/site";
import { publicPageMetadata, unlistedShareMetadata } from "@/lib/share-metadata";

type Params = { slug: string };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) return { title: "Not published", ...unlistedShareMetadata };
  const hero = await ensureJournalHero(article);
  return publicPageMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    canonical: `/journal/${article.slug}`,
    ...(hero ? { image: { url: hero.url, alt: article.title } } : {}),
  });
}

export default async function JournalArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await publishedJournalArticle(slug);
  if (!article) notFound();
  const hero = await ensureJournalHero(article);
  const origin = canonicalOrigin();
  const structured = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seoTitle,
    description: article.seoDescription,
    keywords: journalKeywords(article).join(", "),
    datePublished: article.publishedAt ?? undefined,
    author: { "@type": "Physician", name: practice.physicianName },
    publisher: { "@type": "MedicalClinic", name: practice.name, url: origin },
    mainEntityOfPage: `${origin}/journal/${article.slug}`,
    image: hero?.url,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <JournalArticleView article={article} heroUrl={hero?.url} heroCredit={hero?.credit} />
    </>
  );
}
