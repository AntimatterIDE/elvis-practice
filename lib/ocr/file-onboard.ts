import { beginChartUpload } from "@/app/admin/chart-files/actions";
import { chartFileType, putSignedChartFile } from "@/lib/chart-files/put";
import { chartSlotsForOnboardFiles, type OnboardDraft } from "@/lib/ocr/onboard-draft";

function isImageFile(file: File) {
  return (file.type || "").startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
}

/**
 * Store packet files on the patient chart under the hinted slots.
 * PDFs copy into clinical slots (records / imaging / no-fault / consult / follow-up).
 * Images prefer photo-id / insurance-card when those slots are selected.
 */
export async function fileOnboardPacketToChart(input: {
  patientId: string;
  files: File[];
  hints: OnboardDraft["documentHints"];
  pageLabels?: { label: string }[];
}) {
  const slots = chartSlotsForOnboardFiles(input.files, input.hints, input.pageLabels);
  const clinicalSlots = slots.filter((slot) => slot !== "photo-id" && slot !== "insurance-card");
  const uploaded: { slotId: string; fileName: string }[] = [];
  const errors: string[] = [];

  for (const file of input.files) {
    const contentType = chartFileType(file) || file.type || "application/pdf";
    let useSlots: string[];
    if (isImageFile(file)) {
      useSlots = [];
      if (slots.includes("photo-id")) useSlots.push("photo-id");
      if (slots.includes("insurance-card")) useSlots.push("insurance-card");
      if (!useSlots.length) useSlots = ["outside-records"];
    } else {
      useSlots = (clinicalSlots.length ? clinicalSlots : ["outside-records"]).slice(0, 4);
    }

    for (const slotId of useSlots) {
      const prepared = await beginChartUpload({
        patientId: input.patientId,
        slotId,
        contentType,
        byteSize: file.size,
        fileName: file.name,
      });
      if (!prepared.ok) {
        errors.push(`${file.name} → ${slotId}: ${prepared.message}`);
        continue;
      }
      const stored = await putSignedChartFile(prepared.signedUrl, file, contentType);
      if (!stored.ok) {
        errors.push(`${file.name} → ${slotId}: ${stored.message}`);
        continue;
      }
      uploaded.push({ slotId, fileName: file.name });
    }
  }

  return { uploaded, errors, slots };
}
