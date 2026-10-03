import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClinicalArticle } from "@/components/site/clinical-article";
import { getCondition } from "@/lib/content";
import { unlistedShareMetadata } from "@/lib/share-metadata";
import { canViewDraftsWithoutAuth } from "@/lib/site";
import { getStaffSession } from "@/lib/supabase/session";

type Params = { slug: string };

export const metadata: Metadata = unlistedShareMetadata;

export default async function PreviewConditionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const document = getCondition(slug);
  if (!document) notFound();

  const staff = await getStaffSession();
  if (!canViewDraftsWithoutAuth() && !staff) notFound();

  const related = document.relatedSlugs.flatMap((relatedSlug) => {
    const item = getCondition(relatedSlug);
    return item ? [{ href: `/preview/conditions/${item.slug}`, title: item.title }] : [];
  });

  return <ClinicalArticle document={document} related={related} preview />;
}
