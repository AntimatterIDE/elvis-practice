import type { ClinicalDocument } from "@/lib/content/schema";

const draft = {
  offeringStatus: "unconfirmed",
  reviewStatus: "draft",
  publishedAt: null,
} as const;

function treatment(
  document: Omit<ClinicalDocument, "kind" | "offeringStatus" | "reviewStatus" | "publishedAt">,
): ClinicalDocument {
  return { kind: "treatment", ...draft, ...document };
}

export const treatments: ClinicalDocument[] = [
  treatment({
    slug: "spinal-fusion",
    title: "Spinal fusion",
    summary:
      "Spinal fusion joins two or more vertebrae so they heal as one unit. It is a way to stabilize a painful or unstable segment, not a treatment for every kind of back pain.",
    seoTitle: "Spinal fusion",
    seoDescription: "What spinal fusion means, when it is considered, and why it is not confirmed as offered here.",
    relatedSlugs: ["acdf", "lumbar-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Fusion uses bone graft, and usually implants, so a motion segment stops moving. In the neck, one common form is ACDF. In the low back, fusion may be done from the back, the side, or both. The family of operations is broader than any single acronym.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "Surgeons consider fusion for instability, some deformities, some fractures, and selected cases of degeneration when movement itself is part of the pain. It is a poor answer to pain that has no structural target.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "A visit can discuss whether fusion is even relevant. It is not an emergency procedure except in the setting of trauma, infection, or sudden neurological loss, which belong in a hospital. Call 911 for those emergencies.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Standing X-rays, MRI, and sometimes bending films or CT show alignment, nerves, and bone. The physician has to connect those images to your symptoms before fusion is a serious option.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Alternatives include continued non-operative care, decompression without fusion, and, in the neck, operations that remove a disc without fusing the level. The right comparison depends on the problem. This practice has not confirmed that it performs fusion.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Bone healing takes months. Restrictions on bending, lifting, and driving are specific to the approach and are given in person. Fusion does not guarantee pain relief, and a neighboring level can wear later.",
      },
    ],
    faqs: [
      {
        question: "Is fusion the same as a discectomy?",
        answer: "No. A discectomy removes disc material that is pressing on a nerve. Fusion also stops motion at the level.",
      },
      {
        question: "Will I be unable to move my whole spine?",
        answer: "A fusion stops motion at the treated levels. The rest of the spine still moves. How that feels depends on how many levels are included.",
      },
    ],
  }),
  treatment({
    slug: "acdf",
    title: "Anterior cervical discectomy and fusion",
    summary:
      "ACDF removes a damaged disc from the front of the neck and fuses the vertebrae above and below it. It is one operation for selected cervical disc and stenosis problems.",
    seoTitle: "ACDF",
    seoDescription: "A plain-language description of anterior cervical discectomy and fusion.",
    relatedSlugs: ["cervical-fusion", "cervical-disc-surgery"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The surgeon works through a small incision at the front of the neck, removes the disc, takes pressure off the nerve or spinal cord, and places a graft or cage so the bones can fuse. A plate is often used.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "ACDF is considered for a cervical disc herniation or bone spur that is compressing a nerve or the spinal cord, when symptoms and imaging agree and simpler care is not the better plan.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Progressive arm weakness or signs of spinal cord compression should be assessed promptly. Call 911 for sudden paralysis, a serious injury, or loss of bowel or bladder control. ACDF itself is usually a scheduled operation, not a same-day website request.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Examination, MRI, and often X-rays of alignment come before any recommendation. Swallowing, voice, and bone quality are part of the counseling because the approach is from the front of the neck.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Therapy, medicines, and time are reasonable for many pinched nerves. A disc replacement or a posterior operation may be discussed in selected people. Whether this practice performs ACDF is unconfirmed.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Many people go home the same day or after one night. A sore throat and temporary swallowing discomfort are common. Arm pain may ease before numbness does. Fusion has to heal, and that is not guaranteed.",
      },
    ],
    faqs: [
      {
        question: "Is ACDF the only neck fusion?",
        answer: "No. Some fusions are done from the back of the neck. That is a different operation and is described separately.",
      },
      {
        question: "Does the plate set off airport scanners?",
        answer: "It can. Your surgeon can explain what implant card, if any, you should carry. This page is not that instruction.",
      },
    ],
  }),
  treatment({
    slug: "cervical-fusion",
    title: "Cervical fusion",
    summary:
      "Cervical fusion stabilizes vertebrae in the neck. From the front, that is often ACDF. From the back, screws and rods are used for a different set of problems.",
    seoTitle: "Cervical fusion",
    seoDescription: "How posterior and anterior neck fusion differ, without listing them as offered services.",
    relatedSlugs: ["acdf", "spinal-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "This page covers neck fusion that is not simply another retelling of ACDF. Posterior fusion is considered when compression or deformity is better reached from the back, when several levels need support, or when the front of the neck is not the safer corridor.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "Reasons include multilevel spinal cord compression, certain fractures, instability, and selected revision situations. Neck pain alone is a weak reason to fuse the neck.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New imbalance, hand clumsiness, or worsening weakness deserves a prompt visit. Emergencies — sudden paralysis, major trauma, loss of bowel or bladder control — belong with 911, not a clinic form.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "MRI shows the cord and nerves. CT shows bone. X-rays show alignment. The approach is chosen from that combination and from your health, not from a template.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "ACDF, disc replacement, laminoplasty, and posterior decompression with or without fusion are the usual comparisons. This practice has not confirmed any of them as offered.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Posterior neck surgery typically involves more muscle discomfort than a front-of-neck approach. Collar wear and activity limits are individualized. The aim is to protect the cord and achieve a solid fusion, not to promise a painless neck.",
      },
    ],
    faqs: [
      {
        question: "Why is this separate from ACDF?",
        answer: "ACDF is one anterior operation. Cervical fusion also includes posterior constructs that solve different mechanical problems.",
      },
      {
        question: "Will I lose motion?",
        answer: "The fused levels stop moving. How noticeable that is depends on how many levels are included and which ones.",
      },
    ],
  }),
  treatment({
    slug: "cervical-disc-surgery",
    title: "Cervical disc surgery",
    summary:
      "Cervical disc surgery removes a disc in the neck that is pressing on a nerve or the spinal cord. Fusion and disc replacement are two different ways to finish the operation.",
    seoTitle: "Cervical disc surgery",
    seoDescription: "What surgery for a cervical herniated disc involves, kept separate from a blanket ACDF claim.",
    relatedSlugs: ["acdf", "herniated-disc"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "If a disc fragment in the neck is the clear cause of arm pain or cord compression, the fragment and the disc may be removed from the front. What replaces that disc — a graft that fuses, or an artificial disc that preserves some motion — is a second decision.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The usual target is arm pain, numbness, or weakness that matches a nerve on the MRI, or cord compression from a soft disc. It is not a treatment for every stiff neck.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Progressive arm weakness should not be watched indefinitely. Call 911 for sudden paralysis or loss of bowel or bladder control. Elective disc surgery is scheduled after a full discussion.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The examination should match a specific nerve root or the cord. MRI confirms the disc. X-rays help decide whether motion preservation is even mechanically sensible.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Many cervical disc herniations improve without surgery. When an operation is appropriate, ACDF and, in selected patients, disc replacement are the main anterior choices. Posterior foraminotomy is another option for some nerve-root problems. Offering status is unconfirmed.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Arm pain often calms before numbness. A sore throat is common after an anterior approach. Return to driving and lifting is a medical instruction, not a number on a webpage.",
      },
    ],
    faqs: [
      {
        question: "Is this the same page as ACDF?",
        answer: "No. ACDF is one way to reconstruct the disc space. Disc surgery is the broader decision to operate on a cervical disc.",
      },
      {
        question: "Do all herniated discs in the neck need surgery?",
        answer: "No. Many improve. Surgery is for specific nerve or cord problems, not for the MRI phrase itself.",
      },
    ],
  }),
  treatment({
    slug: "lumbar-microdiscectomy",
    title: "Lumbar microdiscectomy",
    summary:
      "A lumbar microdiscectomy removes the piece of disc that is pressing on a nerve in the low back, using a small incision and magnification.",
    seoTitle: "Lumbar microdiscectomy",
    seoDescription: "How a lumbar microdiscectomy is used for a pinched nerve, and what it does not claim to fix.",
    relatedSlugs: ["herniated-disc", "sciatica"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The operation targets the herniated fragment, not the entire disc, and it does not fuse the spine. It is among the more limited spine operations, and it is still an operation, with real risks.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The best candidate has leg pain that matches a nerve, a disc fragment on MRI in that same place, and symptoms that are severe or not improving. Back pain as the only complaint is a different problem.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New or worsening foot drop, or any bowel or bladder change, needs urgent care. Call 911 for sudden severe weakness or loss of bowel or bladder control. Otherwise the decision is made over a visit, not a form.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Examination and MRI have to agree. If they do not, removing a disc fragment is unlikely to help. This practice has not confirmed that it performs microdiscectomy.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Waiting, therapy, and injections help a large share of people. Surgery is the option when nerve pain is limiting and the anatomy is clear, or when weakness is progressing. Fusion is not part of a standard microdiscectomy.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Many people walk the same day. Leg pain may ease quickly. Numbness can lag. There is a chance the fragment can recur. Sitting, lifting, and therapy plans are individualized.",
      },
    ],
    faqs: [
      {
        question: "Is microdiscectomy minimally invasive?",
        answer: "It uses a small incision and magnification. Minimally invasive describes the approach. It does not mean the surgery is trivial or risk-free.",
      },
      {
        question: "Will it cure back pain?",
        answer: "It is designed for nerve compression. Relief of axial back pain is not the promise of the operation.",
      },
    ],
  }),
  treatment({
    slug: "laminectomy",
    title: "Laminectomy",
    summary:
      "A laminectomy removes a portion of the vertebral arch, the lamina, to create more room for nerves or the spinal cord.",
    seoTitle: "Laminectomy",
    seoDescription: "What a laminectomy does in the neck or low back, and how it differs from fusion.",
    relatedSlugs: ["spinal-stenosis", "lumbar-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The lamina is the back wall of the spinal canal. Removing part of it can decompress a tight canal. In the low back this is a common operation for stenosis. In the neck, a related decompression may be paired with fusion or done as a laminoplasty, which is not the same operation.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The target is nerve or cord compression from stenosis, not muscle strain. Walking-limited leg pain from lumbar stenosis is the classic low-back example.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Falling walking distance is a reason for a visit. Sudden weakness, fever with severe pain, trauma, or bowel and bladder loss needs emergency care. Call 911 in those cases.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "MRI shows the tightness. X-rays show whether the spine is aligned and stable enough for decompression alone. If it is not, fusion may be discussed as a separate recommendation.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Therapy and injections are reasonable when symptoms are moderate. Laminectomy is considered when function is clearly limited and the canal is tight. This site does not state that laminectomy is offered.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "People usually walk soon after surgery. Back soreness from the approach is expected. The goal is more room for the nerves and a longer walking distance, not a guarantee of either.",
      },
    ],
    faqs: [
      {
        question: "Is laminectomy the same as fusion?",
        answer: "No. Laminectomy opens the canal. Fusion stops motion. They are sometimes combined, and sometimes they are not.",
      },
      {
        question: "Can this be done in the neck and the low back?",
        answer: "The word is used in both regions, but the operation and the risks differ. A single page cannot give both sets of instructions.",
      },
    ],
  }),
  treatment({
    slug: "lumbar-fusion",
    title: "Lumbar fusion",
    summary:
      "Lumbar fusion permanently connects vertebrae in the low back. Posterior lumbar interbody fusion, or PLIF, is one technique inside this group, not a separate promise.",
    seoTitle: "Lumbar fusion",
    seoDescription: "An overview of lumbar fusion, including interbody techniques such as PLIF, without claiming they are offered.",
    relatedSlugs: ["spinal-fusion", "spondylolisthesis"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The surgeon stabilizes one or more levels so they no longer move. Bone graft is placed so the vertebrae grow together. An interbody cage, as in PLIF or a related approach, sits in the disc space and is one tool among several. The old template page that described this topic as stroke rehabilitation was an error and is not reused.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "Instability, some cases of spondylolisthesis, selected deformity, and some revision problems are the usual reasons. Fusion is not the treatment for an ordinary muscle strain.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "A planned consultation is the right setting. Call 911 for sudden weakness, loss of bowel or bladder control, fever with severe pain after a recent operation, or major trauma.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Bending X-rays, MRI, and sometimes CT help decide whether motion or nerve compression is the real target. If the spine is stable and the pain has no mechanical source, fusion is unlikely to help.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Non-operative care comes first for most degenerative pain. Decompression without fusion is enough for some stenotic spines. When fusion is chosen, the corridor — back, side, or front — depends on anatomy. PLIF is one posterior interbody method. Offering status is unconfirmed.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Hospital stay and brace use vary. Bone takes months to heal. Restrictions are part of the surgical consent, not this article. A solid fusion still does not guarantee the pain will leave.",
      },
    ],
    faqs: [
      {
        question: "What is PLIF?",
        answer: "Posterior lumbar interbody fusion places a spacer in the disc space from the back while the level is fused. It is a technique, not a different disease.",
      },
      {
        question: "Is lumbar fusion the same as microdiscectomy?",
        answer: "No. Microdiscectomy removes a fragment and preserves motion. Fusion stops motion at the treated level.",
      },
    ],
  }),
  treatment({
    slug: "minimally-invasive-spine-surgery",
    title: "Minimally invasive spine surgery",
    summary:
      "Minimally invasive spine surgery is a set of approaches that use smaller corridors and imaging or tubular retractors. It is not one operation, and it is not automatically gentler in every way that matters.",
    seoTitle: "Minimally invasive spine surgery",
    seoDescription: "What minimally invasive means in spine surgery, and what the phrase does not guarantee.",
    relatedSlugs: ["lumbar-microdiscectomy", "lumbar-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The phrase describes how a surgeon reaches the spine: smaller incisions, dilation through muscle rather than a wide opening, and often fluoroscopy or navigation. A microdiscectomy, a decompression, or a fusion can each be done this way in selected cases.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The indication is the underlying problem — a disc fragment, stenosis, or instability — not a preference for a small scar. Some problems are safer through a traditional opening.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "The urgency follows the condition, not the brand of the approach. Emergencies still go to 911. An elective discussion belongs in a visit.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Imaging and examination decide the operation first. The incision size is chosen second. A smaller incision that cannot accomplish the goal is not a benefit.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Open and minimally invasive versions of the same operation should be compared honestly, including radiation from imaging, operative time, and what can be seen. This practice has not confirmed that it offers minimally invasive techniques.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Muscle soreness may be less with a smaller corridor. Nerve recovery, fusion healing, and the chance of recurrence follow the operation itself. Smaller does not mean risk-free or faster for every patient.",
      },
    ],
    faqs: [
      {
        question: "Is minimally invasive the same as laser surgery?",
        answer: "No. Laser is a marketing word that does not define these operations. The meaningful details are what is removed and what is stabilized.",
      },
      {
        question: "Is everyone a candidate?",
        answer: "No. Prior surgery, unusual anatomy, and the need for a wide decompression can make an open approach the better choice.",
      },
    ],
  }),
  treatment({
    slug: "image-guided-spine-surgery",
    title: "Image-guided spine surgery",
    summary:
      "Image guidance and computer-assisted navigation track instruments against a three-dimensional map of the spine. That is not the same thing as a robot, and this page does not claim either technology is in use.",
    seoTitle: "Image-guided spine surgery",
    seoDescription: "How surgical navigation differs from a robot, and why the technology is unconfirmed here.",
    relatedSlugs: ["spinal-fusion", "minimally-invasive-spine-surgery"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Navigation uses cameras and a CT-based or intraoperative map so screws and other instruments can be placed with a live reference. Some systems attach a robotic arm. Many do not. Older descriptions that used the word robotic for ordinary computer assistance were imprecise.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "Guidance is a tool inside an operation, usually a fusion or a complex decompression. It does not treat a symptom by itself. The operation still has to be the right operation.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Choose care based on the spinal problem, not on a device. Emergencies go to 911. A clinic visit can discuss whether navigation would even be relevant.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The surgeon decides the goal from your examination and imaging. Only then does the question of navigation or a robotic arm come up. This practice has not stated which system, if any, it uses.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Freehand placement with X-ray, navigation, and robotic assistance are different technical choices with different evidence and different costs. None is listed as available here.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Recovery follows the operation, not the guidance system. Accurate screw placement matters. It is not a promise of less pain or a shorter recovery.",
      },
    ],
    faqs: [
      {
        question: "Does image guidance mean a robot does the surgery?",
        answer: "No. Navigation can be used without a robot. If a robotic arm is used, the surgeon still plans and controls the operation.",
      },
      {
        question: "Should I look for a robot before I look for a diagnosis?",
        answer: "No. The diagnosis and the goal of surgery come first. The tool is secondary.",
      },
    ],
  }),
  treatment({
    slug: "revision-spine-surgery",
    title: "Revision spine surgery",
    summary:
      "Revision surgery is a later operation to address a problem that remains, returns, or appears after an earlier spine procedure.",
    seoTitle: "Revision spine surgery",
    seoDescription: "Why a second spine operation is a specific plan, not a default for lingering pain.",
    relatedSlugs: ["pain-after-spine-surgery", "spinal-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "A revision might remove a recurrent disc fragment, decompress a level next to an old fusion, repair a fusion that did not heal, or treat an infection or a malpositioned implant. Each of those is a different operation. Lingering pain without a clear target is not automatically one of them.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The useful history is precise: what was done, what improved, and what is new. Wound problems and fever point toward infection. Leg or arm pain in a clear nerve pattern points toward compression. Diffuse pain may not have a surgical answer.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Recent surgery with drainage, fever, or new weakness should go back to the operating team or to emergency care. Call 911 for sudden severe weakness or loss of bowel or bladder control. A considered second opinion can wait until records are in hand.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Operative reports and prior imaging are essential. Bring them to a visit. Do not send them through this website. New MRI or CT is chosen to answer a defined question, sometimes with contrast or a metal-reduction protocol.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Non-operative care is still on the table. When a structural problem is clear, the revision is planned around that problem only. This practice has not confirmed that it performs revision surgery.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Revision operations are often longer and less predictable than a first operation. Scar tissue, prior implants, and healed bone change the risks. Expectations have to be set from the actual plan.",
      },
    ],
    faqs: [
      {
        question: "Is a second surgery likely to work if the first one did not?",
        answer: "Only if the second operation is aimed at a problem the first one did not solve, or at a new problem. Repeating a procedure without a new target is not a strategy.",
      },
      {
        question: "Do I need my old records?",
        answer: "Yes. A revision opinion without the original plan is incomplete.",
      },
    ],
  }),
  treatment({
    slug: "scoliosis-surgery",
    title: "Scoliosis surgery",
    summary:
      "Scoliosis surgery straightens and stabilizes a curve in the spine that is large, progressive, or causing a specific problem. It is not a treatment for ordinary back pain with a small curve.",
    seoTitle: "Scoliosis surgery",
    seoDescription: "A cautious description of scoliosis surgery. The practice has not confirmed that it offers this care.",
    relatedSlugs: ["spinal-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Scoliosis is a sideways curve, often with rotation. Curves in adolescents and curves in older adults are different conditions. Surgery, when it is used, is typically a fusion over the levels that need to be stabilized. This page is held as a draft because it is easy to over-claim.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "In a growing patient, progression of a large curve is the usual reason an operation is discussed. In an adult, deformity with nerve compression, imbalance while standing, or a curve that is worsening may be the reason. Pain alone, with a mild curve, usually is not.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New weakness, trouble breathing that is severe, or a major injury needs emergency care. Call 911. Curve surveillance belongs with a clinician who treats deformity, on a schedule, not through a contact form.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Full-length standing X-rays measure the curve. MRI is added when there are neurological symptoms or atypical features. The decision is about progression, balance, and symptoms together.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Observation and, in growing patients, bracing are the main non-operative paths. Surgery is a large operation and is considered for selected curves. This practice has not confirmed a scoliosis program.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Hospital recovery, activity limits, and the time to fusion healing are measured in weeks and months. The goal is a stable, better-balanced spine. It is not a promise of a straight back or of pain disappearing.",
      },
    ],
    faqs: [
      {
        question: "Does a curve seen on an X-ray mean I need surgery?",
        answer: "No. Many curves are observed. Size, growth remaining, symptoms, and balance all matter.",
      },
      {
        question: "Is this offered here?",
        answer: "Not according to this website. The page is unpublished until the practice confirms the service.",
      },
    ],
  }),
  treatment({
    slug: "spine-fracture-surgery",
    title: "Spine fracture surgery",
    summary:
      "Surgery for a spine fracture stabilizes a broken vertebra, and sometimes decompresses the spinal cord or nerves. It is injury care, decided in a hospital, not an elective product.",
    seoTitle: "Spine fracture surgery",
    seoDescription: "How fracture surgery differs from elective fusion, and why urgent injuries do not belong on a contact form.",
    relatedSlugs: ["neck-fractures", "spinal-fusion"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Fractures range from stable compression injuries in weakened bone to unstable breaks that threaten the cord. Some heal in a brace. Some need screws, rods, or cement augmentation. Neck fractures are discussed on their own page because the stakes and the anatomy differ.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The operation, when it is needed, is for instability, significant deformity, or pressure on the cord or nerves. Pain after a minor strain is not a fracture operation.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "After a fall from height, a collision, or any injury with neck or back pain plus neurological symptoms, call 911. Do not travel by private car if the spine may be unstable. A later clinic visit is for follow-up, not for the emergency.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "CT defines the bone. MRI defines ligaments and the cord. The classification of the fracture drives the plan. This practice has not confirmed fracture coverage.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Brace treatment, cement stabilization for selected osteoporotic fractures, and instrumented fusion are different tools. The choice is made by the team that can see the imaging and the patient.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Bone healing is measured in months. Bracing, walking limits, and the treatment of osteoporosis, if that was the cause, are part of follow-up. None of those instructions can be safely generic.",
      },
    ],
    faqs: [
      {
        question: "Is a compression fracture always operated on?",
        answer: "No. Many are treated with a brace and bone-health care. Surgery or cement is for selected fractures.",
      },
      {
        question: "Where should I go tonight if I just fell?",
        answer: "If a spine injury is possible, go to emergency care or call 911. Do not use this form.",
      },
    ],
  }),
  treatment({
    slug: "spinal-tumor-surgery",
    title: "Spinal tumor surgery",
    summary:
      "Surgery for a spinal tumor removes pressure on the cord or nerves and, when needed, stabilizes the spine. It is specialized care and is not listed as a service of this practice.",
    seoTitle: "Spinal tumor surgery",
    seoDescription: "A cautious explanation of spinal tumor surgery. This draft is not a published offer of care.",
    relatedSlugs: ["spine-tumors"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Operations may decompress the cord, remove a tumor that can be separated from the cord, or stabilize a vertebra that cancer has weakened. The tumor type decides whether surgery, radiation, or medicine leads. This draft is educational only.",
      },
      {
        id: "symptoms",
        heading: "What the procedure is for",
        body: "The usual surgical reasons are cord or nerve compression, spinal instability, or a need for a diagnosis when a biopsy cannot be obtained another way. Night pain and a history of cancer are reasons to be evaluated. They are not a reason to request an operation online.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New weakness, inability to walk, or loss of bowel or bladder control is an emergency. Call 911. A known cancer with new spine pain should be directed to the treating oncology team the same day, not to a general website form.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "MRI, CT, and staging studies come before a surgical plan. A biopsy is often required. Several specialties usually share the decision.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Radiation, chemotherapy or other systemic treatment, bracing, and surgery are combined differently for metastases than for benign tumors. This practice has not confirmed tumor surgery.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Recovery is planned around both the operation and the cancer treatment, when cancer is the diagnosis. Neurological recovery is uncertain. No public page should imply otherwise.",
      },
    ],
    faqs: [
      {
        question: "Is this service available?",
        answer: "It is not published as available. The page stays in draft until the practice confirms the scope of care.",
      },
      {
        question: "Should I send imaging through the contact form?",
        answer: "No. Imaging and records do not belong on this website.",
      },
    ],
  }),
];
