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
    <header className="grid gap-6 border-b border-line pb-10 md:grid-cols-[9rem_1fr] md:gap-16">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">{kicker}</p>
      <div>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.02] text-ink md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted">{lede}</p>
      </div>
    </header>
  );
}
