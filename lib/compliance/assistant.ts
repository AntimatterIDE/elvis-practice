import "server-only";
import { agreementInstructions, agreementRequest, assistantInstructions, complianceVendor } from "@/lib/compliance/prompts";
import { readServerEnv } from "@/lib/env";

function plainText(content: string) {
  const fenced = content.match(/^```(?:text|markdown)?\s*([\s\S]*?)\s*```$/);
  return (fenced?.[1] ?? content).trim();
}

async function complete(system: string, user: string, maxTokens: number) {
  const env = readServerEnv();
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Add OPENAI_API_KEY before the compliance assistant can write.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) throw new Error(payload.error?.message || "The assistant did not answer.");
  const text = plainText(payload.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("The assistant came back empty.");
  return text;
}

export async function answerCompliance(messages: { role: "user" | "assistant"; content: string }[], checked: string[]) {
  const history = messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Staff" : "Assistant"}: ${message.content}`)
    .join("\n\n");
  return complete(assistantInstructions(checked), history, 700);
}

export async function writeBaaDraft(vendorId: string, body: string, instruction: string) {
  const vendor = complianceVendor(vendorId);
  if (!vendor) throw new Error("That agreement is not on the list.");
  return complete(agreementInstructions(vendor), agreementRequest(vendor, body, instruction), 3500);
}
