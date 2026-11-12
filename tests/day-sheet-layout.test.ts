import { describe, expect, it } from "vitest";
import {
  DAY_SHEET_DEFAULT_END,
  DAY_SHEET_DEFAULT_START,
  daySheetScrollTargetMinutes,
  daySheetWindow,
  placeRoomVisits,
} from "@/lib/rcm/day-sheet-layout";

describe("daySheetWindow", () => {
  it("uses 7 AM–7 PM for an empty day", () => {
    expect(daySheetWindow([])).toEqual({
      windowStart: DAY_SHEET_DEFAULT_START,
      windowEnd: DAY_SHEET_DEFAULT_END,
    });
  });

  it("keeps the default window when visits sit inside it", () => {
    expect(
      daySheetWindow([
        { id: "a", start: "2026-11-13T10:00:00", durationMinutes: 30 },
        { id: "b", start: "2026-11-13T12:30:00", durationMinutes: 30 },
      ]),
    ).toEqual({ windowStart: 7 * 60, windowEnd: 19 * 60 });
  });

  it("starts at 6 AM when a visit begins at 6:30", () => {
    expect(daySheetWindow([{ id: "early", start: "2026-11-13T06:30:00", durationMinutes: 30 }])).toEqual({
      windowStart: 6 * 60,
      windowEnd: 19 * 60,
    });
  });
});

describe("placeRoomVisits", () => {
  it("splits 10:00 and 10:15 into two columns (Friday Room 1 double-book)", () => {
    const placed = placeRoomVisits([
      { id: "soranyi", start: "2026-11-13T10:00:00", durationMinutes: 30 },
      { id: "sigrid", start: "2026-11-13T10:15:00", durationMinutes: 30 },
    ]);
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]));
    expect(byId.soranyi).toMatchObject({ column: 0, columnCount: 2, startMinutes: 10 * 60, heightMinutes: 30 });
    expect(byId.sigrid).toMatchObject({ column: 1, columnCount: 2, startMinutes: 10 * 60 + 15, heightMinutes: 30 });
  });

  it("keeps back-to-back 12:00 and 12:30 full width", () => {
    const placed = placeRoomVisits([
      { id: "jean", start: "2026-11-13T12:00:00", durationMinutes: 30 },
      { id: "frances", start: "2026-11-13T12:30:00", durationMinutes: 30 },
    ]);
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]));
    expect(byId.jean).toMatchObject({ column: 0, columnCount: 1 });
    expect(byId.frances).toMatchObject({ column: 0, columnCount: 1 });
  });

  it("reuses lane 0 for a third visit that starts when the first ends", () => {
    const placed = placeRoomVisits([
      { id: "a", start: "2026-11-13T10:00:00", durationMinutes: 30 },
      { id: "b", start: "2026-11-13T10:15:00", durationMinutes: 30 },
      { id: "c", start: "2026-11-13T10:30:00", durationMinutes: 30 },
    ]);
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]));
    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(0);
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(2);
  });

  it("defaults missing duration to 30 minutes", () => {
    const [placed] = placeRoomVisits([{ id: "x", start: "2026-11-13T09:00:00" }]);
    expect(placed.heightMinutes).toBe(30);
  });
});

describe("daySheetScrollTargetMinutes", () => {
  it("scrolls to 8 AM on an empty day", () => {
    expect(daySheetScrollTargetMinutes([], 7 * 60)).toBe(8 * 60);
  });

  it("scrolls to 30 minutes before the first visit", () => {
    expect(
      daySheetScrollTargetMinutes([{ id: "a", start: "2026-11-13T10:00:00", durationMinutes: 30 }], 7 * 60),
    ).toBe(9 * 60 + 30);
  });
});
