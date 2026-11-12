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
 */
export function placeRoomVisits(visits: DaySheetVisit[]): PlacedVisit[] {
  const sorted = [...visits].sort((a, b) => {
    const startDiff = clockMinutes(a.start) - clockMinutes(b.start);
    if (startDiff !== 0) return startDiff;
    return a.id.localeCompare(b.id);
  });

  type LaneEnd = number;
  const laneEnds: LaneEnd[] = [];
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

  // columnCount for each visit = max concurrent columns among visits that overlap it (inclusive).
  return provisional.map((item) => {
    const itemEnd = item.startMinutes + item.heightMinutes;
    let columnCount = 1;
    for (const other of provisional) {
      const otherEnd = other.startMinutes + other.heightMinutes;
      const overlaps = item.startMinutes < otherEnd && other.startMinutes < itemEnd;
      if (overlaps) columnCount = Math.max(columnCount, other.column + 1, item.column + 1);
    }
    // Widen to the full cluster width: max lane index among overlapping peers + 1.
    let clusterMax = item.column;
    for (const other of provisional) {
      const otherEnd = other.startMinutes + other.heightMinutes;
      const overlaps = item.startMinutes < otherEnd && other.startMinutes < itemEnd;
      if (overlaps) clusterMax = Math.max(clusterMax, other.column);
    }
    columnCount = Math.max(columnCount, clusterMax + 1);
    return { ...item, columnCount };
  });
}

export function daySheetScrollTargetMinutes(visits: DaySheetVisit[], windowStart: number) {
  if (!visits.length) return Math.max(windowStart, 8 * 60);
  const earliest = Math.min(...visits.map((visit) => clockMinutes(visit.start)));
  return Math.max(windowStart, earliest - 30);
}
