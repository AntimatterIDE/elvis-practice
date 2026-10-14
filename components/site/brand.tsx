import { practiceName } from "@/lib/site";
import { cn } from "@/lib/utils";

export function PracticeName({
  goldClassName,
  blueClassName,
  className,
  tone = "paper",
}: {
  goldClassName?: string;
  blueClassName?: string;
  className?: string;
  tone?: "paper" | "pine";
}) {
  return (
    <span className={cn("block", className)}>
      <span className={cn("block", tone === "pine" ? "text-gold-soft" : "text-gold", goldClassName)}>
        {practiceName.gold}
      </span>
      <span className={cn("block", tone === "pine" ? "text-clinic-blue-soft" : "text-clinic-blue", blueClassName)}>
        {practiceName.blue}
      </span>
    </span>
  );
}

export function BrandLogo({
  className,
  priority = false,
  alt = "The Alignment Clinic",
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <img
      src="/brand/alignment-logo.svg"
      alt={alt}
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

export function HeroArtwork({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative h-full w-full", className)} style={{ position: "relative", height: "100%", width: "100%" }}>
      <img
        src="/brand/alignment-hero-graphic.svg?v=3"
        alt=""
        width={440}
        height={520}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-contain object-center"
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "contain", objectPosition: "center" }}
      />
    </div>
  );
}
