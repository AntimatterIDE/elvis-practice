export function recordVisitHref(visit: { id: string; start: string; reason: string }, name: string) {
  const params = new URLSearchParams({
    appointment: visit.id,
    label: name,
    when: visit.start,
    reason: visit.reason,
  });
  return `/admin/operations/visits?${params.toString()}`;
}

const storagePrefix = "alignment-visit:";
const memoryListeners = new Set<() => void>();

export function subscribeVisitMemory(listener: () => void) {
  memoryListeners.add(listener);
  return () => {
    memoryListeners.delete(listener);
  };
}

export function rememberedVisit(appointmentId: string) {
  if (!appointmentId || typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(`${storagePrefix}${appointmentId}`) ?? "";
}

export function rememberVisit(appointmentId: string, encounterId: string) {
  if (!appointmentId || !encounterId || typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${storagePrefix}${appointmentId}`, encounterId);
  for (const listener of memoryListeners) listener();
}
