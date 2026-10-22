export function claimFileSlot(claimId: string) {
  return `claim-${claimId}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}
