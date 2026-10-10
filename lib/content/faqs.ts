import { practice } from "@/lib/site";

export const faqs = [
  {
    question: "How do I make an appointment?",
    answer:
      "New patients are welcome. Use the contact page to request a call. There is no online scheduler. The form accepts a name and a phone number or email. It does not accept symptoms or insurance numbers, and it says so if the note was not delivered.",
  },
  {
    question: "Which insurance plans do you accept?",
    answer:
      "Bring your card to the visit and ask. This site does not publish a plan list, because a list that has not been checked would be wrong. Please do not send member IDs or insurance cards through the contact form.",
  },
  {
    question: "Can I describe my symptoms in the contact form?",
    answer:
      "No. The form is for scheduling and other administrative questions. It asks you not to include symptoms, history, images, or insurance details, and it refuses notes that look clinical.",
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
