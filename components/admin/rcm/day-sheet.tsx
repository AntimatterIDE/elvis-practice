import type { ReactNode } from "react";
import Link from "next/link";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatTime } from "@/lib/rcm/format";
import type { Appointment } from "@/lib/rcm/types";
import { visitLabel } from "@/components/admin/rcm/ui";
import { cn } from "@/lib/utils";

const practiceRooms = ["Room 1", "Room 2", "Procedure"];

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
  const hour12 = hour % 12 || 12;
  return `${hour12} ${hour < 12 ? "AM" : "PM"}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}

export function DaySheet({
  visits,
  names,
  empty,
  title = "Rooms",
  renderExtra,
}: {
  visits: Appointment[];
  names: Map<string, string>;
  empty: string;
  title?: string;
  renderExtra?: (visit: Appointment) => ReactNode;
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
  const windowStart = starts.length ? Math.floor(Math.min(8 * 60, earliest - 60) / 60) * 60 : 8 * 60;
  const windowEnd = starts.length ? Math.max(windowStart + 4 * 60, Math.ceil(latest / 60) * 60 + 60) : 12 * 60;
  const span = windowEnd - windowStart;
  const hours = Array.from({ length: span / 60 }, (_, index) => windowStart + index * 60);
  const laneHeight = renderExtra ? 12.25 : 6.35;

  const byRoom = new Map<string, { visit: Appointment; lane: number }[]>();
  for (const room of rooms) {
    const laneEnds: number[] = [];
    const placed = visits
      .filter((visit) => (visit.room || "Room 1") === room)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((visit) => {
        const start = minutes(visit.start);
        const visualEnd = start + Math.max(visit.durationMinutes || 30, 80);
        let lane = laneEnds.findIndex((endAt) => endAt <= start);
        if (lane < 0) {
          lane = laneEnds.length;
          laneEnds.push(visualEnd);
        } else {
          laneEnds[lane] = visualEnd;
        }
        return { visit, lane };
      });
    byRoom.set(room, placed);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
      <div className="flex items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Day sheet</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-muted">{visits.length === 0 ? empty : `${visits.length} on the board`}</p>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${8.5 + hours.length * 9}rem` }}>
          <div className="grid" style={{ gridTemplateColumns: `8.5rem repeat(${hours.length}, minmax(9rem, 1fr))` }}>
            <div className="bg-mist/40" />
            {hours.map((hour) => (
              <div key={hour} className="border-l border-line bg-mist/40 px-2 py-2 text-[0.7rem] font-semibold text-muted">
                {hourLabel(hour)}
              </div>
            ))}
          </div>
          {rooms.map((room) => {
            const placed = byRoom.get(room) ?? [];
            const lanes = Math.max(1, ...placed.map((item) => item.lane + 1), 1);
            return (
              <div key={room} className="grid border-t border-line" style={{ gridTemplateColumns: "8.5rem minmax(0, 1fr)" }}>
                <div className="bg-card px-3 py-3">
                  <p className="font-display text-xl leading-none">{room}</p>
                  <p className="mt-1 text-xs text-muted">{placed.length === 0 ? "Open" : `${placed.length} ${placed.length === 1 ? "visit" : "visits"}`}</p>
                </div>
                <div className="relative border-l border-line" style={{ minHeight: `${placed.length === 0 ? 4.5 : lanes * laneHeight + 0.75}rem` }}>
                  <div
                    className="pointer-events-none absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
                  >
                    {hours.map((hour) => (
                      <div key={hour} className="border-l border-line/70 first:border-l-0" />
                    ))}
                  </div>
                  {placed.map(({ visit, lane }) => {
                    const name = names.get(visit.patientId) ?? "Unknown patient";
                    const start = minutes(visit.start);
                    const duration = visit.durationMinutes || 30;
                    const left = ((start - windowStart) / span) * 100;
                    const width = (duration / span) * 100;
                    return (
                      <div
                        key={visit.id}
                        className={cn(
                          "absolute flex flex-col overflow-hidden rounded-xl border px-3 py-2 shadow-[0_10px_24px_-18px_rgb(7_30_54_/_0.7)]",
                          visit.status === "in_progress" && "border-oxide bg-mint",
                          visit.status === "arrived" && "border-oxide/40 bg-mint/80",
                          visit.status === "completed" && "border-line bg-mist text-muted",
                          visit.status === "no_show" && "border-dashed border-line bg-card text-muted",
                          visit.status === "cancelled" && "border-dashed border-line bg-card text-muted",
                          visit.status === "scheduled" && "border-line bg-card",
                        )}
                        style={{
                          left: `calc(${left}% + 0.35rem)`,
                          width: `max(13.5rem, calc(${width}% - 0.7rem))`,
                          top: `${0.4 + lane * laneHeight}rem`,
                          height: `${laneHeight - 0.7}rem`,
                        }}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-pine text-[0.65rem] font-semibold text-paper" aria-hidden>
                            {initials(name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/admin/operations/patients/${visit.patientId}`} className="block truncate font-semibold hover:text-oxide">
                              {name}
                            </Link>
                            <p className="truncate text-xs text-muted">
                              {formatTime(visit.start)} · {duration} min
                            </p>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-sm">{visit.reason}</p>
                        <p className="mt-auto truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                          {visitTypeLabel[visit.visitType] ?? visit.visitType}
                          {" · "}
                          {visitLabel(visit.status)}
                          {visit.confirmation !== "confirmed" ? ` · ${visitLabel(visit.confirmation)}` : ""}
                        </p>
                        {renderExtra ? <div className="mt-2">{renderExtra(visit)}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
