import { renderMarkdown } from "@/lib/content/markdown";

export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose-clinical text-lg leading-relaxed text-ink"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
