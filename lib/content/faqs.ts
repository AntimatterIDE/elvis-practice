import { practice } from "@/lib/site";

export const faqs = [
  {
    question: "How do I make an appointment?",
    answer:
      "New patients are welcome. Use the contact page to request a consultation and leave a name and the best way to reach you. There is no online scheduler. The office keeps the request and calls when they can.",
  },
  {
    question: "Which insurance plans do you accept?",
    answer:
      "Bring your card to the visit and ask. This site does not publish a plan list, because a list that has not been checked would be wrong. Please do not send member IDs or insurance cards through the contact form.",
  },
  {
    question: "Can I describe my symptoms in the contact form?",
    answer:
      "A short note is fine, including why you are calling. Leave insurance numbers, member IDs, and dates of birth off the form. The office keeps the request and calls when they can.",
  },
  {
    question: "Where is the office?",
    answer:
      `${practice.name} is at ${practice.addressLine}. Call ${practice.phone} or write ${practice.email}.`,
  },
  {
    question: "Who is the physician?",
    answer:
      "Elvis Francois, MD, an orthopedic spine surgeon. He completed medical school at Meharry Medical College, orthopedic residency at the Mayo Clinic, and a spine surgery fellowship at Harvard Medical School’s Beth Israel Deaconess Medical Center.",
  },
] as const;
