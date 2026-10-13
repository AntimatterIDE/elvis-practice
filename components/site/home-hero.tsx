import Link from "next/link";
import { HeroArtwork } from "@/components/site/brand";
import { IconArrow } from "@/components/site/icons";
import { practice } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="px-5 pb-8 pt-6 md:px-8 md:pb-16 md:pt-14">
      <div className="mx-auto grid max-w-6xl items-center gap-2 md:grid-cols-[minmax(0,1.15fr)_minmax(13rem,0.85fr)] md:gap-8 lg:gap-12">
        <div className="order-2 md:order-1">
          <p className="kicker text-oxide-deep">{practice.name}</p>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.6rem,6vw,4.75rem)] font-medium leading-[0.96] tracking-[-0.035em]">
            Spine care, <em className="text-oxide-deep">carefully aligned.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {practice.physicianName} is an orthopedic spine surgeon. The work of this practice is to understand the
            problem, explain it clearly, and decide the next step with you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/contact"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-oxide-deep px-6 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
            >
              Contact the practice
              <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-card px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-oxide/40"
            >
              About the clinic
            </Link>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            New patients are welcome. Request a call from the contact page. Do not include insurance numbers or dates of birth.
          </p>
        </div>
        <div className="order-1 md:order-2">
          <HeroArtwork className="mx-auto h-52 w-full max-w-xs sm:h-64 md:h-80 md:max-w-none lg:h-[28rem]" />
          <p className="kicker mt-1 text-center text-ink">{practice.specialty}</p>
        </div>
      </div>
    </section>
  );
}
