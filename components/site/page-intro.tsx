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
    <header className="relative pb-10">
      {/* decorative accent bar */}
      <div className="absolute top-0 left-0 h-full w-1 rounded-full bg-oxide-deep/30 sm:w-1.5" />
      <div className="pl-6 sm:pl-8">
        <p className="kicker text-oxide-deep">{kicker}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{lede}</p>
      </div>
      <div className="mt-10 h-px bg-gradient-to-r from-oxide-deep/50 via-line to-transparent" />
    </header>
  );
}