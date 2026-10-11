"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  PackageCheck,
  RotateCcw,
  Undo2,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const frame =
  "flex flex-col gap-1 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900";

const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-950";

type Range = "7d" | "28d" | "qtd";

type Metric = {
  id: string;
  label: string;
  icon: typeof PackageCheck;
  caption: string;
  /** value + delta per range: the control has to move real numbers. */
  by: Record<Range, { value: string; delta: number }>;
};

const RANGES: { id: Range; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "qtd", label: "Quarter" },
];

const METRICS: Metric[] = [
  {
    id: "fulfilled",
    label: "Orders fulfilled",
    icon: PackageCheck,
    caption: "Picked, packed and handed to a carrier",
    by: {
      "7d": { value: "1,284", delta: 6.4 },
      "28d": { value: "5,109", delta: 11.2 },
      qtd: { value: "14,730", delta: 18.9 },
    },
  },
  {
    id: "net",
    label: "Net revenue",
    icon: Banknote,
    caption: "Gross receipts less discounts and refunds",
    by: {
      "7d": { value: "$92.4k", delta: 3.1 },
      "28d": { value: "$374.8k", delta: 7.8 },
      qtd: { value: "$1.09M", delta: 12.4 },
    },
  },
  {
    id: "basket",
    label: "Average basket",
    icon: RotateCcw,
    caption: "Net revenue divided by fulfilled orders",
    by: {
      "7d": { value: "$71.96", delta: -2.9 },
      "28d": { value: "$73.36", delta: -1.4 },
      qtd: { value: "$74.02", delta: 0.6 },
    },
  },
  {
    id: "returns",
    label: "Return rate",
    icon: Undo2,
    caption: "Units sent back within the 30 day window",
    by: {
      "7d": { value: "4.1%", delta: -0.8 },
      "28d": { value: "4.6%", delta: 0.5 },
      qtd: { value: "5.2%", delta: 1.7 },
    },
  },
];

const isGood = (id: string, delta: number) =>
  id === "returns" ? delta < 0 : delta > 0;

const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

export default function List1() {
  const [range, setRange] = useState<Range>("28d");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex h-full min-h-[560px] w-full flex-col justify-center overflow-y-auto bg-white p-8 sm:p-10 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base tracking-[-0.01em] text-neutral-900 dark:text-white">
              Store performance
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              Compared with the preceding period
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Reporting range"
            className="flex items-center gap-0.5 rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            {RANGES.map((r) => {
              const on = r.id === range;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setRange(r.id)}
                  className={cx(
                    "h-7 rounded-[var(--rb-r-md,8px)] px-2.5 text-[12px]",
                    transition,
                    focus,
                    on
                      ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-neutral-950 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={frame}>
          {METRICS.map((m, i) => {
            const { value, delta } = m.by[range];
            const good = isGood(m.id, delta);
            const open = openId === m.id;
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                className={cx(
                  panel,
                  "group/row relative",
                  transition,
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  open && "ring-1 ring-neutral-900 dark:ring-white",
                  "motion-reduce:transition-none",
                )}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? undefined : "translateY(4px)",
                  transition:
                    "opacity 300ms ease-out, transform 300ms ease-out," +
                    " background-color 150ms ease-out",
                  transitionDelay: `${Math.min(i, 8) * 20}ms`,
                }}
              >
                <div className="flex h-16 items-center gap-3 px-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 dark:bg-neutral-800">
                    <Icon
                      className="h-[18px] w-[18px] text-neutral-500"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg tracking-[-0.015em] text-neutral-900 tabular-nums dark:text-white">
                        {value}
                      </span>
                      <span
                        className={cx(
                          "text-[12px] tabular-nums",
                          delta === 0
                            ? "text-neutral-500"
                            : good
                              ? "text-emerald-600 dark:text-emerald-500"
                              : "text-red-600 dark:text-red-500",
                        )}
                      >
                        {signed(delta)}
                      </span>
                    </div>
                    <p className="truncate text-[12px] text-neutral-500">
                      {m.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} how ${m.label.toLowerCase()} is measured`}
                    onClick={() => setOpenId(open ? null : m.id)}
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] border border-neutral-200/70 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950",
                      "hover:text-neutral-900 dark:hover:text-white",
                      transition,
                      focus,
                    )}
                  >
                    <ArrowUpRight
                      className={cx(
                        "h-4 w-4",
                        transition,
                        open && "rotate-90",
                        "motion-reduce:transition-none",
                      )}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div
                  className={cx(
                    "grid px-3 transition-[grid-template-rows] duration-200 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    "motion-reduce:transition-none",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-3 text-[12px] leading-relaxed text-neutral-500">
                      {m.caption}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
