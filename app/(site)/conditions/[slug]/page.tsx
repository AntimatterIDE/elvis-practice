import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClinicalArticle } from "@/components/site/clinical-article";
import { MissingPage } from "@/components/site/missing-page";
import { getCondition, publicConditions } from "@/lib/content";
import { isPubliclyVisible } from "@/lib/content/publish";

type Params = { slug: string };

export function generateStaticParams() {
  return publicConditions().map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const document = getCondition(slug);
  if (!document || !isPubliclyVisible(document)) {
    return { title: "Not published", robots: { index: false, follow: false } };
  }
  return {
    title: document.seoTitle,
    description: document.seoDescription,
    alternates: { canonical: `/conditions/${document.slug}` },
  };
}

export default async function ConditionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const document = getCondition(slug);
  if (!document) notFound();
  if (!isPubliclyVisible(document)) return <MissingPage />;

  const related = document.relatedSlugs
    .map((relatedSlug) => getCondition(relatedSlug) ?? null)
    .filter((item): item is NonNullable<typeof item> => Boolean(item && isPubliclyVisible(item)))
    .map((item) => ({ href: `/conditions/${item.slug}`, title: item.title }));

  return <ClinicalArticle document={document} related={related} />;
}
