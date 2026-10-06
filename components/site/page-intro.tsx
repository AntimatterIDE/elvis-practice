export function PageIntro({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="relative border-b border-line pb-10">
      {/* Brand accent rule beside the kicker */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-1.5 h-8 w-1.5 rounded-full bg-oxide-deep"
      />

      <div className="relative max-w-4xl pl-6 sm:pl-8">
        <p className="kicker text-oxide-deep">{kicker}</p>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{lede}</p>
      </div>

      {/* Brand gradient hairline */}
      <div
        aria-hidden="true"
        className="mt-9 h-px w-full bg-gradient-to-r from-oxide-deep/60 via-oxide/30 to-transparent"
      />
    </header>
  );
}