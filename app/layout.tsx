import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { canonicalOrigin, isIndexingEnabled, practice } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
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
  openGraph: {
    type: "website",
    siteName: practice.name,
    title: practice.name,
    description: practice.description,
    url: canonicalOrigin(),
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
