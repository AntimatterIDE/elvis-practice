import type { EligibilityResult, PracticeDeskSnapshot, PracticeProfile, PracticeTask } from "@/lib/rcm/types";

export function normalizePractice(practice: PracticeProfile): PracticeProfile {
  return {
    legalName: practice.legalName ?? "",
    physicianName: practice.physicianName ?? "",
    npi: practice.npi ?? "",
    taxId: practice.taxId ?? "",
    taxonomy: practice.taxonomy ?? "",
    phone: practice.phone ?? "",
    address: practice.address ?? "",
    posCode: practice.posCode || "11",
    updatedAt: practice.updatedAt || "",
  };
}

function taskStamp(task: PracticeTask) {
  return task.updatedAt || "";
}

function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  newer: (left: T, right: T) => boolean,
): { items: T[]; needsUpsert: boolean } {
  const merged = new Map<string, T>();
  for (const item of remote) merged.set(item.id, item);
  let needsUpsert = false;
  for (const item of local) {
    const other = merged.get(item.id);
    if (!other) {
      merged.set(item.id, item);
      needsUpsert = true;
      continue;
    }
    if (newer(item, other)) {
      merged.set(item.id, item);
      needsUpsert = true;
    }
  }
  return { items: [...merged.values()], needsUpsert };
}

/** Newer practice.updatedAt wins. Tasks/eligibility merge by id. */
export function mergePracticeDesk(local: PracticeDeskSnapshot, remote: PracticeDeskSnapshot | null): {
  desk: PracticeDeskSnapshot;
  needsUpsert: boolean;
} {
  if (!remote) {
    const practice = normalizePractice(local.practice);
    const hasPractice = Boolean(practice.npi || practice.taxId || practice.address || practice.updatedAt);
    const needsUpsert = hasPractice || local.tasks.length > 0 || local.eligibility.length > 0;
    return {
      desk: {
        practice,
        tasks: local.tasks,
        eligibility: local.eligibility,
        updatedAt: local.updatedAt || practice.updatedAt || new Date(0).toISOString(),
      },
      needsUpsert,
    };
  }

  const localPractice = normalizePractice(local.practice);
  const remotePractice = normalizePractice(remote.practice);
  const practice =
    (localPractice.updatedAt || "") > (remotePractice.updatedAt || "") ? localPractice : remotePractice;
  const practiceNeedsUpsert = (localPractice.updatedAt || "") > (remotePractice.updatedAt || "");

  const tasks = mergeById(local.tasks, remote.tasks, (left, right) => taskStamp(left) > taskStamp(right));
  const eligibility = mergeById(
    local.eligibility,
    remote.eligibility,
    (left, right) => (left.createdAt || "") > (right.createdAt || ""),
  );

  const updatedAt = [local.updatedAt, remote.updatedAt, practice.updatedAt].filter(Boolean).sort().at(-1) || remote.updatedAt;
  return {
    desk: {
      practice,
      tasks: tasks.items,
      eligibility: eligibility.items,
      updatedAt,
    },
    needsUpsert: practiceNeedsUpsert || tasks.needsUpsert || eligibility.needsUpsert,
  };
}

export function deskFromState(practice: PracticeProfile, tasks: PracticeTask[], eligibility: EligibilityResult[]): PracticeDeskSnapshot {
  const normalized = normalizePractice(practice);
  return {
    practice: normalized,
    tasks,
    eligibility,
    updatedAt: normalized.updatedAt || new Date().toISOString(),
  };
}
