import type { Metadata } from "next";
import Link from "next/link";
import { ensureJournalHero } from "@/lib/journal/hero";
import { publishedJournalArticles } from "@/lib/journal/store";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Journal",
  description: "Plain-language notes from The Alignment Clinic on orthopedic spine research. Each note is reviewed before it is published.",
  canonical: "/journal",
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function publishedLabel(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function JournalIndexPage() {
  const articles = await publishedJournalArticles();
  const cards = await Promise.all(
    articles.map(async (article) => ({ article, hero: (await ensureJournalHero(article))?.url ?? null })),
  );

  return (
    <section className="pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-20 pt-14 md:px-8 md:pt-20 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="font-display text-6xl font-medium tracking-tight md:text-7xl">Journal</h1>
        <p className="max-w-sm text-lg leading-relaxed text-muted">
          Plain-language notes on orthopedic spine research, written for patients of The Alignment Clinic.
        </p>
      </div>
      <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-5 md:px-8">
        <div className="rounded-[2rem] border border-line bg-card px-6 py-10 card-shadow md:px-10 md:py-14">
          <h2 className="font-display text-3xl md:text-4xl">Latest notes</h2>
          {cards.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-line px-4 py-6 text-muted">Reviewed notes will appear here.</p>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ article, hero }) => (
                <li key={article.id}>
                  <Link href={`/journal/${article.slug}`} className="group flex flex-col gap-3">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-pine">
                      {hero ? (
                        <img
                          src={hero}
                          alt=""
                          width={1536}
                          height={1024}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="hero-panel block h-full" />
                      )}
                      <span className="absolute right-3 top-3 rounded-full bg-card px-3 py-1 text-xs font-medium shadow-sm">Journal</span>
                    </span>
                    <span className="flex flex-col gap-1.5">
                      <span className="line-clamp-2 text-base font-medium leading-snug group-hover:text-oxide-deep">{article.title}</span>
                      <span className="text-xs text-muted">{publishedLabel(article.publishedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
