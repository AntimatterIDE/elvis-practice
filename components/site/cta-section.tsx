import { cn } from "@/lib/utils";

export function CTASection({
  kicker,
  title,
  description,
  href,
  label,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rise-in group mx-auto max-w-4xl rounded-[1.75rem] bg-gradient-to-br from-mint/60 via-mist/40 to-card border border-oxide/10 p-8 shadow-[0_20px_50px_-24px_rgb(7_30_54_/_0.2)] md:p-12 motion-safe:transition-all motion-safe:hover:shadow-[0_24px_60px_-32px_rgb(7_30_54_/_0.35)]",
        className,
      )}
    >
      {kicker ? <p className="kicker text-oxide-deep">{kicker}</p> : null}
      <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">{description}</p>
      ) : null}
      <a
        href={href}
        className="group mt-6 inline-flex items-center gap-2 rounded-full bg-oxide-deep px-6 py-3 text-sm font-semibold text-paper motion-safe:transition-all motion-safe:hover:bg-oxide-ink motion-safe:hover:-translate-y-0.5"
      >
        {label}
        <span aria-hidden className="text-foam motion-safe:transition-all motion-safe:group-hover:translate-x-1">
          →
        </span>
      </a>
    </div>
  );
}