import type { Metadata } from "next";
import { practice } from "@/lib/site";

export const shareImage = {
  url: "/brand/og.png",
  width: 1200,
  height: 630,
  alt: "The Alignment Clinic. Spine care, carefully aligned. Orthopedic spine surgery with Elvis Francois, MD.",
} as const;

type PageTitle = string | { absolute: string };

function absoluteTitle(title: PageTitle) {
  return typeof title === "string" ? `${title} · ${practice.name}` : title.absolute;
}

export function publicPageMetadata(input: {
  title: PageTitle;
  description: string;
  canonical: string;
  robots?: Metadata["robots"];
  image?: { url: string; alt: string };
}): Metadata {
  const title = absoluteTitle(input.title);
  const images = input.image
    ? [{ url: input.image.url, width: 1200, height: 630, alt: input.image.alt }]
    : [shareImage];
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.canonical },
    ...(input.robots ? { robots: input.robots } : {}),
    openGraph: {
      type: "website",
      siteName: practice.name,
      title: { absolute: title },
      description: input.description,
      url: input.canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: title },
      description: input.description,
      images,
    },
  };
}

/** Share tags for routes that must not advertise a private or unpublished page. */
export const unlistedShareMetadata: Metadata = {
  robots: { index: false, follow: false },
  openGraph: {
    title: { absolute: practice.name },
    description: practice.description,
    images: [],
  },
  twitter: {
    card: "summary",
    title: { absolute: practice.name },
    description: practice.description,
    images: [],
  },
};
