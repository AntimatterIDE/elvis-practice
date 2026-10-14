import Link from "next/link";
import { IconArrow } from "@/components/site/icons";

const journey = [
  {
    label: "Conversation",
    body: "You describe what has changed, what you have already tried, and what you need to get back to.",
  },
  {
    label: "Evaluation",
    body: "The physician examines you and explains which findings matter. Tests are ordered when they would change the plan.",
  },
  {
    label: "A plan you can follow",
    body: "Options are named in plain language, including care that does not involve an operation.",
  },
  {
    label: "Follow-through",
    body: "You leave with the next step written down: time, therapy, a test, or a procedure.",
  },
];

export function HomeJourney() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" aria-labelledby="journey-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="journey-heading" className="font-display text-3xl font-medium tracking-tight md:text-5xl">
          A visit, in order
        </h2>
        <Link
          href="/visit"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-oxide-deep"
        >
          How a visit works
          <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
      <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
        <span
          aria-hidden="true"
          className="absolute left-5 top-5 hidden h-px w-[calc(75%+1.5rem)] bg-oxide/50 md:block"
        />
        {journey.map((step, index) => (
          <li key={step.label} className="relative pl-14 md:pl-0">
            {index < journey.length - 1 ? (
              <span className="absolute left-5 top-10 h-full w-px bg-line md:hidden" aria-hidden="true" />
            ) : null}
            <span className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center rounded-full bg-oxide-deep text-sm font-semibold text-paper md:static">
              {index + 1}
            </span>
            <h3 className="font-display text-xl font-medium leading-tight md:mt-5">{step.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
