import type { ReactNode } from "react";
import Link from "next/link";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatTime } from "@/lib/rcm/format";
import type { Appointment } from "@/lib/rcm/types";
import { visitLabel } from "@/components/admin/rcm/ui";
import { cn } from "@/lib/utils";

const practiceRooms = ["Room 1", "Room 2", "Procedure"];
const pixelsPerMinute = 1.35;

function clock(start: string) {
  const match = /T(\d{2}):(\d{2})/.exec(start);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function minutes(start: string) {
  const parts = clock(start);
  return parts.hour * 60 + parts.minute;
}

function hourLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hour12 = hour % 12 || 12;
  if (minute === 0) return `${hour12} ${hour < 12 ? "AM" : "PM"}`;
  return `${hour12}:${String(minute).padStart(2, "0")}`;
}

export function DaySheet({
  visits,
  names,
  empty,
  title = "Rooms",
  header,
  renderExtra,
  recordHref,
}: {
  visits: Appointment[];
  names: Map<string, string>;
  empty: string;
  title?: string;
  header?: ReactNode;
  renderExtra?: (visit: Appointment) => ReactNode;
  recordHref?: (visit: Appointment, name: string) => string;
}) {
  const seenRooms = [...new Set(visits.map((visit) => visit.room || "Room 1"))];
  const rooms = [...practiceRooms];
  for (const room of seenRooms) {
    if (!rooms.includes(room)) rooms.push(room);
  }

  const starts = visits.map((visit) => minutes(visit.start));
  const finishes = visits.map((visit) => minutes(visit.start) + (visit.durationMinutes || 30));
  const earliest = starts.length ? Math.min(...starts) : 8 * 60;
  const latest = finishes.length ? Math.max(...finishes) : 12 * 60;
  const windowStart = starts.length ? Math.floor(Math.min(8 * 60, earliest - 30) / 15) * 15 : 8 * 60;
  const windowEnd = starts.length ? Math.max(windowStart + 4 * 60, Math.ceil((latest + 30) / 15) * 15) : 12 * 60;
  const span = windowEnd - windowStart;
  const ticks = Array.from({ length: span / 15 + 1 }, (_, index) => windowStart + index * 15);
  const gridHeight = span * pixelsPerMinute;

  const byRoom = new Map<string, Appointment[]>();
  for (const room of rooms) {
    byRoom.set(
      room,
      visits
        .filter((visit) => (visit.room || "Room 1") === room)
        .sort((a, b) => a.start.localeCompare(b.start)),
    );
  }

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
      <div className="overflow-auto">
        <div className="min-w-[42rem]">
          <div className="sticky top-0 z-20 grid border-b border-line bg-mist/90 backdrop-blur" style={{ gridTemplateColumns: `4.5rem repeat(${rooms.length}, minmax(11rem, 1fr))` }}>
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

          <div className="relative grid" style={{ gridTemplateColumns: `4.5rem repeat(${rooms.length}, minmax(11rem, 1fr))`, height: gridHeight }}>
            <div className="relative border-r border-line bg-mist/30">
              {ticks.map((tick) =>
                tick % 60 === 0 || tick % 30 === 0 ? (
                  <div
                    key={tick}
                    className={cn(
                      "absolute right-2 -translate-y-1/2 text-[0.65rem] font-semibold",
                      tick % 60 === 0 ? "text-ink" : "text-muted",
                    )}
                    style={{ top: (tick - windowStart) * pixelsPerMinute }}
                  >
                    {hourLabel(tick)}
                  </div>
                ) : null,
              )}
            </div>

            {rooms.map((room) => {
              const placed = byRoom.get(room) ?? [];
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
                  {placed.map((visit) => {
                    const name = names.get(visit.patientId) ?? "Unknown patient";
                    const start = minutes(visit.start);
                    const duration = visit.durationMinutes || 30;
                    const top = (start - windowStart) * pixelsPerMinute;
                    const height = Math.max(duration * pixelsPerMinute, 72);
                    const openVisit = recordHref?.(visit, name);
                    return (
                      <div
                        key={visit.id}
                        className={cn(
                          "absolute inset-x-1.5 z-10 flex min-w-0 flex-col overflow-hidden rounded-xl border px-2.5 py-2 shadow-[0_10px_24px_-18px_rgb(7_30_54_/_0.7)]",
                          visit.status === "in_progress" && "border-oxide bg-mint",
                          visit.status === "arrived" && "border-oxide bg-mint/70",
                          visit.status === "completed" && "border-line bg-mist text-muted",
                          visit.status === "no_show" && "border-dashed border-line bg-card text-muted",
                          visit.status === "cancelled" && "border-dashed border-line bg-card text-muted",
                          visit.status === "scheduled" && "border-sky-200 bg-sky-50",
                        )}
                        style={{ top: top + 2, height: height - 4 }}
                      >
                        {openVisit ? (
                          <Link href={openVisit} aria-label={`Record ${name}`} className="absolute inset-0 z-0 rounded-xl" />
                        ) : null}
                        <div className={cn("relative z-10 min-w-0", openVisit && "pointer-events-none")}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-[0.7rem] font-semibold text-muted">{visit.providerName}</p>
                            {visit.status === "arrived" || visit.status === "in_progress" ? (
                              <span className="shrink-0 rounded-full bg-oxide px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-paper">
                                {visit.status === "arrived" ? "Arrived" : "In room"}
                              </span>
                            ) : null}
                          </div>
                          {openVisit ? (
                            <span className="mt-0.5 block truncate font-semibold uppercase tracking-wide">{name}</span>
                          ) : (
                            <Link
                              href={`/admin/operations/patients/${visit.patientId}`}
                              className="mt-0.5 block truncate font-semibold uppercase tracking-wide hover:text-oxide"
                            >
                              {name}
                            </Link>
                          )}
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {formatTime(visit.start)} · {duration} min
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm leading-snug">{visit.reason}</p>
                          <p className="mt-1 truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                            {visitTypeLabel[visit.visitType] ?? visit.visitType}
                            {" · "}
                            {visitLabel(visit.status)}
                            {visit.confirmation !== "confirmed" ? ` · ${visitLabel(visit.confirmation)}` : ""}
                          </p>
                          {openVisit ? <span className="mt-1 inline-flex text-xs font-medium underline">Record</span> : null}
                        </div>
                        {renderExtra ? <div className="relative z-10 mt-auto pt-1.5">{renderExtra(visit)}</div> : null}
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
