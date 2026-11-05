import Link from "next/link";
import { CloudAtlas } from "@/components/react-bits/cloud-atlas";
import { IconArrow } from "@/components/site/icons";
import { Promises } from "@/components/site/promises";
import { practice } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="relative bg-[#c5e2f8]">
      <CloudAtlas
        className="home-hero-art absolute inset-0 h-full w-full"
        backgroundColor="#c5e2f8"
        colors={["#ffffff", "#eef6fc"]}
        opacity={0.96}
        anchor="bottom"
        height={0.82}
        coverage={1.15}
        density={0.2}
        scale={1.45}
        towers={0.45}
        wind={0.35}
        billow={0.75}
        speed={0.55}
        interactive={false}
      />
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100svh-10.5rem)] w-full max-w-6xl flex-col justify-center px-5 py-10 md:px-8 md:py-14">
        <div className="pointer-events-auto max-w-[40rem]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-clinic-blue">
            {practice.specialty}
          </p>
          <h1 className="mt-4 font-sans text-[clamp(2.45rem,5.6vw,4.85rem)] font-bold leading-[0.9] tracking-[-0.05em] text-ink">
            <span className="block">The Alignment</span> <span className="block">Clinic of</span>{" "}
            <span className="block">Spine Surgery</span> <span className="block">& Orthopedics</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            {practice.physicianName} is an orthopedic spine surgeon. The work of this practice is to understand the
            problem, explain it clearly, and decide the next step with you.
          </p>
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full bg-oxide-deep px-6 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
            >
              Contact the practice
            </Link>
            <Link
              href="/about"
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink"
            >
              About the clinic
              <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            New patients are welcome. Request a call from the contact page. Do not include insurance numbers or dates of
            birth.
          </p>
          <Promises />
        </div>
      </div>
    </section>
  );
}
