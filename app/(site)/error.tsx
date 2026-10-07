"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-24">
      <p className="kicker text-royal">Something went wrong</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        The page did not load.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        This is a temporary problem with the site, not a message about your health. You can try
        again, or return home.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-gold-deep px-5 text-sm font-semibold text-paper hover:bg-gold-deep"
        >
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 text-sm font-semibold">
          Homepage
        </Link>
      </div>
    </div>
  );
}
