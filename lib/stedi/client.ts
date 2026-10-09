import "server-only";
import { readServerEnv } from "@/lib/env";

export const HEALTHCARE = "https://healthcare.us.stedi.com/2024-04-01";
export const CLAIMS = "https://claims.us.stedi.com/2025-03-07";
export const CORE = "https://core.us.stedi.com/2023-08-01";
export const ELIGIBILITY = "https://healthcare.us.stedi.com/2026-06-01";
export const PAYERS = "https://payers.us.stedi.com/2024-04-01";
export const ENROLLMENTS = "https://enrollments.us.stedi.com/2024-09-01";
export const MANAGER = "https://manager.us.stedi.com/2024-04-01";

export function isStediConfigured() {
  return Boolean(readServerEnv().STEDI_API_KEY);
}

export function publicStediMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const direct = record.message ?? record.error;
    if (typeof direct === "string" && direct.trim()) return direct.trim().slice(0, 240);
    if (Array.isArray(record.errors) && record.errors[0] && typeof record.errors[0] === "object") {
      const error = record.errors[0] as { description?: string; message?: string };
      const text = error.description ?? error.message;
      if (typeof text === "string" && text.trim()) return text.trim().slice(0, 240);
    }
  }
  return `Stedi returned HTTP ${status}.`;
}

export async function stediFetch(url: string, init: RequestInit = {}) {
  const key = readServerEnv().STEDI_API_KEY;
  if (!key) {
    return { ok: false, status: 0, body: { message: "Add a Stedi Test API key as STEDI_API_KEY. Nothing was sent." } };
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", key.startsWith("Key ") ? key : `Key ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text.slice(0, 180) };
    }
  }
  return { ok: response.ok, status: response.status, body };
}
