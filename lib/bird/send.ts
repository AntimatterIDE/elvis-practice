import "server-only";
import { birdFetch, toE164 } from "@/lib/bird/client";
import { readServerEnv } from "@/lib/env";

function idFrom(body: unknown) {
  return body && typeof body === "object" && typeof (body as { id?: string }).id === "string" ? (body as { id: string }).id : "";
}

export async function sendClinicEmail(input: { to: string; subject: string; html: string; text: string }) {
  const env = readServerEnv();
  const response = await birdFetch("/v1/email/messages", {
    method: "POST",
    body: JSON.stringify({
      from: { email: env.BIRD_FROM_EMAIL, name: "The Alignment Clinic" },
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      category: "transactional",
      track_opens: false,
      track_clicks: false,
    }),
  });
  if (!response.ok) return { ok: false as const, message: response.message || "Bird did not accept the message." };
  return { ok: true as const, id: idFrom(response.body), message: "Email accepted." };
}

export async function sendClinicSms(input: { to: string; text: string }) {
  const env = readServerEnv();
  const to = toE164(input.to);
  if (!to) return { ok: false as const, message: "Enter a US phone number before texting." };
  if (!env.BIRD_SMS_FROM) return { ok: false as const, message: "A clinic texting number is not configured yet. Nothing was sent." };
  const response = await birdFetch("/v1/sms/messages", {
    method: "POST",
    body: JSON.stringify({
      from: env.BIRD_SMS_FROM,
      to,
      text: input.text,
      category: "transactional",
    }),
  });
  if (!response.ok) return { ok: false as const, message: response.message || "Bird did not accept the message." };
  return { ok: true as const, id: idFrom(response.body), message: "Text accepted." };
}

export async function placeClinicCall(input: { to: string; spoken: string }) {
  const env = readServerEnv();
  const to = toE164(input.to);
  if (!to) return { ok: false as const, message: "Enter a US phone number before calling." };
  if (!env.BIRD_VOICE_FROM) return { ok: false as const, message: "A clinic calling number is not configured yet. Nothing was sent." };
  const response = await birdFetch("/v1/voice/calls", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      from: env.BIRD_VOICE_FROM,
      to,
      sequence: {
        entry_node_id: "start",
        trigger_data: {},
        definition: {
          schema_version: 1,
          expression_environment: "bird.cel.v1",
          nodes: [
            {
              id: "start",
              type: "trigger.start_call",
              type_version: 1,
              config: {},
              input: {},
              connections: { event: { node_id: "speak", port: "input" } },
            },
            {
              id: "speak",
              type: "voice.say",
              type_version: 1,
              config: {},
              input: { text: input.spoken, language: "en" },
              connections: { next: { node_id: "done", port: "input" } },
            },
            {
              id: "done",
              type: "logic.exit",
              type_version: 1,
              config: { status: "succeeded", reason: "message_played" },
              input: { output: {} },
            },
          ],
        },
      },
    }),
  });
  if (!response.ok) return { ok: false as const, message: response.message || "Bird did not accept the message." };
  return { ok: true as const, id: idFrom(response.body), message: "Call accepted." };
}
