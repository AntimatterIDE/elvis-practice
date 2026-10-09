import { sendClinicEmail } from "@/lib/bird/send";
import { readServerEnv } from "@/lib/env";
import { canonicalOrigin } from "@/lib/site";

type EmailPayload = {
  user?: { email?: string };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

const subjects: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You're invited to The Alignment Clinic",
  recovery: "Reset your password",
  magiclink: "Sign in to The Alignment Clinic",
  email_change: "Confirm your new email",
};

export async function POST(request: Request) {
  const env = readServerEnv();
  if (!env.AUTH_EMAIL_HOOK_SECRET) {
    return Response.json({ message: "The auth email hook is not configured." }, { status: 503 });
  }
  const raw = await request.text();
  const authorized = await verifyHook(raw, request.headers, env.AUTH_EMAIL_HOOK_SECRET);
  if (!authorized) return Response.json({ message: "Unauthorized." }, { status: 401 });

  let payload: EmailPayload;
  try {
    payload = JSON.parse(raw) as EmailPayload;
  } catch {
    return Response.json({ message: "The email payload could not be read." }, { status: 400 });
  }

  const email = payload.user?.email ?? "";
  const data = payload.email_data;
  if (!email.includes("@") || !data?.token_hash || !data.email_action_type) {
    return Response.json({ message: "The email payload is missing an address or token." }, { status: 400 });
  }

  const link = confirmLink(data);
  const subject = subjects[data.email_action_type] ?? "A message from The Alignment Clinic";
  const text = [`${subject}.`, "", "Open this link and continue:", link, "", data.token ? `Code: ${data.token}` : "", "The Alignment Clinic"].filter(Boolean).join("\n");
  const sent = await sendClinicEmail({
    to: email,
    subject,
    text,
    html: `<p>${escapeHtml(subject)}.</p><p><a href="${escapeHtml(link)}">Continue</a></p>${data.token ? `<p>Code: ${escapeHtml(data.token)}</p>` : ""}<p>The Alignment Clinic</p>`,
  });
  if (!sent.ok) return Response.json({ message: sent.message }, { status: 502 });
  return Response.json({});
}

function confirmLink(data: NonNullable<EmailPayload["email_data"]>) {
  const url = new URL("/auth/confirm", canonicalOrigin());
  url.searchParams.set("token_hash", data.token_hash ?? "");
  url.searchParams.set("type", data.email_action_type ?? "");
  if (data.redirect_to) {
    try {
      const next = new URL(data.redirect_to).searchParams.get("next");
      if (next) url.searchParams.set("next", next);
    } catch {
      // A redirect without a next path still lands on the continue page.
    }
  }
  return url.toString();
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function verifyHook(raw: string, headers: Headers, secret: string) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;
  const key = secret.split(",").at(-1)?.replace(/^whsec_/, "") ?? "";
  const bytes = Uint8Array.from(atob(key), (char) => char.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`${id}.${timestamp}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));
  return signature.split(" ").some((part) => part.split(",").at(-1) === expected);
}
