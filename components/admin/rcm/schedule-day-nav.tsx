"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { shiftClinicDay } from "@/lib/rcm/chart";
import { formatClinicDayNav } from "@/lib/rcm/format";
import { cn } from "@/lib/utils";

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthAnchor(day: string) {
  return `${day.slice(0, 7)}-01`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthTitle(day: string) {
  const date = new Date(`${monthAnchor(day)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ScheduleDayNav({
  day,
  today,
  markedDays,
  visitCount,
  onChange,
}: {
  day: string;
  today: string;
  markedDays?: Iterable<string>;
  visitCount: number;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(monthAnchor(day));
  const rootRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const marked = useMemo(() => new Set(markedDays ?? []), [markedDays]);

  useEffect(() => {
    if (!open) return;
    setViewMonth(monthAnchor(day));
  }, [day, open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const viewDate = new Date(`${viewMonth}T12:00:00`);
  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const totalDays = daysInMonth(year, monthIndex);
  const cells = Array.from({ length: firstWeekday + totalDays }, (_, index) => {
    if (index < firstWeekday) return null;
    const date = index - firstWeekday + 1;
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  });

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Previous day"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-card text-lg text-ink hover:bg-mist"
          onClick={() => onChange(shiftClinicDay(day, -1))}
        >
          ‹
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-center text-sm font-semibold sm:text-base">{formatClinicDayNav(day, today)}</p>
          <button
            type="button"
            aria-label="Open calendar"
            aria-expanded={open}
            aria-controls={calendarId}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-oxide",
              open ? "border-oxide bg-mint" : "border-line bg-card hover:bg-mist",
            )}
            onClick={() => setOpen((value) => !value)}
          >
            <CalendarIcon />
          </button>
        </div>
        <button
          type="button"
          aria-label="Next day"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-card text-lg text-ink hover:bg-mist"
          onClick={() => onChange(shiftClinicDay(day, 1))}
        >
          ›
        </button>
      </div>
      <p className="w-full text-center text-sm text-muted sm:absolute sm:right-5 sm:top-1/2 sm:w-auto sm:-translate-y-1/2 sm:text-right">
        Total visits: {visitCount}
      </p>

      {open ? (
        <div
          id={calendarId}
          className="absolute left-1/2 top-[calc(100%-0.25rem)] z-30 w-[18.5rem] -translate-x-1/2 rounded-2xl border border-line bg-card p-3 shadow-[0_24px_48px_-28px_rgb(7_30_54_/_0.55)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line hover:bg-mist"
              onClick={() => setViewMonth(localMonthDay(new Date(year, monthIndex - 1, 1)))}
            >
              ‹
            </button>
            <p className="text-sm font-semibold">{monthTitle(viewMonth)}</p>
            <button
              type="button"
              aria-label="Next month"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line hover:bg-mist"
              onClick={() => setViewMonth(localMonthDay(new Date(year, monthIndex + 1, 1)))}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">
            {weekdayLabels.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, index) =>
              cell ? (
                <button
                  key={cell}
                  type="button"
                  onClick={() => {
                    onChange(cell);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg text-sm",
                    cell === day && "bg-oxide font-semibold text-paper",
                    cell !== day && cell === today && "border border-oxide text-oxide",
                    cell !== day && cell !== today && "hover:bg-mist",
                  )}
                >
                  {Number(cell.slice(8))}
                  {marked.has(cell) ? (
                    <span
                      className={cn(
                        "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                        cell === day ? "bg-paper" : "bg-oxide",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-ink hover:bg-amber-300"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-xl border border-line bg-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-card"
              onClick={() => setViewMonth(monthAnchor(today))}
            >
              This month
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function localMonthDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5h15M6.5 2v3M13.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
