import type { JournalDraftCopy } from "@/lib/journal/draft-json";
import type { JournalPaper } from "@/lib/journal/papers";

export type ReferenceNote = {
  copy: JournalDraftCopy;
  papers: JournalPaper[];
};

function paper(pmid: string, title: string, journal: string, year: string): JournalPaper {
  return { pmid, title, journal, year, authors: "", abstract: "Cited in this note.", doi: null };
}

const close = "This note is general information and is not a personal treatment plan.";

export const referenceNotes: ReferenceNote[] = [
  {
    copy: {
      title: "Sciatica: leg pain that starts in the lumbar spine",
      summary:
        "Sciatica is nerve pain that travels from the low back into the buttock and leg. The Alignment Clinic explains what the major studies found, and why an examination still comes before any decision about surgery.",
      seoTitle: "Sciatica and lumbar nerve pain",
      seoDescription:
        "What sciatica is, what lumbar disc research has shown, and how a visit sorts nerve pain from other causes of leg pain.",
      body: `**The Alignment Clinic and this problem**
Sciatica is pain, and sometimes numbness or weakness, that follows a lumbar nerve root into the leg. A disc herniation is a common reason. Narrowing around the nerve can do the same thing. The back itself is sometimes the quieter part of the picture. People often arrive after weeks of sitting pain, a cough that shoots into the calf, or a leg that feels unreliable on the stairs.

**What the researchers studied**
A 1990 study in The Journal of Bone and Joint Surgery looked at lumbar MRI scans in adults who had no back pain. A 2006 paper in JAMA, the Spine Patient Outcomes Research Trial, compared surgery with nonoperative care for a lumbar disc herniation that was causing symptoms. A 2008 paper in Spine followed that same question out to four years.

**What they found**
The 1990 imaging study showed that a lumbar scan can look abnormal in people who feel well. A picture of a disc, by itself, does not prove the cause of leg pain. In the disc herniation trial, people improved with surgery and with nonoperative care. The early advantage of surgery was most noticeable for leg pain, and it narrowed as time passed. That is a reason to match the scan to the examination, not a reason to rush or to wait forever.

**How The Alignment Clinic approaches this**
The visit starts with the path of the pain. Which toes are numb, which muscle is weak, and what makes the pain travel all point toward a particular nerve. An MRI is useful when the symptoms are lasting, significant, or when an operation is being discussed. Many people improve with time, activity, and therapy. An operation such as a microdiscectomy is a conversation when a disc fragment and the examination agree, and simpler care has not been enough.

**What a visit can clarify**
A visit can tell whether the pain is sciatica, a hip problem, or something else that only feels similar. It can also decide whether imaging would change the plan. ${close}`,
    },
    papers: [
      paper("2312537", "Abnormal magnetic-resonance scans of the lumbar spine in asymptomatic subjects", "J Bone Joint Surg Am", "1990"),
      paper("17119140", "Surgical vs nonoperative treatment for lumbar disk herniation: the Spine Patient Outcomes Research Trial", "JAMA", "2006"),
      paper("19018250", "Surgical versus nonoperative treatment for lumbar disc herniation: four-year results", "Spine", "2008"),
    ],
  },
  {
    copy: {
      title: "Lumbar disc herniation, in plain language",
      summary:
        "A herniated lumbar disc can press on a nerve and send pain down the leg. The Alignment Clinic reviews what controlled studies have shown about waiting, and about surgery, without turning a scan into a verdict.",
      seoTitle: "Lumbar disc herniation explained",
      seoDescription:
        "How a lumbar disc herniation causes leg pain, what the SPORT trial found, and when surgery becomes part of the conversation.",
      body: `**The Alignment Clinic and this problem**
Discs sit between the vertebrae and cushion the low back. A herniation is a focal break in the outer ring, so the softer center can press on a nearby nerve. The familiar result is pain, numbness, or weakness in one leg. Many herniations shrink and never need an operation. A report that says herniation is a finding, not a plan.

**What the researchers studied**
A controlled study published in Spine in 1983 followed people with lumbar disc herniation for ten years. The Spine Patient Outcomes Research Trial, published in JAMA in 2006 and in Spine in 2008, compared surgery with nonoperative care for herniation with radiculopathy. A 2014 evidence-based guideline in The Spine Journal gathered the diagnosis and treatment research for lumbar disc herniation with nerve pain.

**What they found**
Longer observation has shown that a share of herniations quiet down. The randomized trial found improvement in both the surgery group and the nonoperative group, with a faster easing of leg symptoms after surgery for many people. The guideline treats the combination of symptoms, examination, and imaging as the basis for a recommendation. None of those papers say that every herniation on an MRI should be removed.

**How The Alignment Clinic approaches this**
History and examination come first. MRI confirms the fragment when the story is significant or when a procedure is on the table. Observation, therapy, and time are reasonable when strength is stable. Surgery takes the pressure off the nerve when that pressure explains a real problem and simpler care is not the better plan. Numbness can linger after the pain fades. That is common, and it is not a personal prediction.

**What a visit can clarify**
A visit separates a bothersome scan from a nerve that is under pressure. It is also where the choice between waiting and operating can be made with the actual images in hand. ${close}`,
    },
    papers: [
      paper("6857385", "Lumbar disc herniation. A controlled, prospective study with ten years of observation", "Spine", "1983"),
      paper("17119140", "Surgical vs nonoperative treatment for lumbar disk herniation: the Spine Patient Outcomes Research Trial", "JAMA", "2006"),
      paper("24239490", "An evidence-based clinical guideline for the diagnosis and treatment of lumbar disc herniation with radiculopathy", "Spine J", "2014"),
    ],
  },
  {
    copy: {
      title: "Cervical myelopathy: pressure on the spinal cord",
      summary:
        "Cervical myelopathy is compression of the spinal cord in the neck, often from disc and arthritic narrowing. The Alignment Clinic explains how it differs from a pinched nerve, and why the examination matters.",
      seoTitle: "Cervical myelopathy explained",
      seoDescription:
        "What degenerative cervical myelopathy is, how researchers describe it, and what a neck visit is meant to sort out.",
      body: `**The Alignment Clinic and this problem**
A pinched nerve in the neck usually sends pain or weakness into one arm. Myelopathy is different. The spinal cord itself is crowded, often by a disc, a bone spur, or a thickened ligament. People may notice clumsy hands, unsteady walking, or a heavy feeling in the legs. Neck pain can be mild or absent, which is why the problem is sometimes missed.

**What the researchers studied**
A 2015 review in Spine described the epidemiology and development of degenerative cervical myelopathy. A 2013 paper in Spine looked at how alignment of the neck is measured when the cord is compressed. A 2017 clinical practice guideline in Global Spine Journal brought together recommendations for people with this diagnosis.

**What they found**
The research treats myelopathy as a problem of cord function, not only of neck pain. Alignment of the cervical spine is part of the picture because the shape of the neck changes how the cord sits. The guideline discusses surgery for moderate and severe myelopathy, while milder cases are followed closely. The papers do not offer a single operation for every person.

**How The Alignment Clinic approaches this**
The examination looks for cord findings: balance, hand coordination, and reflexes. MRI shows where the cord is pinched. X-rays of alignment are often added before any talk of an operation from the front or the back of the neck. Some people are watched. Others are offered a decompression, with or without a fusion, when the cord findings and the images agree.

**What a visit can clarify**
A visit can tell a pinched nerve from cord compression, which are easy to mix up from a symptom list. It can also decide how closely the neck needs to be followed. ${close}`,
    },
    papers: [
      paper("25839387", "Degenerative Cervical Myelopathy: Epidemiology, Genetics, and Pathogenesis", "Spine", "2015"),
      paper("24113358", "Cervical radiographical alignment: comprehensive assessment techniques and potential importance in cervical myelopathy", "Spine", "2013"),
      paper("29164035", "A Clinical Practice Guideline for the Management of Patients With Degenerative Cervical Myelopathy", "Global Spine J", "2017"),
    ],
  },
  {
    copy: {
      title: "Degenerative spondylolisthesis in the low back",
      summary:
        "Degenerative spondylolisthesis is a slip of one lumbar vertebra on the one below it, usually with arthritis and stenosis. The Alignment Clinic reviews the trials that compared surgery with nonoperative care.",
      seoTitle: "Degenerative spondylolisthesis",
      seoDescription:
        "What a degenerative slip in the lumbar spine means, what the SPORT trials found, and how a visit reads the images.",
      body: `**The Alignment Clinic and this problem**
In degenerative spondylolisthesis, one lumbar vertebra shifts forward on the next as the disc and the small joints wear. The slip often narrows the canal, so people describe heaviness or pain in the legs after they walk, and relief when they sit or lean on a cart. Back ache may be there too. The slip on an X-ray is only part of the story.

**What the researchers studied**
The New England Journal of Medicine published a 2007 comparison of surgery and nonoperative care for lumbar degenerative spondylolisthesis, from the Spine Patient Outcomes Research Trial. The Journal of Bone and Joint Surgery published the four-year results in 2009. A 2017 review in the Journal of Orthopaedic Translation looked at how common the slip is, including differences by age.

**What they found**
The trial found that people who had surgery reported better pain and function over the years of follow-up than people who stayed with nonoperative care, with the usual caution that some people changed treatments along the way. The epidemiology review describes the slip as a condition of aging joints, not a rare injury. Neither paper says that every slip needs a fusion. The decision depends on symptoms, stenosis, and whether the vertebra moves.

**How The Alignment Clinic approaches this**
Standing X-rays show the slip and whether it moves. MRI shows the nerves. If walking is limited and the images match, decompression is discussed, and fusion is added when the slip is unstable or the decompression would leave the level loose. If symptoms are mild, observation and therapy remain reasonable.

**What a visit can clarify**
A visit can tell a stable ache from a slip that is limiting walking, and whether fusion would add something a decompression alone would not. ${close}`,
    },
    papers: [
      paper("17538085", "Surgical versus nonsurgical treatment for lumbar degenerative spondylolisthesis", "N Engl J Med", "2007"),
      paper("19487505", "Surgical compared with nonoperative treatment for lumbar degenerative spondylolisthesis. Four-year results", "J Bone Joint Surg Am", "2009"),
      paper("29662768", "Lumbar degenerative spondylolisthesis epidemiology: a systematic review", "J Orthop Translat", "2017"),
    ],
  },
  {
    copy: {
      title: "Anterior cervical discectomy and fusion, explained",
      summary:
        "Anterior cervical discectomy and fusion removes a damaged disc from the front of the neck and lets the vertebrae join. The Alignment Clinic explains who the research studied, and what recovery questions are fair to ask.",
      seoTitle: "Anterior cervical discectomy and fusion",
      seoDescription:
        "A plain-language note on ACDF: why it is considered, what follow-up studies reported, and what a neck visit should cover.",
      body: `**The Alignment Clinic and this problem**
Anterior cervical discectomy and fusion, often called ACDF, is an operation through a small incision at the front of the neck. The disc is removed, pressure is taken off a nerve or the spinal cord, and a graft or cage is placed so the bones can fuse. A plate is often used. It is one option for a cervical disc or bone spur when symptoms and imaging agree. It is not the first step for every sore neck.

**What the researchers studied**
A 1993 paper in The Journal of Bone and Joint Surgery followed people for years after the Robinson anterior cervical operation for cervical radiculopathy. A 2007 review in Spine gathered the complications associated with anterior cervical discectomy and fusion. A 2013 paper in the Journal of Neurosurgery: Spine looked at how much change in pain and function counts as meaningful after the operation.

**What they found**
The long follow-up showed that many people with a pinched nerve in the neck did well after fusion from the front. The complications review is a reminder that swallowing discomfort, hoarseness, and problems at other levels are part of the counseling, even though serious events are uncommon. The 2013 paper helps a clinic talk about results in human terms: a small change on a form is not the same as a change a person can feel.

**How The Alignment Clinic approaches this**
Examination, MRI, and alignment X-rays come before any recommendation. Swallowing, voice, and bone quality are part of the conversation because the approach is from the front. Therapy and time are reasonable for many pinched nerves. A disc replacement or an operation from the back of the neck may fit someone else. The choice is made in person.

**What a visit can clarify**
A visit can say whether arm pain is a nerve that might be helped by ACDF, or a neck ache that should not be fused. It is also where the tradeoffs of a fusion are explained for that person's levels. ${close}`,
    },
    papers: [
      paper("8408151", "Robinson anterior cervical discectomy and arthrodesis for cervical radiculopathy", "J Bone Joint Surg Am", "1993"),
      paper("17906571", "Anterior cervical discectomy and fusion associated complications", "Spine", "2007"),
      paper("23176164", "Assessment of the minimum clinically important difference after anterior cervical discectomy and fusion", "J Neurosurg Spine", "2013"),
    ],
  },
  {
    copy: {
      title: "Lumbar microdiscectomy: taking pressure off one nerve",
      summary:
        "A lumbar microdiscectomy removes the piece of disc that is pressing on a nerve. The Alignment Clinic explains what comparison studies have looked at, and what the operation does not try to do.",
      seoTitle: "Lumbar microdiscectomy explained",
      seoDescription:
        "What a lumbar microdiscectomy treats, how studies have compared techniques, and which questions belong in a visit.",
      body: `**The Alignment Clinic and this problem**
Microdiscectomy is a focused operation for a lumbar disc herniation that is pressing on a nerve. Through a small opening, the fragment is removed so the nerve is free. The goal is relief of leg pain. It is not an operation for ordinary back ache, and it does not rebuild a worn disc. People are usually considered for it when leg pain, weakness, or both have not settled and the MRI matches the examination.

**What the researchers studied**
A 1999 randomized study in The Journal of Bone and Joint Surgery compared open discectomy with a video-assisted microdiscectomy. A 2002 paper in the Journal of Neurosurgery looked at results of outpatient lumbar microdiscectomy. A 2016 meta-analysis in the International Journal of Surgery compared percutaneous endoscopic discectomy with open lumbar microdiscectomy.

**What they found**
The comparison studies spend their attention on leg pain from a single herniation, not on every kind of back pain. Outpatient surgery has been studied for selected people, which means the medical details of the person still decide the setting. Endoscopic and open techniques both aim to free the nerve. The papers do not crown one method for every herniation. The fragment, the location, and the surgeon's judgment matter more than the brand name of the approach.

**How The Alignment Clinic approaches this**
The examination has to point to the same nerve the MRI shows. If strength is stable and the pain is early, waiting is often reasonable, because many herniations quiet down. If the pain is persistent or the weakness is important, removing the fragment is discussed. Numbness can recover more slowly than pain. Activity after surgery is explained for that operation, not from a general list.

**What a visit can clarify**
A visit can say whether a microdiscectomy fits the pain, or whether the MRI finding is incidental. It can also set expectations for the leg, the back, and the first weeks at home. ${close}`,
    },
    papers: [
      paper("10428127", "A prospective, randomized study comparing open discectomy with video-assisted arthroscopic microdiscectomy", "J Bone Joint Surg Am", "1999"),
      paper("11795712", "Prospective multiple outcomes study of outpatient lumbar microdiscectomy", "J Neurosurg", "2002"),
      paper("27260312", "Comparison of percutaneous endoscopic lumbar discectomy versus open lumbar microdiscectomy", "Int J Surg", "2016"),
    ],
  },
  {
    copy: {
      title: "Laminectomy for lumbar spinal stenosis",
      summary:
        "A laminectomy opens room for nerves that have been crowded by lumbar stenosis. The Alignment Clinic explains the trials that asked when fusion should be added, and when decompression is enough.",
      seoTitle: "Laminectomy for lumbar stenosis",
      seoDescription:
        "How laminectomy relieves lumbar stenosis, what a major trial found about adding fusion, and how a visit makes that choice.",
      body: `**The Alignment Clinic and this problem**
Lumbar stenosis means the canal or the openings for the nerves have narrowed, usually from arthritis, thickened ligament, and disc changes. Walking brings on heaviness or pain in the legs. Sitting eases it. A laminectomy removes a small amount of bone and ligament so the nerves have room. It is a decompression. It does not, by itself, fuse the spine.

**What the researchers studied**
A 2005 paper in the Journal of Neurosurgery: Spine compared less-invasive decompression with a wider opening for lumbar stenosis. A 2014 paper in the same journal looked at results after decompressive laminectomy, including a less invasive one-sided approach. In 2016 the New England Journal of Medicine published a trial of laminectomy plus fusion versus laminectomy alone for stenosis that also had a spondylolisthesis.

**What they found**
Decompression can be done through a smaller opening in selected people, and the studies watch for whether the nerves are truly freed and whether the level stays stable. The 2016 trial studied a specific group: stenosis together with a slip. Adding fusion helped that group in that trial. Other people with stenosis and little slip are often treated with decompression alone. The research supports a choice, not one operation for every narrow canal.

**How The Alignment Clinic approaches this**
Walking limits, standing X-rays, and MRI are read together. If the nerves are crowded and the vertebrae are stable, laminectomy or a similar decompression is the usual discussion. If a vertebra slips or moves, fusion may be added so the level does not loosen after the bone is removed. Therapy and pacing still help people who are not ready for an operation, or who do not need one.

**What a visit can clarify**
A visit can tell stenosis that limits walking from ordinary back fatigue, and whether fusion would be doing useful work or extra work. ${close}`,
    },
    papers: [
      paper("16370302", "Outcome after less-invasive decompression of lumbar spinal stenosis", "J Neurosurg Spine", "2005"),
      paper("24878273", "Outcomes after decompressive laminectomy for lumbar spinal stenosis", "J Neurosurg Spine", "2014"),
      paper("27074067", "Laminectomy plus fusion versus laminectomy alone for lumbar spondylolisthesis", "N Engl J Med", "2016"),
    ],
  },
  {
    copy: {
      title: "Adult degenerative scoliosis and the low back",
      summary:
        "Adult degenerative scoliosis is a curve that develops as the lumbar spine wears. The Alignment Clinic explains how the curve, the stenosis, and the person's goals are read together.",
      seoTitle: "Adult degenerative scoliosis",
      seoDescription:
        "What adult degenerative scoliosis is, how studies connect the curve with stenosis, and what a visit should decide.",
      body: `**The Alignment Clinic and this problem**
Adult degenerative scoliosis is a side-to-side curve that appears or worsens as lumbar discs and joints wear. It is different from the curve a teenager is screened for. People may have back pain, a feeling of leaning, or the walking symptoms of stenosis where the curve pinches a nerve. The size of the curve on an X-ray does not, by itself, say that a large reconstruction is required.

**What the researchers studied**
A 2009 paper in Spine looked at how radiographic measurements line up with function in adult degenerative scoliosis. A 2011 review in the HSS Journal summarized the condition for clinicians. A 2008 paper in the Journal of Spinal Disorders and Techniques described a less invasive approach to correction and fusion for selected lumbar curves.

**What they found**
The measurement paper is a reminder that a number of degrees is not the same as a person's walking, standing, or pain. The review treats degenerative scoliosis as a mix of curve, stenosis, and balance, so the treatment has to name which of those is the problem. Less invasive fusion has been studied for selected curves. It is one technique among others, and it is not automatically gentler in its effect on the spine just because the incisions are smaller.

**How The Alignment Clinic approaches this**
Full-length standing films show the curve and the balance of the trunk. MRI shows the nerves. Some people need decompression of a single pinched nerve. Some need a limited fusion. A larger reconstruction is reserved for a curve and a balance problem that smaller surgery would not address. The person's health and goals decide how much surgery is wise.

**What a visit can clarify**
A visit can separate a curve that is visible from a curve that is causing the symptoms, and it can keep a big operation from being the default. ${close}`,
    },
    papers: [
      paper("19564768", "A correlation of radiographic and functional measurements in adult degenerative scoliosis", "Spine", "2009"),
      paper("23024623", "Degenerative scoliosis: a review", "HSS J", "2011"),
      paper("18836355", "Minimally invasive multilevel percutaneous correction and fusion for adult lumbar degenerative scoliosis", "J Spinal Disord Tech", "2008"),
    ],
  },
  {
    copy: {
      title: "Cervical radiculopathy: when neck trouble reaches the arm",
      summary:
        "Cervical radiculopathy is a pinched nerve in the neck that shows up in the shoulder, arm, or hand. The Alignment Clinic explains how common it is, and how an examination keeps the MRI honest.",
      seoTitle: "Cervical radiculopathy and arm pain",
      seoDescription:
        "How a pinched nerve in the neck causes arm pain, what population research has shown, and how a visit confirms it.",
      body: `**The Alignment Clinic and this problem**
Cervical radiculopathy means a nerve root in the neck is irritated or compressed, usually by a disc herniation or a bone spur. Pain may burn into the shoulder blade and down the arm. A finger or two can tingle. Grip can weaken. Neck pain may be present, or the arm may be the whole complaint. The pattern of the arm usually says more than the amount of neck ache.

**What the researchers studied**
A 1994 paper in Brain described the epidemiology of cervical radiculopathy in Rochester, Minnesota, over more than a decade. A 1993 paper in The Journal of Bone and Joint Surgery followed people for years after anterior cervical fusion for radiculopathy. A 2003 paper in Spine tested how reliable the clinical examination is for this diagnosis.

**What they found**
The population study shows that a pinched nerve in the neck is a recognized medical problem with a pattern clinicians can look for, not a vague label for any arm ache. The long surgical follow-up describes one path for people who do have an operation, and it is a selected group. The examination study supports using strength, sensation, and reflex testing before an image is allowed to make the diagnosis alone.

**How The Alignment Clinic approaches this**
The visit maps the nerve: which finger, which muscle, which reflex. MRI is the usual study when symptoms last or when a procedure is discussed. Many pinched nerves settle with time and therapy. An injection is sometimes used to calm the nerve. ACDF, a disc replacement, or a posterior operation is discussed when the examination and the images agree and simpler care is not enough.

**What a visit can clarify**
A visit can tell a cervical nerve from a shoulder problem, which is a common mix-up. It can also decide whether the next step is time, an image, or a conversation about surgery. ${close}`,
    },
    papers: [
      paper("8186959", "Epidemiology of cervical radiculopathy. A population-based study from Rochester, Minnesota", "Brain", "1994"),
      paper("8408151", "Robinson anterior cervical discectomy and arthrodesis for cervical radiculopathy", "J Bone Joint Surg Am", "1993"),
      paper("12544957", "Reliability and diagnostic accuracy of the clinical examination for cervical radiculopathy", "Spine", "2003"),
    ],
  },
  {
    copy: {
      title: "Life after lumbar spine surgery",
      summary:
        "Some people still have pain after a lumbar operation, and some need another one. The Alignment Clinic explains what reoperation research can and cannot say about a single person.",
      seoTitle: "After lumbar spine surgery",
      seoDescription:
        "Why symptoms can remain after lumbar surgery, what studies of reoperation have measured, and how a visit reassesses the pain.",
      body: `**The Alignment Clinic and this problem**
An operation can free a nerve and still leave a person with questions. The back may ache while the leg improves. Numbness can linger. A neighboring level can wear, or a fusion can fail to knit. Pain after spine surgery is not one diagnosis. It is a reason to look again at what was done, what the images show now, and which symptom is actually left.

**What the researchers studied**
A 2007 paper in Spine measured how often people have another operation after lumbar surgery, and how fusion changes that picture. A 1993 randomized study in Spine followed people after lumbar fusion and remains one of the early careful comparisons. A 2017 paper in The Journal of Bone and Joint Surgery described a way to judge spinopelvic alignment when a reconstruction is being considered, because alignment is one reason some people struggle after surgery.

**What they found**
Reoperation is a known event after lumbar surgery, not a personal failure and not a rare surprise that no one should mention. Fusion changes the stresses next door, so the studies track neighboring levels over years. Alignment research adds another layer: if the trunk is pitched forward, freeing a single nerve may not address the reason standing is hard. The papers report rates for groups. They do not assign a rate to the next person who walks in.

**How The Alignment Clinic approaches this**
The visit starts over. What hurt before the operation, what changed, and what is left are three different facts. Fresh X-rays and, when needed, a new MRI or a CT of a fusion are read against that story. Another operation is one option when a clear problem explains the symptoms. It is not the automatic answer to disappointment. Therapy, medication, and a honest account of what surgery cannot restore also belong in the room.

**What a visit can clarify**
A visit can name whether the remaining pain is a nerve, a joint, a fusion that did not heal, or a balance problem. That name is what makes the next step specific. ${close}`,
    },
    papers: [
      paper("17268274", "Reoperation rates following lumbar spine surgery and the influence of spinal fusion procedures", "Spine", "2007"),
      paper("8367786", "A prospective, randomized study of lumbar fusion. Preliminary results", "Spine", "1993"),
      paper("28976431", "Global Alignment and Proportion (GAP) Score", "J Bone Joint Surg Am", "2017"),
    ],
  },
];
