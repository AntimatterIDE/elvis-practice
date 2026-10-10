import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { findJournalHero } from "@/lib/journal/hero";
import { publishedJournalArticles } from "@/lib/journal/store";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Journal",
  description: "Plain-language notes from The Alignment Clinic on orthopedic spine research. Each note is reviewed before it is published.",
  canonical: "/journal",
});

export const dynamic = "force-dynamic";

export default async function JournalIndexPage() {
  const articles = await publishedJournalArticles();
  const cards = await Promise.all(
    articles.map(async (article) => ({ article, hero: await findJournalHero(article.slug) })),
  );
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Journal"
        title="Notes from the spine literature."
        lede="Short explanations of published orthopedic spine research, written for patients of The Alignment Clinic. They are general information, not a personal plan."
      />
      <ul className="mt-10 grid gap-8">
        {articles.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line px-4 py-6 text-muted">Reviewed notes will appear here.</li>
        ) : null}
        {cards.map(({ article, hero }) => (
          <li key={article.id} className="overflow-hidden rounded-[1.75rem] border border-line bg-card card-shadow">
            <Link href={`/journal/${article.slug}`}>
              {hero ? (
                <img src={hero} alt="" width={1536} height={1024} className="aspect-[3/2] w-full object-cover" />
              ) : null}
              <span className="block p-6 md:p-8">
                <span className="font-display text-3xl leading-tight">{article.title}</span>
                <span className="mt-3 block max-w-2xl text-muted">{article.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
