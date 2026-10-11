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
    return Response.json({ message: "Please wait a few minutes before asking again." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ message: "That question could not be read." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json({ message: "Ask a short question to continue." }, { status: 400 });
  }

  try {
    const reply = await answerGuide(parsed.data.messages as GuideTurn[], parsed.data.page);
    return Response.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The guide could not answer just now.";
    return Response.json({ message }, { status: 502 });
  }
}
