import type { MetadataRoute } from "next";
import { canonicalOrigin, isIndexingEnabled } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexingEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/preview"],
    },
    sitemap: `${canonicalOrigin()}/sitemap.xml`,
  };
}
