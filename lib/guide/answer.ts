import "server-only";
import { guideBrief } from "@/lib/guide/context";
import { guideEmergencyReply, guideInstructions } from "@/lib/guide/prompt";

export type GuideTurn = { role: "user" | "assistant"; content: string };

const banned = ["pain-free", "top-rated", "guaranteed", "cure"];

function closeWithConsultation(reply: string) {
  if (/consult/i.test(reply)) return reply;
  return `${reply} If you'd like someone from the office to call, you can request a consultation and they'll reach out when they can.`;
}

export async function answerGuide(messages: GuideTurn[], page?: string) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") throw new Error("Ask a short question and I'll look through what we have.");
  const emergency = guideEmergencyReply(latest.content);
  if (emergency) return emergency;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return "I'm having a little trouble looking that up right now. If you'd like, you can request a consultation and someone from the office will be in touch.";
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
  if (!response.ok) throw new Error(payload.error?.message || "I'm having a little trouble with that. Try once more in a moment.");
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("I'm having a little trouble with that. Try once more in a moment.");
  const lowered = reply.toLowerCase();
  if (banned.some((phrase) => lowered.includes(phrase))) {
    return "I hear you. Let me keep this to what we share on the site, and the office can talk it through with you if you request a consultation.";
  }
  return closeWithConsultation(reply);
}
