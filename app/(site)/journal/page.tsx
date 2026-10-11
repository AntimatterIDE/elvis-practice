import type { Metadata } from "next";
import { JournalBrowser } from "@/components/site/journal-browser";
import { SiteVault } from "@/components/site/hexagonal-vault";
import { publishedJournalCovers } from "@/lib/journal/hero";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Journal",
  description: "Plain-language notes from The Alignment Clinic on orthopedic spine research. Each note is reviewed before it is published.",
  canonical: "/journal",
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function JournalIndexPage() {
  let cards: { id: string; slug: string; title: string; summary: string; publishedAt: string | null; hero: string | null }[] = [];
  let unavailable = false;
  try {
    const { articles, covers } = await publishedJournalCovers();
    cards = articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      publishedAt: article.publishedAt,
      hero: covers.get(article.slug)?.url ?? null,
    }));
  } catch {
    unavailable = true;
  }

  return (
    <SiteVault>
    <section className="pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-20 pt-14 md:px-8 md:pt-20 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="font-display text-6xl font-medium tracking-tight md:text-7xl">Journal</h1>
        <p className="max-w-sm text-lg leading-relaxed text-muted">
          Plain-language notes on orthopedic spine research, written for patients of The Alignment Clinic.
        </p>
      </div>
      <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-5 md:px-8">
        <div className="rounded-[2rem] border border-line bg-card px-6 py-10 card-shadow md:px-10 md:py-14">
          {unavailable ? (
            <>
              <h2 className="font-display text-3xl md:text-4xl">Latest notes</h2>
              <p className="mt-8 rounded-2xl border border-dashed border-line px-4 py-6 text-muted">The journal could not be loaded. Refresh the page.</p>
            </>
          ) : cards.length === 0 ? (
            <>
              <h2 className="font-display text-3xl md:text-4xl">Latest notes</h2>
              <p className="mt-8 rounded-2xl border border-dashed border-line px-4 py-6 text-muted">Reviewed notes will appear here.</p>
            </>
          ) : (
            <JournalBrowser notes={cards} />
          )}
        </div>
      </div>
    </section>
    </SiteVault>
  );
}
