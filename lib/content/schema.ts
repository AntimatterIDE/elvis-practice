import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");

export const offeringStatusSchema = z.enum(["unconfirmed", "offered", "not_offered"]);
export const reviewStatusSchema = z.enum(["draft", "in_review", "approved"]);

export const sectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
});

export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const clinicalDocumentSchema = z.object({
  kind: z.enum(["condition", "treatment"]),
  slug: slugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
  faqs: z.array(faqSchema),
  relatedSlugs: z.array(slugSchema),
  offeringStatus: offeringStatusSchema,
  reviewStatus: reviewStatusSchema,
  publishedAt: z.iso.datetime().nullable(),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1).max(180),
});

export type ClinicalDocument = z.infer<typeof clinicalDocumentSchema>;
export type OfferingStatus = z.infer<typeof offeringStatusSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const contactInquirySchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(80),
    email: z.string().trim().max(120).default(""),
    phone: z.string().trim().max(40).default(""),
    reason: z.enum(["appointment", "general"]),
    note: z.string().trim().max(500, "Keep the note under 500 characters.").default(""),
    website: z.string().max(0, "Leave this field blank.").optional().default(""),
  })
  .superRefine((value, context) => {
    const emailOk = value.email.length === 0 || z.email().safeParse(value.email).success;
    if (!emailOk) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter a valid email address or leave it blank.",
      });
    }
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Add an email address or a phone number.",
      });
    }
  });

export type ContactInquiry = z.infer<typeof contactInquirySchema>;
