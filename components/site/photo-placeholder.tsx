import { SpineArt } from "@/components/site/spine-art";

export function PhotoPlaceholder({
  label = "Elvis Francois, MD",
  caption = "Orthopedic spine surgery",
  className = "",
}: {
  label?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <figure
      className={`hero-panel relative flex min-h-72 flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 text-paper shadow-[0_24px_50px_-32px_rgb(7_30_54_/_0.8)] ${className}`}
    >
      <SpineArt className="pointer-events-none absolute -right-8 top-0 h-full w-auto opacity-80" />
      <p className="relative font-display text-5xl font-semibold tracking-tight">EF</p>
      <figcaption className="relative">
        <span className="block font-display text-2xl font-semibold tracking-tight">{label}</span>
        <span className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-paper/90 backdrop-blur">
          {caption}
        </span>
      </figcaption>
    </figure>
  );
}
