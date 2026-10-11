import Link from "next/link";
import { BrandIcon } from "@/components/site/brand";
import { IconArrow } from "@/components/site/icons";
import { publicConditions, publicPath } from "@/lib/content";
import { cn } from "@/lib/utils";
import { carePathways } from "@/lib/site";

const icons = {
  neck: "/brand/icons/neck-pain.svg",
  "low-back": "/brand/icons/low-back-pain.svg",
  "after-surgery": "/brand/icons/reassessment.svg",
  visit: "/brand/icons/visit-process.svg",
} as const;

export function CareIndex() {
  const published = new Map(publicConditions().map((document) => [document.slug, document]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {carePathways.map((item) => {
        const hash = item.href.includes("#") ? item.href.split("#")[1] : "";
        const document = hash ? published.get(hash) : undefined;
        const href = document ? publicPath(document) : item.href;
        const featured = item.id === "visit";
        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              "group flex h-full flex-col rounded-3xl border p-6 transition duration-300 motion-safe:hover:-translate-y-1 motion-reduce:transition-none md:p-8",
              featured
                ? "border-pine bg-pine text-paper"
                : "border-line bg-card card-shadow hover:border-oxide/40",
            )}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl",
                featured ? "bg-white/10" : "bg-mint",
              )}
            >
              <BrandIcon src={icons[item.id]} />
            </span>
            <span className="mt-6 flex items-start justify-between gap-4">
              <span className="font-display text-2xl font-medium leading-tight md:text-3xl">{item.label}</span>
              <IconArrow
                className={cn(
                  "mt-2 size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none",
                  featured ? "text-foam" : "text-oxide-deep",
                )}
              />
            </span>
            <span className={cn("mt-3 block text-sm leading-relaxed md:text-base", featured ? "text-paper/80" : "text-muted")}>
              {item.body}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
