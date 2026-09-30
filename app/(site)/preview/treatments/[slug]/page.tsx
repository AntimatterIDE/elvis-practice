import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClinicalArticle } from "@/components/site/clinical-article";
import { getTreatment } from "@/lib/content";
import { canViewDraftsWithoutAuth } from "@/lib/site";
import { getStaffSession } from "@/lib/supabase/session";

type Params = { slug: string };

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreviewTreatmentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const document = getTreatment(slug);
  if (!document) notFound();

  const staff = await getStaffSession();
  if (!canViewDraftsWithoutAuth() && !staff) notFound();

  const related = document.relatedSlugs.flatMap((relatedSlug) => {
    const item = getTreatment(relatedSlug);
    return item ? [{ href: `/preview/treatments/${item.slug}`, title: item.title }] : [];
  });

  return <ClinicalArticle document={document} related={related} preview />;
}
