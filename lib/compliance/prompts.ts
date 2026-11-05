import { checklist, complianceMeta, vendorBaas, type VendorBaa } from "@/lib/compliance/hipaa-baa";
import { practice } from "@/lib/site";

export function complianceVendor(id: string): VendorBaa | undefined {
  return vendorBaas.find((vendor) => vendor.id === id);
}

export function assistantInstructions(checked: string[]) {
  const done = new Set(checked);
  const lines = checklist.map((item) => `${done.has(item.id) ? "[done]" : "[open]"} ${item.label}`);
  const vendors = vendorBaas.map((vendor) => `${vendor.priority}. ${vendor.party} — ${vendor.role}. Next: ${vendor.action}.`);
  return [
    `You help staff at ${complianceMeta.coveredEntity} track HIPAA Business Associate work for ${complianceMeta.productionSite}.`,
    "Speak in short plain sentences. You are not counsel, and you do not say the clinic is HIPAA-ready or that a draft has been signed.",
    "Do not ask for patient names, dates of birth, member ids, or clinical notes. If a message includes them, tell staff to remove that text and do not repeat it.",
    "Use only the inventory below. If something is not listed, say so.",
    "",
    "Vendors that need a BAA:",
    ...vendors,
    "",
    "Checklist:",
    ...lines,
  ].join("\n");
}

export function agreementInstructions(vendor: VendorBaa) {
  return [
    `You draft a Business Associate Agreement for counsel to review. Covered entity: ${practice.name}, ${practice.physicianName}, ${practice.addressLine}.`,
    `Business associate: ${vendor.party}. Role: ${vendor.role}. How PHI is involved: ${vendor.detail.join(" ")}`,
    "Write the full agreement in plain text with numbered sections a lawyer can edit.",
    "Cover definitions, permitted uses and disclosures, safeguards, subcontractors, breach notice, access for the covered entity and HHS, return or destruction of PHI, term, and termination if the associate breaches.",
    "Leave dates, notice addresses, and governing law in [brackets].",
    "Do not say the agreement is executed, approved, or sufficient for go-live.",
    "If a current draft and an instruction are provided, return the full revised agreement, not a summary of the changes.",
    "Do not include patient information.",
  ].join(" ");
}

export function agreementRequest(vendor: VendorBaa, body: string, instruction: string) {
  const draft = body.trim();
  const change = instruction.trim();
  if (!draft) {
    return change
      ? `Write the first draft of the ${vendor.party} Business Associate Agreement. Staff asked: ${change}`
      : `Write the first draft of the ${vendor.party} Business Associate Agreement.`;
  }
  return [
    "Current draft:",
    draft,
    "",
    change ? `Revise the whole agreement as follows: ${change}` : "Return the current draft cleaned up, without changing its meaning.",
  ].join("\n");
}
