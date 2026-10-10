import Link from "next/link";
import { Markdown } from "@/components/site/markdown";
import { practice } from "@/lib/site";
import type { JournalArticle } from "@/lib/journal/store";

function publishedLabel(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function journalCoverPath(slug: string) {
  return `/journal/${slug}/cover`;
}

export function JournalArticleView({ article }: { article: JournalArticle }) {
  return (
    <article>
      <header>
        {article.reviewStatus === "approved" ? (
          <img
            src={journalCoverPath(article.slug)}
            alt=""
            width={1200}
            height={630}
            className="aspect-[1200/630] w-full rounded-[1.75rem] object-cover shadow-[0_30px_70px_-40px_rgb(7_30_54_/_0.85)]"
          />
        ) : (
          <div className="hero-panel overflow-hidden rounded-[1.75rem] px-6 py-14 text-paper md:px-12 md:py-16">
            <p className="kicker text-foam">Journal cover</p>
            <p className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] md:text-6xl">{article.title}</p>
            <p className="mt-4 max-w-2xl text-lg text-paper/85">{practice.name}</p>
          </div>
        )}
        <div className="mx-auto mt-8 max-w-3xl">
          <p className="kicker text-oxide-deep">Journal · {publishedLabel(article.publishedAt)}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">{article.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{article.summary}</p>
          <p className="mt-4 text-sm text-muted">
            {practice.name} · {practice.physicianName}
          </p>
        </div>
      </header>
      <div className="journal-prose mx-auto mt-12 max-w-3xl">
        <Markdown source={article.body} />
      </div>
      {article.sources.length > 0 ? (
        <section className="mx-auto mt-14 max-w-3xl border-t border-line pt-8">
          <h2 className="font-display text-3xl">The papers behind this note</h2>
          <ul className="mt-5 grid gap-3">
            {article.sources.map((source) => (
              <li key={source.pmid}>
                <a
                  className="block rounded-2xl border border-line bg-card p-5 card-shadow hover:border-oxide/40"
                  href={`https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}
                >
                  <span className="font-medium leading-snug">{source.title}</span>
                  <span className="mt-2 block text-sm text-muted">
                    {source.journal}
                    {source.year ? ` · ${source.year}` : ""}
                    {source.authors ? ` · ${source.authors}` : ""} · PMID {source.pmid}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <aside className="mx-auto mt-14 max-w-3xl rounded-[1.75rem] bg-pine px-6 py-10 text-paper md:px-10">
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
    </article>
  );
}
