import type { Metadata } from "next";
import { QuestionsBoard } from "@/components/site/questions-board";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Questions",
  description: "Practical questions about The Alignment Clinic, emergencies, and what this website will not collect.",
  canonical: "/questions",
});

export default function QuestionsPage() {
  return <QuestionsBoard />;
}
