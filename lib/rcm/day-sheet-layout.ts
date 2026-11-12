/** Default clinic day sheet window: 7:00 AM – 7:00 PM (matches booking time list). */
export const DAY_SHEET_DEFAULT_START = 7 * 60;
export const DAY_SHEET_DEFAULT_END = 19 * 60;
/** Pixels per minute so a 30-minute visit is 60px tall. */
export const DAY_SHEET_PIXELS_PER_MINUTE = 2;

export type DaySheetVisit = {
  id: string;
  start: string;
  durationMinutes?: number;
};

export type DaySheetWindow = {
  windowStart: number;
  windowEnd: number;
};

export type PlacedVisit = {
  id: string;
  startMinutes: number;
  heightMinutes: number;
  column: number;
  /** How many lane slots this visit occupies (expands into empty neighbors). */
  colSpan: number;
  /** Lane count for the connected overlap cluster. */
  columnCount: number;
};

function clockMinutes(start: string) {
  const match = /T(\d{2}):(\d{2})/.exec(start);
  if (!match) return 9 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function visitDuration(visit: DaySheetVisit) {
  return visit.durationMinutes && visit.durationMinutes > 0 ? visit.durationMinutes : 30;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** Grid window in minutes from midnight. Expands only when visits fall outside 7–19. */
export function daySheetWindow(visits: DaySheetVisit[]): DaySheetWindow {
  if (!visits.length) {
    return { windowStart: DAY_SHEET_DEFAULT_START, windowEnd: DAY_SHEET_DEFAULT_END };
  }

  let earliest = Infinity;
  let latest = -Infinity;
  for (const visit of visits) {
    const start = clockMinutes(visit.start);
    const end = start + visitDuration(visit);
    earliest = Math.min(earliest, start);
    latest = Math.max(latest, end);
  }

  // Expand below 7 AM to the whole hour (6:30 → 6:00); expand past 7 PM to the next 15.
  const windowStart = Math.min(DAY_SHEET_DEFAULT_START, Math.floor(earliest / 60) * 60);
  const windowEnd = Math.max(DAY_SHEET_DEFAULT_END, Math.ceil(latest / 15) * 15);
  return { windowStart, windowEnd };
}

/**
 * Place same-room visits into overlap lanes.
 * Touching end/start (back-to-back) does not overlap; true time overlap splits the column.
 * Visits expand into empty neighboring lanes so a later slot is not stuck at 1/3 width.
 */
export function placeRoomVisits(visits: DaySheetVisit[]): PlacedVisit[] {
  const sorted = [...visits].sort((a, b) => {
    const startDiff = clockMinutes(a.start) - clockMinutes(b.start);
    if (startDiff !== 0) return startDiff;
    return a.id.localeCompare(b.id);
  });

  const laneEnds: number[] = [];
  const provisional: Array<{ id: string; startMinutes: number; heightMinutes: number; column: number }> = [];

  for (const visit of sorted) {
    const startMinutes = clockMinutes(visit.start);
    const heightMinutes = visitDuration(visit);
    let column = laneEnds.findIndex((end) => end <= startMinutes);
    if (column < 0) {
      column = laneEnds.length;
      laneEnds.push(startMinutes + heightMinutes);
    } else {
      laneEnds[column] = startMinutes + heightMinutes;
    }
    provisional.push({ id: visit.id, startMinutes, heightMinutes, column });
  }

  // Connected components via time overlap.
  const parent = provisional.map((_, index) => index);
  function find(index: number): number {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  }
  function unite(a: number, b: number) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }
  for (let i = 0; i < provisional.length; i += 1) {
    for (let j = i + 1; j < provisional.length; j += 1) {
      const a = provisional[i];
      const b = provisional[j];
      if (
        rangesOverlap(
          a.startMinutes,
          a.startMinutes + a.heightMinutes,
          b.startMinutes,
          b.startMinutes + b.heightMinutes,
        )
      ) {
        unite(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  provisional.forEach((_, index) => {
    const root = find(index);
    const list = groups.get(root) ?? [];
    list.push(index);
    groups.set(root, list);
  });

  const placed: PlacedVisit[] = provisional.map((item) => ({
    ...item,
    colSpan: 1,
    columnCount: 1,
  }));

  for (const indexes of groups.values()) {
    const members = indexes.map((index) => provisional[index]);
    const columnCount = Math.max(...members.map((item) => item.column)) + 1;
    for (const index of indexes) {
      const item = provisional[index];
      let colSpan = 1;
      while (item.column + colSpan < columnCount) {
        const nextCol = item.column + colSpan;
        const blocked = members.some(
          (other) =>
            other.id !== item.id &&
            rangesOverlap(
              item.startMinutes,
              item.startMinutes + item.heightMinutes,
              other.startMinutes,
              other.startMinutes + other.heightMinutes,
            ) &&
            other.column === nextCol,
        );
        if (blocked) break;
        colSpan += 1;
      }
      placed[index] = {
        id: item.id,
        startMinutes: item.startMinutes,
        heightMinutes: item.heightMinutes,
        column: item.column,
        colSpan,
        columnCount,
      };
    }
  }

  return placed;
}

export function daySheetScrollTargetMinutes(visits: DaySheetVisit[], windowStart: number) {
  if (!visits.length) return Math.max(windowStart, 8 * 60);
  const earliest = Math.min(...visits.map((visit) => clockMinutes(visit.start)));
  return Math.max(windowStart, earliest - 30);
}
