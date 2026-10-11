import { metadataChecks, themesInText, journalKeywords } from "@/lib/journal/search-desk";
import { googleAdsCampaignId } from "@/lib/ads/config";
import { panelClass } from "@/components/admin/rcm/ui";
import type { JournalArticle } from "@/lib/journal/store";
import Link from "next/link";

export function JournalSearchTools({ article }: { article: JournalArticle }) {
  const keywords = journalKeywords(article);
  const checks = metadataChecks(article.seoTitle, article.seoDescription);
  const themes = themesInText(`${article.title}\n${article.summary}\n${article.body}`);
  const campaignId = googleAdsCampaignId();

  return (
    <section className={`${panelClass} mt-6`}>
      <h2 className="font-display text-2xl">Search</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        These are the phrases this note can rank for, and the practice pages it should point to. Campaign {campaignId} should send people to notes and pages that match the words they searched.
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label}>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">{check.label}</dt>
            <dd className="mt-1 text-sm text-ink">{check.ok ? "In range. " : "Needs a look. "}{check.detail}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Keywords</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <li key={keyword} className="rounded-full border border-line bg-paper px-3 py-1 text-sm">
            {keyword}
          </li>
        ))}
      </ul>
      {themes.length > 0 ? (
        <>
          <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Practice pages this note supports</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {themes.map((theme) => (
              <li key={theme.href}>
                <Link className="font-semibold text-oxide-deep underline underline-offset-4" href={theme.href}>
                  {theme.label}
                </Link>
                <span className="text-muted"> · {theme.intent}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted">This note does not yet name a condition or treatment the site already explains. Add one of those phrases so searchers land on a page that can take them further.</p>
      )}
    </section>
  );
}
