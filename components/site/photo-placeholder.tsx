import { SpineArt } from "@/components/site/spine-art";
import { cn } from "@/lib/utils";

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
      className={cn(
        "hero-panel relative flex min-h-80 flex-col overflow-hidden rounded-[1.5rem] p-6 text-paper shadow-[0_24px_50px_-32px_rgb(7_30_54_/_0.8)]",
        className,
      )}
    >
      <figcaption className="relative flex min-h-0 flex-1 flex-col">
        <p className="kicker text-foam">{caption}</p>
        <SpineArt className="mx-auto mt-3 h-44 w-full flex-1 text-paper" />
        <span className="mt-4 block border-t border-white/25 pt-4 font-display text-2xl font-medium leading-tight">
          {label}
        </span>
      </figcaption>
    </figure>
  );
}
