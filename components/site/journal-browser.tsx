"use client";

import { journalNotesMatching } from "@/lib/journal/browse";
import Link from "next/link";
import { useMemo, useState } from "react";

type Note = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  hero: string | null;
};

function publishedLabel(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function JournalBrowser({ notes }: { notes: Note[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => journalNotesMatching(notes, query), [notes, query]);
  const searching = query.trim().length > 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-3xl md:text-4xl">Latest notes</h2>
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Search notes</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            className="min-h-12 w-full rounded-full border border-line bg-paper px-4 text-base text-ink outline-none placeholder:text-muted focus:border-oxide"
          />
        </label>
      </div>
      {searching ? (
        <p className="mt-4 text-sm text-muted">
          {visible.length === 0 ? "No notes match that search." : `${visible.length} matching ${visible.length === 1 ? "note" : "notes"}`}
        </p>
      ) : null}
      {visible.length === 0 ? null : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((article) => (
            <li key={article.id}>
              <Link href={`/journal/${article.slug}`} className="group flex flex-col gap-3">
                <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-pine">
                  {article.hero ? (
                    <img
                      src={article.hero}
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
    </>
  );
}
