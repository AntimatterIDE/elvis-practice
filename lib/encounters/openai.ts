import "server-only";
import { readServerEnv } from "@/lib/env";
import { parseClinicalNote, noteInstructions } from "@/lib/encounters/template";

const noteModel = "gpt-5-mini-2025-08-07";
const transcriptionModel = "gpt-4o-transcribe";

function apiKey() {
  const key = readServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured.");
  return key;
}

async function errorMessage(response: Response, fallback: string) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message.slice(0, 500);
  } catch {
    // The transcription API returns plain text on success and JSON on failure.
  }
  return fallback;
}

export async function transcribeAudio(file: { bytes: Uint8Array; contentType: string; filename: string }) {
  const body = new FormData();
  body.append("file", new File([Buffer.from(file.bytes)], file.filename, { type: file.contentType }));
  body.append("model", transcriptionModel);
  body.append("response_format", "text");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey()}` },
    body,
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "The recording could not be transcribed."));
  const transcript = (await response.text()).trim();
  if (!transcript) throw new Error("The transcript came back empty.");
  return transcript;
}

type ResponsePayload = {
  output_text?: string;
  output?: { content?: { text?: string }[] }[];
  error?: { message?: string };
};

function responseText(payload: ResponsePayload) {
  if (payload.output_text?.trim()) return payload.output_text;
  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const block of item.content ?? []) {
      if (block.text) parts.push(block.text);
    }
  }
  return parts.join("\n");
}

export async function writeClinicalNote(transcript: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: noteModel,
      max_output_tokens: 2000,
      reasoning: { effort: "minimal" },
      text: { verbosity: "low" },
      input: [
        { role: "system", content: noteInstructions() },
        { role: "user", content: transcript },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) throw new Error(payload.error?.message?.slice(0, 500) || "The note could not be written.");
  return parseClinicalNote(responseText(payload));
}
