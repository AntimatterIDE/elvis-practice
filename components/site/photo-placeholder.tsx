import { SpineArt } from "@/components/site/spine-art";

export function PhotoPlaceholder({
  label = "Photograph pending",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <figure
      className={`hero-panel relative flex min-h-72 flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 text-paper shadow-[0_24px_50px_-32px_rgb(7_30_54_/_0.8)] ${className}`}
    >
      <SpineArt className="pointer-events-none absolute -right-8 top-0 h-full w-auto opacity-80" />
      <figcaption className="relative mt-auto w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-paper/90 backdrop-blur">
        {label}
      </figcaption>
    </figure>
  );
}
