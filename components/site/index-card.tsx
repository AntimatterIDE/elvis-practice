import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { publicPath } from "@/lib/content";
import { isPubliclyVisible } from "@/lib/content/publish";
import type { ClinicalDocument } from "@/lib/content/schema";

export function IndexCard({ document }: { document: ClinicalDocument }) {
  const visible = isPubliclyVisible(document);
  const body = (
    <>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{document.title}</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted">{document.summary}</p>
      {visible ? (
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-oxide-deep">
          Read this note
          <ArrowRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </>
  );
  const className = "rounded-2xl border border-line bg-card px-6 py-6 card-shadow";

  if (!visible) {
    return <article className={className}>{body}</article>;
  }

  return (
    <Link href={publicPath(document)} className={`${className} clinic-card block`}>
      {body}
    </Link>
  );
}
