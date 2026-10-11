import type { Metadata } from "next";
import { VisitPath } from "@/components/site/visit-path";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Your visit",
  description:
    "How a visit at The Alignment Clinic works, what to bring, and what this website will not collect.",
  canonical: "/visit",
});

export default function VisitPage() {
  return <VisitPath />;
}
