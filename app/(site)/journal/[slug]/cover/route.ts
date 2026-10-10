import { ensureJournalHero } from "@/lib/journal/hero";
import { publishedJournalArticle } from "@/lib/journal/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await publishedJournalArticle(slug);
  if (!article) return new Response("Not found", { status: 404 });
  try {
    const hero = await ensureJournalHero(article);
    if (!hero) return new Response("No image", { status: 404 });
    return Response.redirect(hero, 302);
  } catch {
    return new Response("No image", { status: 404 });
  }
}
