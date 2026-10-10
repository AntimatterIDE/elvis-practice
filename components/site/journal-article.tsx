import Link from "next/link";
import { EmergencyNote } from "@/components/site/emergency-note";
import { Markdown } from "@/components/site/markdown";
import type { JournalArticle } from "@/lib/journal/store";

export function JournalArticleView({ article }: { article: JournalArticle }) {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <header className="border-b border-line pb-10">
        <p className="kicker text-oxide-deep">Journal</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{article.summary}</p>
      </header>
      <div className="mt-10">
        <EmergencyNote />
      </div>
      <div className="mt-10 max-w-3xl">
        <Markdown source={article.body} />
      </div>
      {article.sources.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-2xl">Sources</h2>
          <ul className="mt-4 grid max-w-3xl gap-3 text-sm leading-relaxed">
            {article.sources.map((source) => (
              <li key={source.pmid}>
                <a className="underline underline-offset-4" href={`https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}>
                  {source.title}
                </a>
                <span className="mt-1 block text-muted">
                  {source.journal}
                  {source.year ? ` · ${source.year}` : ""} · PMID {source.pmid}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-12 max-w-xl border-t border-line pt-8 text-muted">
        This note is general information. It does not say whether an operation, an injection, or watchful waiting is right for you.
      </p>
      <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-oxide-deep px-5 text-sm font-semibold text-paper">
        Contact the practice
      </Link>
    </article>
  );
}
