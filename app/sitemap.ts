import type { MetadataRoute } from "next";
import { publicClinicalDocuments, publicPath } from "@/lib/content";
import { publishedJournalArticles } from "@/lib/journal/store";
import { canonicalOrigin, isIndexingEnabled } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingEnabled()) return [];
  const articles = await publishedJournalArticles();

  const origin = canonicalOrigin();
  const staticRoutes = [
    "",
    "/about",
    "/dr-elvis-francois",
    "/conditions",
    "/treatments",
    "/visit",
    "/contact",
    "/questions",
    "/journal",
    "/medical-disclaimer",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${origin}${path || "/"}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...publicClinicalDocuments().map((document) => ({
      url: `${origin}${publicPath(document)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...articles.map((article) => ({
      url: `${origin}/journal/${article.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
