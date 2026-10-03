import Link from "next/link";
import { BrandIcon } from "@/components/site/brand";
import { IconArrow } from "@/components/site/icons";
import { publicConditions, publicPath } from "@/lib/content";
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
        return (
          <Link
            key={item.id}
            href={href}
            className="clinic-card group flex h-full flex-col rounded-2xl border border-line bg-card p-6 card-shadow"
          >
            <BrandIcon src={icons[item.id]} />
            <span className="mt-5 flex items-start justify-between gap-4">
              <span className="font-display text-2xl font-medium leading-tight">{item.label}</span>
              <IconArrow className="mt-2 size-4 shrink-0 text-oxide-deep transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-muted">{item.body}</span>
          </Link>
        );
      })}
    </div>
  );
}
