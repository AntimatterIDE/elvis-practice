import type { ClinicalDocument } from "@/lib/content/schema";

const draft = {
  offeringStatus: "unconfirmed",
  reviewStatus: "draft",
  publishedAt: null,
} as const;

function condition(
  document: Omit<ClinicalDocument, "kind" | "offeringStatus" | "reviewStatus" | "publishedAt">,
): ClinicalDocument {
  return { kind: "condition", ...draft, ...document };
}

export const conditions: ClinicalDocument[] = [
  condition({
    slug: "neck-pain",
    title: "Neck pain",
    summary:
      "Neck pain is a common reason for a spine visit. The cause may be muscular, joint-related, or from a disc or nerve, and the first step is a careful history and examination.",
    seoTitle: "Neck pain",
    seoDescription:
      "A plain-language overview of neck pain, when to seek care, and how a spine visit approaches it.",
    relatedSlugs: ["cervical-myelopathy", "herniated-disc"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Neck pain can stay local, or it can travel toward the shoulder, arm, or hand. Many episodes improve with time and straightforward care. Some need a closer look because strength, balance, or hand coordination has changed.\n\nThis page is general education. It is not a diagnosis, and it does not say that an operation is the right next step.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "People describe stiffness, a deep ache, headaches at the base of the skull, or pain that follows a nerve into the arm. Numbness, tingling, or a change in grip can matter as much as the pain itself.\n\nSymptoms that begin after a fall, a collision, or another serious injury need urgent in-person care rather than a website.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Schedule a visit if pain is lasting, keeps you from sleep or work, or comes with arm symptoms. Seek emergency care now for sudden weakness, trouble walking, loss of bowel or bladder control, fever with severe pain, or pain after a major injury.\n\nA webpage cannot tell you which of those situations you are in.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "A visit starts with your story: where it hurts, what makes it better or worse, and what you have already tried. The examination looks at movement, strength, sensation, and reflexes.\n\nImaging is useful when the result would change the plan. It is not automatic for every new ache.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Depending on the findings, a plan may include activity changes, physical therapy, medicine managed by the appropriate clinician, or injections. Surgery is considered when nerve or spinal cord compression is significant, or when simpler care has not helped and the anatomy explains the symptoms.\n\nWhether any of those options is offered at this practice is still unconfirmed.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Recovery depends on the cause and on the path you choose. Many people improve without an operation. If surgery is discussed, the timing, restrictions, and follow-up are part of that conversation, not a promise posted here.",
      },
    ],
    faqs: [
      {
        question: "Does neck pain mean I need surgery?",
        answer: "No. Most neck pain is not treated with an operation. Surgery is a discussion only when the examination and imaging support it.",
      },
      {
        question: "Should I get an MRI before the visit?",
        answer: "Not usually, unless another clinician has already recommended one. The visit can decide whether imaging would change the plan.",
      },
    ],
  }),
  condition({
    slug: "low-back-pain",
    title: "Low back pain",
    summary:
      "Low back pain is one of the most common reasons people seek care. Most episodes are not dangerous, and a visit is about finding the pattern rather than jumping to a procedure.",
    seoTitle: "Low back pain",
    seoDescription: "How low back pain is described, evaluated, and discussed, without promising a specific treatment.",
    relatedSlugs: ["sciatica", "herniated-disc", "spinal-stenosis"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Low back pain may come from muscles, joints, discs, or from irritation of a nerve. It can be brief after an ordinary strain, or it can linger and limit walking, sitting, or sleep.\n\nThe useful question is not only how long it has lasted, but whether the legs, strength, or bladder and bowel function have changed.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Pain may sit in the lower back, the buttock, or travel below the knee. Stiffness in the morning, pain with bending, or relief when you change position are common descriptions.\n\nLeg weakness, numbness in the groin, or a new problem with bladder or bowel control is a different level of urgency.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "A planned visit is reasonable when pain is persisting, returning, or interfering with daily life. Emergency care is the right path for sudden weakness, saddle numbness, loss of bowel or bladder control, fever with severe pain, or pain after serious trauma.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The physician listens for the pattern, examines the back and the nerves to the legs, and decides whether imaging or other tests would help. A picture of a worn disc, by itself, does not explain every backache.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Plans often start with movement, therapy, and time. Medicines, injections, and surgery are considered for specific problems, not for back pain as a single diagnosis. This practice has not yet confirmed which of those services it provides.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Many people improve over weeks. If symptoms continue, the next step is a clearer diagnosis rather than a larger procedure by default. Any recovery timeline is individual and is not guaranteed.",
      },
    ],
    faqs: [
      {
        question: "Is low back pain the same as sciatica?",
        answer: "No. Sciatica is a pattern of nerve pain into the leg. Low back pain can exist without it.",
      },
      {
        question: "Should I stay in bed?",
        answer: "Prolonged bed rest is usually not helpful. A clinician can help you judge which movements are reasonable.",
      },
    ],
  }),
  condition({
    slug: "sciatica",
    title: "Sciatica",
    summary:
      "Sciatica is pain, and sometimes numbness or weakness, that follows the sciatic nerve from the low back into the buttock and leg.",
    seoTitle: "Sciatica",
    seoDescription: "A patient-facing explanation of sciatica, warning signs, and how it is evaluated.",
    relatedSlugs: ["low-back-pain", "herniated-disc"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "The sciatic nerve is formed from nerve roots in the lower spine. When one of those roots is irritated, people feel pain that travels rather than staying in the back. A disc herniation is a common cause. It is not the only one.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Pain may burn or shoot below the knee. The leg can tingle or feel weak. Coughing or sitting may worsen it. The back itself is sometimes the quieter part of the picture.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Worsening weakness, pain that is unbearable, or any change in bowel or bladder control needs prompt in-person care. Call 911 for sudden severe weakness or loss of bowel or bladder control. A routine visit is appropriate when leg pain is stable but not settling.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The examination maps which nerve root may be involved. Imaging, often an MRI, is considered when symptoms are significant, lasting, or when a procedure is being discussed.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Many cases ease with time, activity changes, and therapy. Injections are sometimes used to calm nerve inflammation. An operation such as a microdiscectomy is discussed when a disc fragment is clearly pressing on a nerve and simpler care is not enough. Offering status for those procedures is not confirmed on this site.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Nerve pain can fade slowly even after the pressure is gone. Numbness in particular may linger. No page can promise how fast an individual nerve will recover.",
      },
    ],
    faqs: [
      {
        question: "Is sciatica always a herniated disc?",
        answer: "No. Narrowing of the spinal canal, joint cysts, and other problems can irritate the same nerves.",
      },
      {
        question: "Can I wait?",
        answer: "Stable pain without weakness is often observed. New or worsening weakness should not wait on a website.",
      },
    ],
  }),
  condition({
    slug: "herniated-disc",
    title: "Herniated disc",
    summary:
      "A herniated disc happens when the softer center of a spinal disc pushes through a weak spot in the outer ring and may press on a nearby nerve.",
    seoTitle: "Herniated disc",
    seoDescription: "What a herniated disc is, how it is evaluated, and why surgery is not automatic.",
    relatedSlugs: ["sciatica", "neck-pain", "low-back-pain"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Discs sit between the vertebrae and act as cushions. A herniation in the neck can affect an arm. A herniation in the low back can affect a leg. Many herniations shrink over time and do not need an operation.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "The familiar pattern is nerve pain, numbness, or weakness in one limb, sometimes with back or neck pain as well. A disc problem seen on a scan does not always match the symptoms, which is why the examination matters.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Seek prompt care for progressive weakness or problems with bowel or bladder control. Otherwise, a visit is appropriate when limb pain is not improving or is disrupting sleep and work.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "History and examination come first. MRI is the usual study when a disc herniation needs to be confirmed. The image is read against your symptoms, not instead of them.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Observation, therapy, and medicines are common. An injection may be considered for nerve inflammation. Surgery removes the fragment that is pressing on the nerve when that pressure explains a significant problem. This site does not yet state which operations the practice performs.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Leg or arm pain often improves faster than numbness. Activity restrictions, if any, depend on whether you have had surgery and on the specific operation. Those instructions come from the treating clinician.",
      },
    ],
    faqs: [
      {
        question: "Is a herniated disc the same as a bulging disc?",
        answer: "Not exactly. A bulge is a broader change in the disc. A herniation is a more focal break in the outer ring. The words are sometimes used loosely on reports.",
      },
      {
        question: "Will the disc go back into place on its own?",
        answer: "Some herniations shrink and symptoms fade. That is a possibility, not a promise, and it is not a reason to ignore weakness.",
      },
    ],
  }),
  condition({
    slug: "spinal-stenosis",
    title: "Spinal stenosis",
    summary:
      "Spinal stenosis means the canal or the openings for the nerves have become narrow, usually from arthritis, thickened ligaments, or disc changes.",
    seoTitle: "Spinal stenosis",
    seoDescription: "A clear explanation of spinal stenosis, including walking symptoms and how treatment decisions are made.",
    relatedSlugs: ["low-back-pain", "cervical-myelopathy"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Narrowing in the low back often shows up as leg pain or heaviness with walking that eases when you sit or lean forward. Narrowing in the neck can affect the spinal cord and is a different condition, discussed separately as cervical myelopathy.\n\nStenosis is common with age. The scan finding alone does not decide treatment.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "People may describe a limited walking distance, heaviness in the thighs, or tingling in the feet. Neck stenosis that compresses the cord can cause hand clumsiness, imbalance, or trouble with fine tasks.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "A visit is appropriate when walking tolerance is falling or balance is changing. Emergency care is needed for sudden weakness, loss of bowel or bladder control, or a serious injury. Fever with severe pain also needs urgent evaluation.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The examination looks at gait, strength, and reflexes. MRI shows the degree of narrowing. Standing X-rays may show alignment. The decision uses all three, not the radiology report alone.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Activity changes, therapy, and medicines help some people. Injections may ease leg symptoms for a time. If walking is clearly limited and the canal is tight, a decompression operation is sometimes discussed. Fusion is a separate question and is not automatic. None of these procedures are confirmed as offered here.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "If symptoms are stable, watching them is reasonable. If an operation is chosen later, recovery depends on whether bone is removed only, or whether the spine is also stabilized. This page cannot assign you a timeline.",
      },
    ],
    faqs: [
      {
        question: "Is stenosis the same as a herniated disc?",
        answer: "No. A herniation is a disc fragment. Stenosis is narrowing, often from several age-related changes at once.",
      },
      {
        question: "Does everyone with stenosis on an MRI need surgery?",
        answer: "No. Many people have narrowing on a scan and modest symptoms. Treatment follows the person, not the picture.",
      },
    ],
  }),
  condition({
    slug: "cervical-myelopathy",
    title: "Cervical myelopathy",
    summary:
      "Cervical myelopathy is injury to the spinal cord in the neck from compression, most often from stenosis. It is a problem of cord function, not only of neck pain.",
    seoTitle: "Cervical myelopathy",
    seoDescription: "What cervical myelopathy means, which symptoms matter, and why it needs clinician review.",
    relatedSlugs: ["neck-pain", "spinal-stenosis"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "When the canal in the neck is too narrow, the spinal cord can be compressed. People may notice clumsy hands, trouble with buttons, imbalance, or a change in the way they walk. Neck pain may be mild or absent.\n\nThis is a higher-acuity topic. The explanation here is educational and has not been approved as a service listing.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Hand weakness, dropping objects, numbness in the hands, stiffness in the legs, and imbalance are typical. Some people feel an electric sensation down the spine when they bend the neck. Bowel or bladder changes can occur and need urgent attention.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New trouble walking, rapidly worsening hand function, or any bowel or bladder change should be assessed promptly. Call 911 for sudden paralysis, a serious injury, or loss of bowel or bladder control. Do not use this website to decide whether your symptoms are myelopathy.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The examination includes gait, hand coordination, reflexes, and strength. MRI of the cervical spine shows whether the cord is compressed. Other studies are sometimes used when the diagnosis is uncertain.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Because the concern is ongoing pressure on the cord, surgery is often discussed once myelopathy is established. The approach depends on where the compression sits and on the alignment of the neck. Non-operative care does not reliably remove cord compression. This practice has not confirmed that it offers cervical surgery.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "The goal of surgery, when it is chosen, is usually to stop worsening rather than to guarantee a full return of function. Recovery of balance and hand dexterity varies. A clinician who has examined you has to set expectations.",
      },
    ],
    faqs: [
      {
        question: "Is cervical myelopathy just neck arthritis?",
        answer: "Arthritis can cause the narrowing, but myelopathy means the cord itself is affected. That distinction changes the urgency.",
      },
      {
        question: "Can therapy fix spinal cord compression?",
        answer: "Therapy may help stiffness and walking confidence. It does not open a canal that is pinching the cord.",
      },
    ],
  }),
  condition({
    slug: "spondylolisthesis",
    title: "Spondylolisthesis",
    summary:
      "Spondylolisthesis means one vertebra has slipped forward, or less often backward, relative to the one below it.",
    seoTitle: "Spondylolisthesis",
    seoDescription: "A plain-language description of a slipped vertebra, symptoms, and how treatment is chosen.",
    relatedSlugs: ["low-back-pain", "spinal-stenosis"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "A slip can follow a stress fracture in a growing spine, or it can develop later as discs and joints wear. The amount of slip on an X-ray does not, by itself, tell you whether you need surgery.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Some people have back pain, tightness in the hamstrings, or nerve pain in the legs. Others have a slip that was found on imaging and few symptoms at all.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "A visit is reasonable for persistent back or leg pain, or when a known slip is changing how far you can walk. Emergency care applies to sudden weakness, bowel or bladder changes, fever with severe pain, or a major injury.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "Standing X-rays show alignment and whether the slip moves between bending and straightening. MRI shows the nerves. The two studies answer different questions.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Therapy and activity changes help many people. If a nerve is compressed or the slip is unstable and symptoms are significant, surgery to decompress the nerve and sometimes to fuse the level may be discussed. Those operations are not listed as offered until the practice confirms them.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Observation includes repeating X-rays if symptoms change. After a fusion, if one is ever recommended, bone has to heal and restrictions are specific to that operation. This page does not set those rules.",
      },
    ],
    faqs: [
      {
        question: "Is a slipped vertebra the same as a slipped disc?",
        answer: "No. A slipped disc usually means a herniation. Spondylolisthesis is movement between the bones.",
      },
      {
        question: "Does every slip need a fusion?",
        answer: "No. Many slips are watched. Fusion is a specific recommendation, not a label on the X-ray.",
      },
    ],
  }),
  condition({
    slug: "pain-after-spine-surgery",
    title: "Pain after spine surgery",
    summary:
      "Pain that continues or returns after a spine operation has many possible explanations. It deserves a fresh evaluation, not a single label.",
    seoTitle: "Pain after spine surgery",
    seoDescription: "Why ongoing pain after spine surgery needs a new assessment, and what that visit is trying to sort out.",
    relatedSlugs: ["low-back-pain", "herniated-disc"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "An operation can fail to relieve pain, pain can return years later, or a new problem can appear next to an older fusion. Scar tissue, a recurrent disc fragment, a problem at a neighboring level, infection, or a goal that was never realistic can all be part of the story.\n\nOlder websites sometimes file this under a syndrome name and imply one surgeon’s specialty. This page does not do that.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "People report back or neck pain, limb pain, or both. The important details are what the first operation was meant to fix, which symptoms improved, and which never did. Wound redness, drainage, or fever is a separate and urgent concern.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "Contact the operating surgeon promptly for wound problems, fever, or new weakness after a recent operation. Call 911 for sudden severe weakness, loss of bowel or bladder control, or a serious new injury. A second-opinion visit is appropriate when pain persists and the original team has completed early recovery.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "The new physician needs the old notes, the operation report, and the imaging from before and after surgery if you can obtain them. Do not send those records through this website. Examination and updated imaging come next, chosen to answer a specific question.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Another operation is not the default. Therapy, medicines, and injections are sometimes the better plan. Revision surgery is considered when there is a clear structural problem that an operation can change. This practice has not confirmed that it offers revision surgery.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Expectations should be set from the actual findings. Relief of nerve pressure is a different goal from removal of long-standing back pain. No honest clinician guarantees either.",
      },
    ],
    faqs: [
      {
        question: "Does ongoing pain mean the first surgery was done incorrectly?",
        answer: "Not necessarily. Spines change, some pain is not mechanical, and some operations have a limited target. The records and a new examination sort that out.",
      },
      {
        question: "Should I bring my imaging?",
        answer: "Yes, to the visit. Do not upload discs or reports on this contact form.",
      },
    ],
  }),
  condition({
    slug: "neck-fractures",
    title: "Neck fractures",
    summary:
      "A neck fracture is a break in one of the cervical vertebrae. It is an injury, not an elective procedure, and it needs in-person urgent assessment.",
    seoTitle: "Neck fractures",
    seoDescription: "Why neck fractures are an urgent clinical problem and how they are generally evaluated.",
    relatedSlugs: ["neck-pain"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Fractures in the neck can follow a fall, a collision, or another high-energy event. Some are stable. Some threaten the spinal cord. This page is not a guide for treating an injury at home, and the practice has not confirmed that it provides fracture care.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Neck pain after trauma, pain with movement, numbness, weakness, or a sense that the head is not supported are warning signs. The absence of dramatic symptoms does not rule out a fracture.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "After a serious injury, call 911. Do not use a contact form. Emergency clinicians immobilize the neck and obtain imaging. A later spine visit, if needed, happens after that emergency assessment.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "CT scanning shows bone detail. MRI is added when ligaments or the spinal cord may be involved. The pattern of the fracture determines whether a brace, halo, or operation is considered.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Stable injuries are sometimes treated in a brace. Unstable injuries, or those with cord or nerve pressure, may need surgery to realign and stabilize the spine. Those decisions are made in a hospital setting by the team caring for the injury.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Bone healing takes weeks to months. Restrictions on lifting, driving, and collar wear are specific to the fracture. They are not published here because they would be unsafe as general advice.",
      },
    ],
    faqs: [
      {
        question: "Can I wait for a clinic appointment after a crash?",
        answer: "No, not if there is any concern for a neck injury. Start with emergency care.",
      },
      {
        question: "Is this the same as a spine fracture lower down?",
        answer: "No. The neck protects the spinal cord in a different way. The evaluation is not interchangeable with a low-back strain.",
      },
    ],
  }),
  condition({
    slug: "spine-tumors",
    title: "Spine tumors",
    summary:
      "A spine tumor is an abnormal growth in or around a vertebra or the spinal cord. Some are benign. Some are cancers that started elsewhere.",
    seoTitle: "Spine tumors",
    seoDescription: "A cautious overview of spine tumors and why this page is not a service listing.",
    relatedSlugs: ["neck-pain", "low-back-pain"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        body: "Tumors in the spine are uncommon compared with ordinary back and neck pain. They can start in the bone, in the lining around the cord, or as a spread from another cancer. This draft exists so the topic is not confused with routine arthritis. It is not a statement that this practice treats tumors.",
      },
      {
        id: "symptoms",
        heading: "Symptoms",
        body: "Pain that is relentless, worse at night, or accompanied by unexplained weight loss, a known cancer, fever, or progressive weakness needs medical attention. Most back pain does not have those features.",
      },
      {
        id: "seek-care",
        heading: "When to seek care",
        body: "New weakness, trouble walking, or loss of bowel or bladder control is an emergency. Call 911. A known diagnosis of cancer with new spine pain should be discussed promptly with the oncology team and a spine clinician, not through this website.",
      },
      {
        id: "evaluation",
        heading: "Evaluation",
        body: "MRI is the usual study. CT, labs, and a search for a source elsewhere in the body are often part of the workup. A biopsy is sometimes required before treatment. That sequence is individualized.",
      },
      {
        id: "options",
        heading: "Potential options",
        body: "Observation, radiation, medicines, and surgery each have a role depending on the tumor type, the stability of the spine, and whether the cord is compressed. Naming those options here is education, not an offer of tumor surgery.",
      },
      {
        id: "recovery",
        heading: "Recovery and next steps",
        body: "Follow-up is usually shared among spine surgery, oncology, and radiation teams when cancer is involved. This practice has not published a tumor program.",
      },
    ],
    faqs: [
      {
        question: "Does back pain mean I might have a tumor?",
        answer: "Almost always, no. Tumors are an uncommon explanation. Red-flag symptoms are the reason to look harder.",
      },
      {
        question: "Is this page a referral for tumor surgery?",
        answer: "No. The practice has not confirmed that it evaluates or treats spine tumors.",
      },
    ],
  }),
];
