import { journalBody } from "@/lib/journal/body";

export type JournalSection = {
  id: string;
  title: string;
  body: string;
};

function sectionId(title: string, used: Set<string>) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "section";
  let id = base;
  let count = 2;
  while (used.has(id)) {
    id = `${base}-${count}`;
    count += 1;
  }
  used.add(id);
  return id;
}

export function journalSections(source: string): JournalSection[] {
  const blocks = journalBody(source).split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const used = new Set<string>();
  const sections: JournalSection[] = [];
  let current: JournalSection | null = null;
  const opening: string[] = [];

  for (const block of blocks) {
    const labeled = block.match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
    if (labeled) {
      if (current) sections.push(current);
      current = {
        id: sectionId(labeled[1], used),
        title: labeled[1].trim(),
        body: labeled[2].trim(),
      };
      continue;
    }
    if (current) {
      current.body = current.body ? `${current.body}\n\n${block}` : block;
    } else {
      opening.push(block);
    }
  }

  if (current) sections.push(current);
  if (opening.length === 0) return sections;
  return [{ id: sectionId("Introduction", used), title: "Introduction", body: opening.join("\n\n") }, ...sections];
}

export function readingMinutes(source: string) {
  const words = journalBody(source).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
