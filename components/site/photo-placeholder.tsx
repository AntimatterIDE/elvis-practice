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
        "relative aspect-[4/5] w-full self-start overflow-hidden rounded-[1.5rem] shadow-[0_24px_50px_-32px_rgb(7_30_54_/_0.8)]",
        className,
      )}
    >
      <img
        src="/photos/elvis-francois.webp"
        alt={label}
        width={584}
        height={584}
        decoding="async"
        loading="lazy"
        fetchPriority="low"
        className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
      />
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
