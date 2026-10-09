import "server-only";
import { readServerEnv } from "@/lib/env";

export function isBirdConfigured() {
  return Boolean(readServerEnv().BIRD_API_KEY);
}

function birdMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as { message?: string };
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim().slice(0, 240);
  }
  return `Bird returned HTTP ${status}.`;
}

export async function birdFetch(path: string, init: RequestInit = {}) {
  const env = readServerEnv();
  if (!env.BIRD_API_KEY) {
    return { ok: false, status: 0, body: { message: "Add BIRD_API_KEY before sending. Nothing was sent." } };
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.BIRD_API_KEY}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${env.BIRD_API_URL}${path}`, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text.slice(0, 240) };
    }
  }
  return { ok: response.ok, status: response.status, body, message: response.ok ? "Accepted." : birdMessage(body, response.status) };
}

export function toE164(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}
