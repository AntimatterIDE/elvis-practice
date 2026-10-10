export type StarterAgreement = {
  id: string;
  title: string;
  body: string;
};

// Categories New York orthopedic offices collect: office consent, a privacy-notice
// acknowledgment, assignment of benefits, permission to text and email, and a records
// release. Photo ID, insurance cards, referrals, outside films, no-fault papers, and
// Medicare forms are files, not signatures. These are practice drafts, not a copied form.
export const starterAgreements: StarterAgreement[] = [
  {
    id: "starter-consent",
    title: "Consent to evaluate and treat",
    body: `The Alignment Clinic

Consent to evaluate and treat

I agree that The Alignment Clinic may examine me and provide office care. That includes a history, a physical examination, and the tests and treatments the physician discusses with me. I can ask questions, and I can refuse a test or a treatment.

This consent covers office evaluation and care. It is not a consent for an operation. If an operation, an injection, or another procedure is recommended, the practice will discuss that procedure with me, including why it is recommended and what the alternatives are. I will be asked to agree to that procedure separately.

I understand that no result is guaranteed.

The Alignment Clinic does not provide emergency care through this form or through the website. If I think I have an emergency, I will call 911.`,
  },
  {
    id: "starter-privacy",
    title: "Privacy notice acknowledgment",
    body: `The Alignment Clinic

Privacy notice acknowledgment

The Alignment Clinic keeps a notice of how it uses and shares health information. I can ask for that notice at the office, and I can ask what is in my record.

The practice uses and shares my health information to treat me, to be paid, and to run the practice. That includes sending a claim to my health plan. Those uses do not need a separate permission.

Signing this page records that I was asked to acknowledge the notice. If I have not been given the notice, I can ask for it before I sign. Refusing to sign does not by itself stop the practice from treating me.

This is not permission to use my information for marketing.`,
  },
  {
    id: "starter-benefits",
    title: "Assignment of benefits and financial responsibility",
    body: `The Alignment Clinic

Assignment of benefits and financial responsibility

I assign the benefits payable for my care at The Alignment Clinic to the practice, and I ask my health plan to pay the practice directly. I allow the practice to send my health plan the information it needs to process a claim. This assignment applies to Medicare and to other health plans.

I am responsible for charges my plan does not pay. That can include a deductible, a copay, coinsurance, and a service the plan does not cover. The practice will tell me the amount I am expected to pay at a visit before or when I am seen.

If I do not have insurance, I can ask for a good-faith estimate before a scheduled service.

I will tell the practice about a referral or an authorization my plan requires. If the plan denies a claim because that was missing, I am responsible for the charge.

If I need to cancel or move a visit, I will tell the practice as soon as I can. The practice will tell me, before I am charged, if a missed visit has a fee.

This form does not set a price. Charges are the ones the practice quotes to me or bills to my plan.`,
  },
  {
    id: "starter-messages",
    title: "Permission to email and text",
    body: `The Alignment Clinic

Permission to email and text

I allow The Alignment Clinic to email and text me about appointments, paperwork, and the business of my care, at the email address and mobile number I give the practice.

These messages can include a reminder or a link to a document. I will not send symptoms, photographs of a medical problem, or insurance numbers by text, or by replying to those emails.

Message and data rates from my phone carrier may apply. This is not permission to send me marketing.

I can tell the practice to stop texting or emailing me, and the practice will stop those messages. Stopping them does not stop the practice from treating me, and it does not stop a bill sent by mail.`,
  },
  {
    id: "starter-records",
    title: "Permission to obtain and send records",
    body: `The Alignment Clinic

Permission to obtain and send records

I allow The Alignment Clinic to request my records and images from other physicians, hospitals, and imaging centers so the practice can treat me. I allow those offices to send that information to The Alignment Clinic.

I allow the practice to send my records and images to a physician or facility that is treating me, and to my health plan so the practice can be paid.

This permission lasts for one year unless I revoke it in writing sooner. Revoking it does not undo a disclosure the practice already made. The practice can still use my information for my treatment, for payment, and to run the practice.

A record that is sent out may be shared again by the office that receives it.

This form is not a request to send my record to an employer, a lawyer, or an insurer for a purpose other than payment. Those requests need their own permission, and that permission has to name the recipient.`,
  },
];
