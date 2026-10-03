import { BrandMark } from "@/components/site/brand";
import { cn } from "@/lib/utils";

export function PhotoPlaceholder({
  label = "Elvis Francois, MD",
  caption = "Orthopedic spine surgery",
  lockup = "mark",
  className = "",
}: {
  label?: string;
  caption?: string;
  lockup?: "mark" | "physician";
  className?: string;
}) {
  if (lockup === "physician") {
    return (
      <figure aria-hidden="true" className={cn("flex items-center rounded-[1.5rem] border border-line bg-card p-6 card-shadow", className)}>
        <img
          src="/brand/alignment-logo-physician.svg"
          alt=""
          aria-hidden="true"
          width={530}
          height={100}
          decoding="async"
          className="h-auto w-full"
        />
      </figure>
    );
  }

  return (
    <figure
      className={cn(
        "hero-panel relative flex min-h-80 flex-col overflow-hidden rounded-[1.5rem] p-6 text-paper shadow-[0_24px_50px_-32px_rgb(7_30_54_/_0.8)]",
        className,
      )}
    >
      <figcaption className="relative flex min-h-0 flex-1 flex-col">
        <p className="kicker text-foam">{caption}</p>
        <BrandMark tone="reverse" className="mx-auto mt-6 size-36" />
        <span className="mt-auto block border-t border-white/25 pt-4 font-display text-2xl font-medium leading-tight">
          {label}
        </span>
      </figcaption>
    </figure>
  );
}
