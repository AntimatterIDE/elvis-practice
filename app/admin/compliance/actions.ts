"use server";

import { answerCompliance, writeBaaDraft } from "@/lib/compliance/assistant";
import { complianceVendor } from "@/lib/compliance/prompts";
import { getStaffSession } from "@/lib/supabase/session";

type Turn = { role: "user" | "assistant"; content: string };

function cleanTurns(value: Turn[]) {
  return value
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 2000) }))
    .filter((turn) => turn.content)
    .slice(-8);
}

export async function askComplianceAssistant(input: { messages: Turn[]; checked: string[] }) {
  if (!(await getStaffSession())) return { message: "Sign in as staff to use the compliance assistant." };
  const messages = cleanTurns(input.messages ?? []);
  if (!messages.length || messages.at(-1)?.role !== "user") return { message: "Ask a question first." };
  const checked = (input.checked ?? []).filter((id) => typeof id === "string").slice(0, 40);
  try {
    const reply = await answerCompliance(messages, checked);
    return { reply };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "The assistant did not answer." };
  }
}

export async function reviseBaaDraft(input: { vendorId: string; body: string; instruction: string }) {
  if (!(await getStaffSession())) return { message: "Sign in as staff to draft an agreement." };
  if (!complianceVendor(input.vendorId)) return { message: "That agreement is not on the list." };
  const body = (input.body ?? "").slice(0, 20000);
  const instruction = (input.instruction ?? "").trim().slice(0, 1000);
  try {
    const draft = await writeBaaDraft(input.vendorId, body, instruction);
    return { body: draft };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "The draft could not be written." };
  }
}
