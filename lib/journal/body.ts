export function journalBody(source: string) {
  return source
    .replace(/this website does not provide emergency care[\s\S]{0,600}?emergency department\.?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
