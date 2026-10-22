import type { PortalMessage, PortalPatientRecord } from "@/lib/portal/types";

export const mailboxKey = "__messages";

function seen(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asMessage(value: unknown): PortalMessage | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PortalMessage>;
  if (item.from !== "patient" && item.from !== "practice") return null;
  if (typeof item.id !== "string" || typeof item.body !== "string" || typeof item.createdAt !== "string") return null;
  return {
    id: item.id.slice(0, 80),
    from: item.from,
    author: typeof item.author === "string" && item.author.trim() ? item.author.trim().slice(0, 80) : item.from === "patient" ? "Patient" : "The practice",
    body: item.body.trim().slice(0, 2000),
    createdAt: item.createdAt,
    seenByPatient: seen(item.seenByPatient, item.from === "patient"),
    seenByPractice: seen(item.seenByPractice, item.from === "practice"),
  };
}

export function parseMessages(raw: string | undefined): PortalMessage[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.map(asMessage).filter((item): item is PortalMessage => item !== null);
  } catch {
    return [];
  }
}

export function attachMailbox(record: PortalPatientRecord): PortalPatientRecord {
  const answers = { ...(record.answers ?? {}) };
  const embedded = answers[mailboxKey];
  delete answers[mailboxKey];
  const stored = Array.isArray(record.messages) ? record.messages.map(asMessage).filter((item): item is PortalMessage => item !== null) : [];
  return { ...record, answers, messages: stored.length ? stored : parseMessages(embedded) };
}

export function answersWithMailbox(answers: Record<string, string>, messages: PortalMessage[] | undefined) {
  return { ...answers, [mailboxKey]: JSON.stringify(messages ?? []) };
}
