import { contactInquirySchema } from "@/lib/content/schema";
import { guideDisclaimer, guideEmergencyReply, guideInstructions } from "@/lib/guide/prompt";
import { describe, expect, it } from "vitest";

describe("consultation requests", () => {
  it("asks for a name and a way to reply", () => {
    const missing = contactInquirySchema.safeParse({
      name: "Ada Lovelace",
      email: "",
      phone: "",
      reason: "consultation",
      preferredTime: "",
      note: "",
      website: "",
    });
    expect(missing.success).toBe(false);

    const saved = contactInquirySchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "",
      reason: "consultation",
      preferredTime: "Weekday mornings",
      note: "Please call after 9.",
      website: "",
    });
    expect(saved.success).toBe(true);
  });
});

describe("site guide", () => {
  it("stays a helper and sends emergencies away from the chat", () => {
    expect(guideDisclaimer.toLowerCase()).toContain("not a spine expert");
    expect(guideInstructions).toContain("definitive answer");
    expect(guideInstructions).toContain("based on what this article says");
    expect(guideInstructions).toContain("request a consultation");
    expect(guideEmergencyReply("I have sudden weakness and cannot walk")).toMatch(/911/);
    expect(guideEmergencyReply("Where is the office?")).toBeNull();
  });
});
