"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-oxide">Something went wrong</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        The page did not load.
      </h1>
      <p className="mt-6 text-lg text-muted">
        This is a temporary problem with the site, not a message about your health. You can try
        again, or return home.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-oxide px-5 py-3 text-sm font-semibold text-paper">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold">
          Homepage
        </Link>
      </div>
    </main>
  );
}
