import { describe, expect, it } from "vitest";
import { agreementInstructions, agreementRequest, assistantInstructions, complianceVendor } from "@/lib/compliance/prompts";

describe("compliance prompts", () => {
  it("tells the assistant which checklist items are still open", () => {
    const text = assistantInstructions(["clinic-agency-baa"]);
    expect(text).toContain("[done] Clinic ↔ practice zero BAA executed");
    expect(text).toContain("[open] Supabase Team + HIPAA add-on + BAA");
    expect(text).toContain("not counsel");
  });

  it("asks for a full draft the clinic's counsel can edit", () => {
    const vendor = complianceVendor("stedi");
    expect(vendor?.party).toBe("Stedi");
    const instructions = agreementInstructions(vendor!);
    expect(instructions).toContain("The Alignment Clinic");
    expect(instructions).toContain("Stedi");
    expect(instructions).toContain("counsel");
    expect(agreementRequest(vendor!, "", "")).toContain("first draft");
    expect(agreementRequest(vendor!, "Old terms.", "Shorten the breach notice to 10 days.")).toContain("10 days");
    expect(agreementRequest(vendor!, "Old terms.", "Shorten the breach notice to 10 days.")).toContain("Old terms.");
  });
});
