export const portalUploadSlots = [
  { id: "photo-id", label: "Photo ID" },
  { id: "insurance-card", label: "Insurance card" },
  { id: "portal-files", label: "Other document" },
] as const;

export function portalUploadSlot(id: string) {
  return portalUploadSlots.find((slot) => slot.id === id) ?? null;
}
