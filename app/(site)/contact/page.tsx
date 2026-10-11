import type { Metadata } from "next";
import { ContactPanel } from "@/components/site/contact-panel";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description:
    "Request a consultation with The Alignment Clinic. Leave your name and the best way for the office to reach you.",
  canonical: "/contact",
});

export default function ContactPage() {
  return <ContactPanel />;
}
