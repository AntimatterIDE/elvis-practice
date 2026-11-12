"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { visitTypeLabel } from "@/lib/rcm/chart";
import {
  DAY_SHEET_PIXELS_PER_MINUTE,
  daySheetScrollTargetMinutes,
  daySheetWindow,
  placeRoomVisits,
} from "@/lib/rcm/day-sheet-layout";
import { formatTime } from "@/lib/rcm/format";
import type { Appointment } from "@/lib/rcm/types";
import { visitLabel } from "@/components/admin/rcm/ui";
import { cn } from "@/lib/utils";

const practiceRooms = ["Room 1", "Room 2", "Procedure"];
const pixelsPerMinute = DAY_SHEET_PIXELS_PER_MINUTE;

function hourLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hour12 = hour % 12 || 12;
  if (minute === 0) return `${hour12} ${hour < 12 ? "AM" : "PM"}`;
  return `${hour12}:${String(minute).padStart(2, "0")}`;
}

function cardTitle(visit: Appointment, name: string, duration: number) {
  const parts = [
    name,
    formatTime(visit.start),
    `${duration} min`,
    visit.reason,
    visitTypeLabel[visit.visitType] ?? visit.visitType,
    visitLabel(visit.status),
  ];
  if (visit.confirmation !== "confirmed") parts.push(visitLabel(visit.confirmation));
  return parts.filter(Boolean).join(" · ");
}

export function DaySheet({
  visits,
  names,
  empty,
  title = "Rooms",
  header,
  renderCorner,
  recordHref,
}: {
  visits: Appointment[];
  names: Map<string, string>;
  empty: string;
  title?: string;
  header?: ReactNode;
  /** Primary Check in / Room button + overflow menu; rendered in the card corner (not clipped). */
  renderCorner?: (visit: Appointment) => ReactNode;
  recordHref?: (visit: Appointment, name: string) => string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const seenRooms = [...new Set(visits.map((visit) => visit.room || "Room 1"))];
  const rooms = [...practiceRooms];
  for (const room of seenRooms) {
    if (!rooms.includes(room)) rooms.push(room);
  }

  const { windowStart, windowEnd } = daySheetWindow(visits);
  const span = windowEnd - windowStart;
  const ticks = Array.from({ length: span / 15 + 1 }, (_, index) => windowStart + index * 15);
  const gridHeight = span * pixelsPerMinute;
  const scrollKey = `${windowStart}:${visits.map((visit) => visit.id).join(",")}`;

  const byRoom = new Map<string, Appointment[]>();
  for (const room of rooms) {
    byRoom.set(
      room,
      visits
        .filter((visit) => (visit.room || "Room 1") === room)
        .sort((a, b) => a.start.localeCompare(b.start)),
    );
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const targetMinutes = daySheetScrollTargetMinutes(visits, windowStart);
    scroller.scrollTop = Math.max(0, (targetMinutes - windowStart) * pixelsPerMinute);
    // Intentionally key off the day board contents, not visits identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, windowStart]);

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
      {header ?? (
        <div className="flex items-end justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Day sheet</p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">{title}</h2>
          </div>
          <p className="text-sm text-muted">{visits.length === 0 ? empty : `${visits.length} on the board`}</p>
        </div>
      )}
      <div ref={scrollerRef} className="max-h-[70vh] overflow-auto">
        <div className="min-w-[42rem]">
          <div
            className="sticky top-0 z-20 grid border-b border-line bg-mist/95 backdrop-blur"
            style={{ gridTemplateColumns: `4.5rem repeat(${rooms.length}, minmax(11rem, 1fr))` }}
          >
            <div className="border-r border-line" />
            {rooms.map((room) => {
              const count = byRoom.get(room)?.length ?? 0;
              return (
                <div key={room} className="flex items-center justify-between gap-2 border-r border-line px-3 py-3 last:border-r-0">
                  <div>
                    <p className="font-display text-xl leading-none">{room}</p>
                    <p className="mt-1 text-xs text-muted">{count === 0 ? "Open" : `${count} ${count === 1 ? "visit" : "visits"}`}</p>
                  </div>
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-paper">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{ gridTemplateColumns: `4.5rem repeat(${rooms.length}, minmax(11rem, 1fr))`, height: gridHeight }}
          >
            <div className="sticky left-0 z-10 relative border-r border-line bg-mist/40">
              {ticks.map((tick) =>
                tick % 60 === 0 || tick % 30 === 0 ? (
                  <div
                    key={tick}
                    className={cn(
                      "absolute right-2 text-[0.65rem] font-semibold",
                      tick === windowStart ? "top-1 translate-y-0" : "-translate-y-1/2",
                      tick % 60 === 0 ? "text-ink" : "text-muted",
                    )}
                    style={{ top: tick === windowStart ? 4 : (tick - windowStart) * pixelsPerMinute }}
                  >
                    {hourLabel(tick)}
                  </div>
                ) : null,
              )}
            </div>

            {rooms.map((room) => {
              const placedVisits = byRoom.get(room) ?? [];
              const layout = placeRoomVisits(placedVisits);
              const layoutById = new Map(layout.map((item) => [item.id, item]));
              return (
                <div key={room} className="relative border-r border-line last:border-r-0">
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className={cn(
                        "pointer-events-none absolute inset-x-0 border-t",
                        tick % 60 === 0 ? "border-line" : "border-line/50",
                      )}
                      style={{ top: (tick - windowStart) * pixelsPerMinute }}
                    />
                  ))}
                  {placedVisits.map((visit) => {
                    const name = names.get(visit.patientId) ?? "Unknown patient";
                    const slot = layoutById.get(visit.id);
                    const startMinutes = slot?.startMinutes ?? 0;
                    const duration = slot?.heightMinutes ?? 30;
                    const column = slot?.column ?? 0;
                    const columnCount = slot?.columnCount ?? 1;
                    const top = (startMinutes - windowStart) * pixelsPerMinute;
                    const height = duration * pixelsPerMinute;
                    const gap = 3;
                    const widthPct = 100 / columnCount;
                    const leftPct = column * widthPct;
                    const openVisit = recordHref?.(visit, name);
                    const unconfirmed = visit.confirmation !== "confirmed" && visit.status !== "cancelled";
                    const showReason = duration >= 30;
                    const showMeta = duration >= 45;
                    return (
                      <div
                        key={visit.id}
                        title={cardTitle(visit, name, duration)}
                        className={cn(
                          "absolute z-10 flex min-w-0 flex-col overflow-hidden rounded-lg border shadow-[0_10px_24px_-18px_rgb(7_30_54_/_0.7)]",
                          visit.status === "in_progress" && "border-oxide bg-mint",
                          visit.status === "arrived" && "border-oxide bg-mint/80",
                          visit.status === "completed" && "border-line bg-mist text-muted",
                          visit.status === "no_show" && "border-dashed border-line bg-card text-muted",
                          visit.status === "cancelled" && "border-dashed border-line bg-card text-muted",
                          visit.status === "scheduled" && "border-sky-300 bg-sky-50",
                          unconfirmed && visit.status === "scheduled" && "border-dashed",
                        )}
                        style={{
                          top: top + 1,
                          height: Math.max(height - 2, 8),
                          left: `calc(${leftPct}% + ${gap}px)`,
                          width: `calc(${widthPct}% - ${gap * 2}px)`,
                        }}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            visit.status === "in_progress" && "bg-oxide",
                            visit.status === "arrived" && "bg-oxide",
                            visit.status === "scheduled" && "bg-sky-500",
                            visit.status === "completed" && "bg-line",
                            (visit.status === "no_show" || visit.status === "cancelled") && "bg-muted",
                          )}
                          aria-hidden
                        />
                        {openVisit ? (
                          <Link href={openVisit} aria-label={`Record ${name}`} className="absolute inset-0 z-0 rounded-lg" />
                        ) : null}
                        <div
                          className={cn(
                            "relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 px-2 py-1 pl-2.5",
                            renderCorner && "pr-[4.75rem]",
                            openVisit && "pointer-events-none",
                          )}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-1">
                            <p className="min-w-0 truncate text-[0.65rem] font-semibold uppercase tracking-wide">
                              {name}
                              {duration < 30 ? (
                                <span className="font-normal normal-case tracking-normal text-muted"> · {formatTime(visit.start)}</span>
                              ) : null}
                            </p>
                            {columnCount > 1 ? (
                              <span className="shrink-0 rounded bg-ink/80 px-1 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-paper">
                                Double
                              </span>
                            ) : null}
                          </div>
                          {duration >= 30 ? (
                            <p className="truncate text-[0.65rem] text-muted">
                              {formatTime(visit.start)} · {duration} min
                            </p>
                          ) : null}
                          {showReason ? <p className="line-clamp-2 text-xs leading-snug">{visit.reason}</p> : null}
                          {showMeta ? (
                            <p className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">
                              {visitTypeLabel[visit.visitType] ?? visit.visitType}
                              {" · "}
                              {visitLabel(visit.status)}
                              {unconfirmed ? ` · ${visitLabel(visit.confirmation)}` : ""}
                            </p>
                          ) : null}
                        </div>
                        {renderCorner ? (
                          <div className="pointer-events-auto absolute right-1 top-1 z-20 flex items-center gap-0.5">{renderCorner(visit)}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {visits.length === 0 ? (
              <p className="pointer-events-none absolute inset-x-0 top-1/3 z-10 px-5 text-center text-sm text-muted">{empty}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
