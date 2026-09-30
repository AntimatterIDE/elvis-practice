import type { MetadataRoute } from "next";
import { publicClinicalDocuments, publicPath } from "@/lib/content";
import { canonicalOrigin, isIndexingEnabled } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexingEnabled()) return [];

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
  ];
}
