import Link from "next/link";

export function MissingPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-24 md:px-8">
      <p className="inline-flex w-fit rounded-full bg-mint px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-oxide-deep">
        404
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        This page is not on the site.
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
        The address may be mistyped, or the page was never published. Condition and treatment drafts
        stay off the public site until the practice approves them.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-oxide px-5 py-3 text-sm font-semibold text-paper">
          Back to the homepage
        </Link>
        <a href="/contact" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold">
          Contact
        </a>
      </div>
    </div>
  );
}
