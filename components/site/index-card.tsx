import Link from "next/link";
import { IconArrow } from "@/components/site/icons";
import { publicPath } from "@/lib/content";
import { isPubliclyVisible } from "@/lib/content/publish";
import type { ClinicalDocument } from "@/lib/content/schema";

export function IndexCard({ document }: { document: ClinicalDocument }) {
  const visible = isPubliclyVisible(document);
  const body = (
    <>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-mint/80">
          <div className="size-3 rounded-full bg-oxide-deep" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold leading-snug text-ink md:text-2xl">
            {document.title}
          </h2>
          <p className="mt-1.5 max-w-2xl leading-relaxed text-muted">
            {document.summary}
          </p>
          {visible ? (
            <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-oxide-deep hover:text-oxide-ink">
              Read this note
              <IconArrow className="size-4" />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
  const className =
    "rounded-2xl border border-line bg-card px-5 py-5 md:px-6 md:py-6 shadow-[0_4px_16px_-8px_rgb(7_30_54_/_0.18)] hover:shadow-[0_8px_28px_-16px_rgb(7_30_54_/_0.3)] transition-shadow";

  if (!visible) {
    return <article className={className}>{body}</article>;
  }

  return (
    <Link href={publicPath(document)} className={`${className} clinic-card block`}>
      {body}
    </Link>
  );
}