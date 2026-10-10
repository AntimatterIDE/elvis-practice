import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { shareImage } from "@/lib/share-metadata";
import { canonicalOrigin, isIndexingEnabled, practice } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-family",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display-family",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin()),
  title: {
    default: practice.name,
    template: `%s · ${practice.name}`,
  },
  description: practice.description,
  applicationName: practice.name,
  robots: isIndexingEnabled()
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  icons: {
    icon: [
      { url: "/brand/alignment-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: practice.name,
    title: { absolute: practice.name },
    description: practice.description,
    url: "/",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: practice.name },
    description: practice.description,
    images: [shareImage],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
