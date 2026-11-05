import { claimTotal } from "@/lib/rcm/format";
import type { Claim } from "@/lib/rcm/types";
import type { PortalInvoice } from "@/lib/portal/types";

const shown = new Set(["ready", "submitted", "processing", "accepted", "denied", "rejected", "paid"]);

function amount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function invoicesFromClaims(claims: Claim[]): PortalInvoice[] {
  return claims
    .filter((claim) => claim?.id && claim.patientId && shown.has(claim.status))
    .slice(0, 200)
    .map((claim) => {
      const charge = claimTotal(claim);
      const paid = amount(claim.paymentAmount);
      const adjustment = amount(claim.adjustmentAmount);
      const responsibility = claim.patientResponsibility;
      const owed = typeof responsibility === "number" && Number.isFinite(responsibility) ? responsibility : Math.max(0, charge - paid - adjustment);
      const services = claim.lines
        .filter((line) => line.includeOnBill !== false)
        .map((line) => line.description || line.cpt)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      return {
        id: claim.id,
        patientId: claim.patientId,
        date: claim.dateOfService || "",
        description: [claim.payerName, services].filter(Boolean).join(" · ").slice(0, 180) || "Visit",
        charge,
        paid,
        owed,
        status: claim.status,
      };
    });
}
