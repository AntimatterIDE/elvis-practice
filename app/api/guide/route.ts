import { answerGuide, type GuideTurn } from "@/lib/guide/answer";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const maxDuration = 30;

const bodySchema = z.object({
  page: z.string().trim().max(160).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(800),
      }),
    )
    .min(1)
    .max(8),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`guide:${ip}`, 12, 10 * 60 * 1000)) {
    return Response.json({ message: "Give me a few minutes, then ask again." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ message: "I didn't catch that. Try asking once more." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json({ message: "Ask a short question and I'll look through what we have." }, { status: 400 });
  }

  try {
    const reply = await answerGuide(parsed.data.messages as GuideTurn[], parsed.data.page);
    return Response.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "I'm having a little trouble with that. Try once more in a moment.";
    return Response.json({ message }, { status: 502 });
  }
}
