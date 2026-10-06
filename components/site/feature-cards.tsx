import { cn } from "@/lib/utils";

interface FeatureCard {
  icon?: string;
  title: string;
  description: string;
}

export function FeatureCards({
  cards,
  className,
  columns = 2,
}: {
  cards: FeatureCard[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  const gridCols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[columns];

  return (
    <div className={cn("mx-auto grid max-w-6xl gap-5 px-5 md:px-8", gridCols, className)}>
      {cards.map((card) => (
        <div
          key={card.title}
          className="rise-in group flex flex-col rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.35)]"
        >
          {card.icon ? (
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-mint/60 text-oxide-deep">
              <span className="text-lg font-bold">{card.icon}</span>
            </div>
          ) : null}
          <h3 className="font-display text-lg font-medium leading-snug text-ink">{card.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{card.description}</p>
        </div>
      ))}
    </div>
  );
}