import type { ContactInquiry } from "@/lib/content/schema";

export const consultationInboxes = ["christina@thealignmentclinic.com", "admin@thealignmentclinic.com"] as const;

function reasonLabel(reason: ContactInquiry["reason"]) {
  return reason === "consultation" ? "Request a consultation" : "General question";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function consultationNotice(inquiry: ContactInquiry) {
  const fields = [
    ["Name", inquiry.name],
    ["Reason", reasonLabel(inquiry.reason)],
    ["Email", inquiry.email || "—"],
    ["Phone", inquiry.phone || "—"],
    ["Best time for a call", inquiry.preferredTime || "—"],
    ["Note", inquiry.note || "—"],
  ] as const;
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = fields
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`)
    .join("");
  return {
    subject: `Consultation request: ${inquiry.name}`,
    text,
    html,
  };
}
