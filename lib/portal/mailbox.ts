import type { PortalInvoice, PortalMessage, PortalPatientRecord } from "@/lib/portal/types";

export const mailboxKey = "__messages";
export const invoiceKey = "__invoices";

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

function asInvoice(value: unknown): PortalInvoice | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PortalInvoice>;
  const charge = Number(item.charge);
  const paid = Number(item.paid);
  const owed = Number(item.owed);
  if (typeof item.id !== "string" || typeof item.patientId !== "string") return null;
  if (![charge, paid, owed].every((amount) => Number.isFinite(amount))) return null;
  return {
    id: item.id.slice(0, 80),
    patientId: item.patientId.slice(0, 80),
    date: typeof item.date === "string" ? item.date.slice(0, 40) : "",
    description: typeof item.description === "string" && item.description.trim() ? item.description.trim().slice(0, 180) : "Visit",
    charge,
    paid,
    owed,
    status: typeof item.status === "string" ? item.status.slice(0, 40) : "",
  };
}

export function cleanPortalInvoices(value: unknown): PortalInvoice[] {
  if (!Array.isArray(value)) return [];
  return value.map(asInvoice).filter((item): item is PortalInvoice => item !== null).slice(0, 200);
}

export function parseInvoices(raw: string | undefined): PortalInvoice[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.map(asInvoice).filter((item): item is PortalInvoice => item !== null).slice(0, 40);
  } catch {
    return [];
  }
}

export function attachMailbox(record: PortalPatientRecord): PortalPatientRecord {
  const answers = { ...(record.answers ?? {}) };
  const embedded = answers[mailboxKey];
  const embeddedInvoices = answers[invoiceKey];
  delete answers[mailboxKey];
  delete answers[invoiceKey];
  const stored = Array.isArray(record.messages) ? record.messages.map(asMessage).filter((item): item is PortalMessage => item !== null) : [];
  const storedInvoices = Array.isArray(record.invoices) ? record.invoices.map(asInvoice).filter((item): item is PortalInvoice => item !== null) : null;
  return {
    ...record,
    answers,
    messages: stored.length ? stored : parseMessages(embedded),
    invoices: storedInvoices ?? parseInvoices(embeddedInvoices),
  };
}

export function answersWithMailbox(
  answers: Record<string, string>,
  messages: PortalMessage[] | undefined,
  invoices: PortalInvoice[] | undefined,
) {
  return {
    ...answers,
    [mailboxKey]: JSON.stringify(messages ?? []),
    [invoiceKey]: JSON.stringify(invoices ?? []),
  };
}
