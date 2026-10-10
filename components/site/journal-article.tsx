import Link from "next/link";
import { Clock } from "lucide-react";
import { BrandMark } from "@/components/site/brand";
import { JournalProgress, JournalRail } from "@/components/site/journal-rail";
import { Markdown } from "@/components/site/markdown";
import { journalSections, readingMinutes } from "@/lib/journal/sections";
import { practice } from "@/lib/site";
import type { JournalArticle } from "@/lib/journal/store";

function publishedLabel(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function JournalArticleView({
  article,
  heroUrl,
  heroCredit,
}: {
  article: JournalArticle;
  heroUrl?: string | null;
  heroCredit?: string | null;
}) {
  const sections = journalSections(article.body);
  const minutes = readingMinutes(article.body);

  return (
    <article>
      <JournalProgress />
      <div className="relative h-44 overflow-hidden sm:h-52 lg:h-60">
        {heroUrl ? (
          <img src={heroUrl} alt={article.title} width={1400} height={900} className="h-full w-full object-cover object-center" />
        ) : (
          <div className="hero-panel h-full" />
        )}
        {heroCredit ? (
          <p className="absolute bottom-3 right-3 max-w-[min(24rem,70%)] truncate rounded bg-pine/75 px-2 py-1 text-xs text-paper/85">
            {heroCredit}
          </p>
        ) : null}
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="min-w-0 flex-1">
            <header>
              <p className="kicker text-oxide-deep">Journal</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
                {article.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{article.summary}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <BrandMark className="size-9" />
                  <span>
                    <span className="block text-sm font-medium">{practice.physicianName}</span>
                    <span className="block text-xs text-muted">
                      {practice.name} · {minutes} min read
                    </span>
                  </span>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-sm text-muted">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {publishedLabel(article.publishedAt)}
                </span>
              </div>
            </header>

            <div className="journal-prose mt-10">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2>{section.title}</h2>
                  {section.body ? <Markdown source={section.body} /> : null}
                </section>
              ))}
            </div>

            {article.sources.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl">The papers behind this note</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {article.sources.map((source) => (
                    <li key={source.pmid}>
                      <a
                        className="flex min-h-16 items-center gap-3 rounded-xl bg-paper px-3 py-2 hover:bg-foam/40"
                        href={`https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-oxide text-xs font-semibold text-paper">
                          {(source.journal || "P").slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">
                            {source.journal}
                            {source.year ? ` · ${source.year}` : ""}
                          </span>
                          <span className="block truncate text-xs text-muted">{source.title}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <aside className="mt-12 rounded-[1.75rem] bg-pine px-6 py-10 text-paper md:px-10">
              <p className="kicker text-foam">{practice.name}</p>
              <p className="mt-3 max-w-xl font-display text-3xl leading-tight">This note is general information. A visit is where a plan is decided.</p>
              <address className="mt-6 text-sm not-italic leading-relaxed text-paper/90">
                <span className="block">{practice.addressLine}</span>
                <a className="mt-1 inline-flex min-h-11 items-center text-foam hover:text-white" href={practice.phoneHref}>
                  {practice.phone}
                </a>
                <a className="block text-foam hover:text-white" href={`mailto:${practice.email}`}>
                  {practice.email}
                </a>
              </address>
              <Link
                href="/contact"
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foam px-5 text-sm font-semibold text-pine hover:bg-white"
              >
                Contact the practice
              </Link>
            </aside>
          </div>
          <JournalRail sections={sections.map((section) => ({ id: section.id, title: section.title }))} />
        </div>
      </div>
    </article>
  );
}
