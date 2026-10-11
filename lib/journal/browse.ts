export function journalNotesMatching<T extends { title: string; summary: string }>(notes: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return notes;
  return notes.filter((note) => `${note.title} ${note.summary}`.toLowerCase().includes(needle));
}
