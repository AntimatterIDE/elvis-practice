import { cn } from "@/lib/utils";

interface Step {
  number: string;
  title: string;
  description: string;
  icon?: string;
}

export function Timeline({
  steps,
  className,
}: {
  steps: Step[];
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-5xl px-5 md:px-8", className)}>
      <div className="grid gap-0">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rise-in group grid gap-6 md:grid-cols-[auto_1fr] motion-safe:transition-all motion-safe:duration-500"
          >
            {/* Number badge */}
            <div className="flex shrink-0 items-start justify-center md:justify-start">
              <div className="flex size-14 items-center justify-center rounded-full bg-mint/70 text-oxide-deep ring-2 ring-oxide/20 shadow-[0_0_0_4px_rgb(14_143_132_/_0.12)] motion-safe:transition-all motion-safe:group-hover:scale-105">
                <span className="font-display text-xl font-bold leading-none">{step.number}</span>
              </div>
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.3)]">
              <div className="flex items-center gap-3">
                {step.icon ? (
                  <span className="text-2xl leading-none">{step.icon}</span>
                ) : null}
                <h3 className="font-display text-xl font-medium leading-tight text-ink">{step.title}</h3>
              </div>
              <p className="mt-3 text-base leading-relaxed text-muted">{step.description}</p>
            </div>

            {/* Connecting line between steps */}
            {i < steps.length - 1 ? (
              <div className="hidden md:col-start-1 md:col-end-3 md:mt-4 md:h-px md:bg-gradient-to-r md:from-oxide/30 md:via-oxide-deep/10 md:to-transparent" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}