import Link from "next/link";
import { IconAfterSurgery, IconArrow, IconLowBack, IconNeck, IconVisit } from "@/components/site/icons";
import { publicConditions, publicPath } from "@/lib/content";
import { carePathways } from "@/lib/site";

const icons = {
  neck: IconNeck,
  "low-back": IconLowBack,
  "after-surgery": IconAfterSurgery,
  visit: IconVisit,
};

export function CareIndex() {
  const published = new Map(publicConditions().map((document) => [document.slug, document]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {carePathways.map((item) => {
        const Icon = icons[item.id] ?? IconVisit;
        const hash = item.href.includes("#") ? item.href.split("#")[1] : "";
        const document = hash ? published.get(hash) : undefined;
        const href = document ? publicPath(document) : item.href;
        return (
          <Link
            key={item.id}
            href={href}
            className="clinic-card group flex h-full flex-col rounded-2xl border border-line bg-card p-6 card-shadow"
          >
            <Icon className="h-9 w-12 text-oxide-deep" />
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
