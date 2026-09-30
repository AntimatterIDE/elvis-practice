import Link from "next/link";

export function MissingPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-5 py-24 md:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">404</p>
      <h1 className="mt-4 font-display text-6xl">This page is not on the site.</h1>
      <p className="mt-6 max-w-lg text-lg text-muted">
        The address may be mistyped, or the page was never published. Condition and treatment drafts
        stay off the public site until the practice approves them.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="bg-oxide px-5 py-3 text-sm text-paper">
          Back to the homepage
        </Link>
        <a href="/contact" className="border border-ink/15 px-5 py-3 text-sm">
          Contact
        </a>
      </div>
    </div>
  );
}
