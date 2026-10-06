import { cn } from "@/lib/utils";

interface Milestone {
  year: string;
  title: string;
  description: string;
}

export function Milestones({
  milestones,
  className,
}: {
  milestones: Milestone[];
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto max-w-4xl px-5 md:px-8", className)}>
      {/* Vertical line */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-oxide/40 via-oxide-deep/20 to-transparent motion-safe:animate-pulse motion-safe:duration-[3s]" aria-hidden />

      <div className="grid gap-8">
        {milestones.map((m, i) => {
          const isLeft = i % 2 === 0;
          return (
            <div
              key={m.year}
              className="rise-in group relative grid md:grid-cols-[1fr_auto_1fr] motion-safe:transition-all motion-safe:duration-500"
            >
              {/* Content */}
              <div
                className={`md:${isLeft ? "col-start-1 col-end-2" : "col-start-3 col-end-4"} text-balance`}
              >
                <div
                  className={`rounded-2xl border border-oxide/20 bg-card p-6 card-shadow md:p-8 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_16px_40px_-20px_rgb(7_30_54_/_0.3)] ${
                    isLeft ? "text-right" : "text-left"
                  }`}
                >
                  <span className="kicker text-oxide-deep">{m.year}</span>
                  <h3 className="mt-2 font-display text-xl font-medium leading-tight text-ink">
                    {m.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted">{m.description}</p>
                </div>
              </div>

              {/* Center dot */}
              <div className="hidden md:flex md:col-start-2 md:col-end-3 md:items-center md:justify-center">
                <div className="size-4 rounded-full bg-oxide-deep ring-2 ring-oxide/30 shadow-[0_0_0_4px_rgb(14_143_132_/_0.15)]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}