import Link from "next/link";

export function MissingPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-24 md:px-8">
      <p className="kicker text-oxide-deep">404</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        This page is not on the site.
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
        The address may be mistyped, or the page was never published. Condition and treatment drafts
        stay off the public site until the practice approves them.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-oxide-deep px-5 text-sm font-semibold text-paper hover:bg-oxide-ink">
          Back to the homepage
        </Link>
        <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 text-sm font-semibold">
          Contact
        </Link>
      </div>
    </div>
  );
}
