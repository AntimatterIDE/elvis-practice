import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <img
      src="/brand/alignment-logo.svg"
      alt="The Alignment Clinic"
      width={635}
      height={116}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-11 w-auto max-w-full", className)}
    />
  );
}

export function BrandMark({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "reverse";
  className?: string;
}) {
  return (
    <img
      src={tone === "reverse" ? "/brand/alignment-mark-reverse.svg" : "/brand/alignment-mark.svg"}
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      decoding="async"
      fetchPriority="low"
      className={cn("size-12 shrink-0", className)}
    />
  );
}

export function BrandIcon({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      decoding="async"
      fetchPriority="low"
      className={cn("size-8 shrink-0", className)}
    />
  );
}

export function HeroArtwork() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-48 sm:h-56 lg:h-[30rem]">
      <img
        src="/brand/alignment-hero-graphic.svg"
        alt=""
        width={440}
        height={520}
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </div>
  );
}
