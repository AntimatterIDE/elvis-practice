import "server-only";
import { guideBrief } from "@/lib/guide/context";
import { guideEmergencyReply, guideInstructions } from "@/lib/guide/prompt";

export type GuideTurn = { role: "user" | "assistant"; content: string };

const banned = ["pain-free", "top-rated", "guaranteed", "cure"];

function closeWithConsultation(reply: string) {
  if (/consult/i.test(reply)) return reply;
  return `${reply} If you would like the office to be in touch, request a consultation on the contact page.`;
}

export async function answerGuide(messages: GuideTurn[], page?: string) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") throw new Error("Ask a question to continue.");
  const emergency = guideEmergencyReply(latest.content);
  if (emergency) return emergency;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return "The guide is not available right now. You can request a consultation on the contact page, and the office will reach out when they can.";
  }

  const brief = await guideBrief(page);
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 420,
      messages: [
        { role: "system", content: `${guideInstructions}\n\nSite material:\n${brief}` },
        ...messages.slice(-6).map((turn) => ({ role: turn.role, content: turn.content })),
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) throw new Error(payload.error?.message || "The guide could not answer just now.");
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("The guide could not answer just now.");
  const lowered = reply.toLowerCase();
  if (banned.some((phrase) => lowered.includes(phrase))) {
    return "I can only point to what the site already says, and I should not put it that way. Request a consultation on the contact page if you would like the office to be in touch.";
  }
  return closeWithConsultation(reply);
}
