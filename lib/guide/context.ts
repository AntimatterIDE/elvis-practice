import "server-only";
import { conditions } from "@/lib/content/conditions";
import { publicPath } from "@/lib/content";
import { faqs } from "@/lib/content/faqs";
import { isPubliclyVisible } from "@/lib/content/publish";
import { treatments } from "@/lib/content/treatments";
import { publishedJournalArticle, publishedJournalArticles } from "@/lib/journal/store";
import { carePathways, clinicalFocus, physicianTraining, practice } from "@/lib/site";

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export async function guideBrief(page?: string) {
  const lines = [
    `${practice.name}. ${practice.specialty}. Physician: ${practice.physicianName}.`,
    `Office: ${practice.addressLine}. Phone: ${practice.phone}. Email: ${practice.email}.`,
    `Training: ${physicianTraining.map((item) => `${item.label}: ${item.value}`).join("; ")}.`,
    `Clinical focus: ${clinicalFocus.join(", ")}.`,
    ...carePathways.map((item) => `${item.label} (${item.href}): ${item.body}`),
    ...faqs.map((item) => `Question: ${item.question} Answer: ${item.answer}`),
  ];

  for (const document of [...conditions, ...treatments]) {
    const path = isPubliclyVisible(document)
      ? publicPath(document)
      : `${document.kind === "condition" ? "/conditions" : "/treatments"}#${document.slug}`;
    const body = document.sections.map((section) => section.body).join(" ");
    lines.push(`${document.title} (${path}): ${clip(document.summary, 240)} ${clip(body, 360)}`);
  }

  const articles = await publishedJournalArticles().catch(() => []);
  for (const article of articles) {
    lines.push(
      `Journal article "${article.title}" (/journal/${article.slug}): ${clip(article.summary, 280)} ${clip(article.body, 420)}`,
    );
  }

  const slug = page?.match(/^\/journal\/([a-z0-9-]+)\/?$/)?.[1];
  if (slug) {
    const current = await publishedJournalArticle(slug).catch(() => null);
    if (current) {
      lines.unshift(
        `The visitor is reading the journal article "${current.title}" at /journal/${current.slug}. When they ask about this page, answer from this article and say "based on what this article says". ${clip(current.body, 1600)}`,
      );
    }
  }

  return lines.join("\n").slice(0, 14000);
}
