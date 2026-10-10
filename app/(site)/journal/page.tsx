import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
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
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Journal"
        title="Notes from the spine literature."
        lede="Short explanations of published orthopedic spine research, written for patients of The Alignment Clinic. They are general information, not a personal plan."
      />
      <ul className="mt-10 grid gap-4">
        {articles.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line px-4 py-6 text-muted">Reviewed notes will appear here.</li>
        ) : null}
        {articles.map((article) => (
          <li key={article.id} className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-2xl">
              <Link className="underline decoration-oxide/40 underline-offset-4" href={`/journal/${article.slug}`}>
                {article.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-2xl text-muted">{article.summary}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
