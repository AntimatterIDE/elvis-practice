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
    <header className="pb-12">
      <p className="text-sm font-semibold tracking-wide text-oxide-deep">{kicker}</p>
      <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink/85">{lede}</p>
    </header>
  );
}