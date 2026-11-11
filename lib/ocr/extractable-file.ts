/** Files the onboard OCR path can read (PDF + common images). Word/video are stored only. */
export function isOcrExtractableFile(file: { name?: string; type?: string; contentType?: string; label?: string }) {
  const type = (file.type || file.contentType || "").toLowerCase();
  const name = file.name || file.label || "";
  return (
    type === "application/pdf" ||
    /\.pdf$/i.test(name) ||
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(name)
  );
}

export function isWordFile(file: { name?: string; type?: string; label?: string }) {
  const type = (file.type || "").toLowerCase();
  const name = file.name || file.label || "";
  return type.includes("word") || type.includes("officedocument.wordprocessingml") || /\.docx?$/i.test(name);
}

export function wordNeedsPdfMessage(fileName: string) {
  return `${fileName} is saved. Word files cannot be OCR’d here — upload a PDF or photo to extract into the chart.`;
}
