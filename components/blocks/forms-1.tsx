"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Hash,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,transform] duration-150 ease-out";

const field =
  "h-9 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 hover:border-neutral-300 focus:border-neutral-900 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-neutral-700 dark:focus:border-white";

type SelectOption = { value: string; label: string; hint?: string };

function Select({
  id,
  value,
  onChange,
  options,
  disabled,
  placeholder = "Select…",
  className,
  triggerClassName,
  leading,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  leading?: ReactNode;
  ariaLabel?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const openList = (index?: number) => {
    if (disabled) return;
    const node = rootRef.current;
    const win = node?.ownerDocument.defaultView;
    if (node && win) {
      const r = node.getBoundingClientRect();
      const room = win.innerHeight - r.bottom;
      const needed = Math.min(options.length * 32 + 8, 264);
      setFlip(room < needed + 8 && r.top > room);
    }
    setActive(index ?? (selectedIndex >= 0 ? selectedIndex : 0));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const node = rootRef.current;
    const doc = node?.ownerDocument;
    if (!doc) return;
    const onPointer = (e: Event) => {
      if (!node.contains(e.target as Node)) setOpen(false);
    };
    doc.addEventListener("mousedown", onPointer);
    doc.addEventListener("touchstart", onPointer);
    return () => {
      doc.removeEventListener("mousedown", onPointer);
      doc.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [open, active]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(active);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.buffer = now - t.at > 700 ? e.key : t.buffer + e.key;
      t.at = now;
      const hit = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(t.buffer.toLowerCase()),
      );
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        className={cx(
          field,
          "flex cursor-pointer items-center justify-between gap-2 pr-2.5 text-left",
          focus,
          "focus-visible:outline-offset-[-2px]",
          open && "border-neutral-900 dark:border-white",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leading}
          <span
            className={cx(
              "truncate",
              !selected && "text-neutral-400 dark:text-neutral-500",
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cx(
            "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150 ease-out motion-reduce:transition-none dark:text-neutral-600",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={cx(
            "absolute z-30 max-h-[264px] w-full overflow-y-auto rounded-[var(--rb-r-lg,10px)] border border-neutral-200 bg-white p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] dark:border-neutral-800 dark:bg-neutral-900",
            flip ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                data-index={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={cx(
                  "flex h-8 cursor-pointer items-center justify-between gap-2 rounded-[var(--rb-r-sm,6px)] px-2.5 text-sm text-neutral-900 dark:text-neutral-100",
                  i === active && "bg-neutral-100 dark:bg-neutral-800",
                )}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate">{o.label}</span>
                  {o.hint && (
                    <span className="shrink-0 text-xs text-neutral-500">
                      {o.hint}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-neutral-900 dark:text-white"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const btnSecondary = cx(
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
  transition,
  focus,
);

const btnPrimary = cx(
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-3 text-sm font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(20.5%_0_0))_90%,transparent)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))] dark:hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(100%_0_0))_90%,transparent)]",
  transition,
  focus,
);

const CREWS = [
  "Coastal survey team",
  "Estuary monitoring team",
  "Upland transect team",
];

const VISIBILITY = [
  { value: "internal", label: "Institute only" },
  { value: "partners", label: "Institute and partners" },
  { value: "open", label: "Open data portal" },
];

const SUGGESTED = ["Benthic cores", "Water column", "Sediment traps"];

type FormState = {
  title: string;
  station: string;
  vessel: string;
  deployDate: string;
  recoverDate: string;
  window: string;
  crew: string;
  methods: string[];
  visibility: string;
  embargo: boolean;
  photo: string;
};

const INITIAL: FormState = {
  title: "Halcyon Bank autumn sampling",
  station: "HB-14",
  vessel: "RV Silverling",
  deployDate: "2026-09-14",
  recoverDate: "2026-09-27",
  window: "06:30",
  crew: CREWS[0],
  methods: ["Benthic cores", "Water column"],
  visibility: "partners",
  embargo: true,
  photo: "HB",
};

const isFilled = (s: FormState, key: keyof FormState) => {
  const v = s[key];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return true;
  return v.trim().length > 0;
};

const TRACKED: (keyof FormState)[] = [
  "title",
  "station",
  "vessel",
  "deployDate",
  "recoverDate",
  "window",
  "crew",
  "methods",
  "visibility",
  "photo",
];

function Row({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center sm:gap-4">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-900 dark:text-neutral-100"
      >
        {label}
        {hint && (
          <span title={hint} className="inline-flex cursor-help">
            <CircleHelp
              aria-hidden="true"
              className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600"
            />
            <span className="sr-only">{hint}</span>
          </span>
        )}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function Forms1() {
  const [state, setState] = useState<FormState>(INITIAL);
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(INITIAL),
    [state],
  );

  const filled = TRACKED.filter((k) => isFilled(state, k)).length;
  const percent = Math.round((filled / TRACKED.length) * 100);

  const addMethod = (value: string) => {
    const name = value.trim();
    if (!name || state.methods.includes(name)) return;
    set("methods", [...state.methods, name]);
    setDraft("");
  };

  const removeMethod = (name: string) =>
    set(
      "methods",
      state.methods.filter((m) => m !== name),
    );

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMethod(draft);
    } else if (e.key === "Backspace" && draft === "" && state.methods.length) {
      e.preventDefault();
      removeMethod(state.methods[state.methods.length - 1]);
    }
  };

  const remaining = SUGGESTED.filter((s) => !state.methods.includes(s));

  return (
    <div className="flex h-full min-h-[840px] w-full flex-col justify-center overflow-y-auto bg-white p-8 sm:p-10 dark:bg-neutral-950">
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? undefined : "translateY(4px)",
          transition: "opacity 300ms ease-out, transform 300ms ease-out",
        }}
        className="mx-auto w-full max-w-[760px] motion-reduce:transition-none"
      >
        <div className="overflow-hidden rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4 bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Survey deployment
              </h2>
              <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-500">
                Station, vessel and sampling window for the cruise plan.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-[var(--rb-r-xs,4px)] bg-neutral-200 dark:bg-neutral-800">
                <div
                  style={{ width: `${percent}%` }}
                  className="h-full rounded-[var(--rb-r-xs,4px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] transition-[width] duration-300 ease-out motion-reduce:transition-none dark:bg-[var(--rb-accent,oklch(100%_0_0))]"
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums text-neutral-600 dark:text-neutral-400">
                {percent}%
              </span>
            </div>
          </div>

          <div className="space-y-4 px-4 py-5">
            <Row label="Survey title" htmlFor="f1-title">
              <input
                id="f1-title"
                value={state.title}
                onChange={(e) => set("title", e.target.value)}
                className={cx(field, focus)}
              />
            </Row>

            <Row
              label="Station code"
              htmlFor="f1-station"
              hint="Grid reference from the standing station register."
            >
              <div className="relative">
                <Hash
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
                />
                <input
                  id="f1-station"
                  value={state.station}
                  onChange={(e) => set("station", e.target.value)}
                  className={cx(field, focus, "pl-9 tabular-nums")}
                />
              </div>
            </Row>

            <Row label="Vessel" htmlFor="f1-vessel">
              <div className="relative">
                <Building2
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
                />
                <input
                  id="f1-vessel"
                  value={state.vessel}
                  onChange={(e) => set("vessel", e.target.value)}
                  className={cx(field, focus, "pl-9")}
                />
              </div>
            </Row>

            <Row
              label="Deployment"
              htmlFor="f1-deploy"
              hint="First day gear enters the water."
            >
              <div className="relative">
                <input
                  id="f1-deploy"
                  type="date"
                  value={state.deployDate}
                  onChange={(e) => set("deployDate", e.target.value)}
                  className={cx(field, focus, "pr-9 tabular-nums")}
                />
                <Calendar
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
                />
              </div>
            </Row>

            <Row label="Recovery" htmlFor="f1-recover">
              <div className="relative">
                <input
                  id="f1-recover"
                  type="date"
                  value={state.recoverDate}
                  onChange={(e) => set("recoverDate", e.target.value)}
                  className={cx(field, focus, "pr-9 tabular-nums")}
                />
                <Calendar
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
                />
              </div>
            </Row>

            <Row label="Daily start" htmlFor="f1-window">
              <div className="relative">
                <Clock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
                />
                <input
                  id="f1-window"
                  type="time"
                  value={state.window}
                  onChange={(e) => set("window", e.target.value)}
                  className={cx(field, focus, "pl-9 tabular-nums")}
                />
              </div>
            </Row>

            <Row label="Methods">
              <div
                onClick={() =>
                  tagInputRef.current?.focus({ preventScroll: true })
                }
                className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2 py-1.5 transition-colors duration-150 focus-within:border-neutral-900 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:focus-within:border-white dark:hover:border-neutral-700"
              >
                {state.methods.map((m) => (
                  <span
                    key={m}
                    className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[var(--rb-r-sm,6px)] bg-neutral-100 pl-2 pr-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => removeMethod(m)}
                      aria-label={`Remove ${m}`}
                      className={cx(
                        "inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-[var(--rb-r-xs,4px)] text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                        transition,
                        focus,
                      )}
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  aria-label="Add a sampling method"
                  placeholder={state.methods.length ? "" : "Add a method"}
                  className="h-6 min-w-24 flex-1 border-0 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
              {remaining.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-neutral-500">Suggested</span>
                  {remaining.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addMethod(s)}
                      className={cx(
                        "inline-flex h-6 cursor-pointer items-center rounded-[var(--rb-r-sm,6px)] bg-neutral-100 px-2 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 active:scale-[0.97] dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
                        transition,
                        focus,
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </Row>

            <Row label="Lead crew" htmlFor="f1-crew">
              <Select
                id="f1-crew"
                value={state.crew}
                onChange={(v) => set("crew", v)}
                options={CREWS.map((c) => ({ value: c, label: c }))}
              />
            </Row>

            <Row label="Data release" htmlFor="f1-visibility">
              <Select
                id="f1-visibility"
                value={state.visibility}
                onChange={(v) => set("visibility", v)}
                options={VISIBILITY}
              />
            </Row>
            <Row label="Embargo">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.embargo}
                  aria-label="Hold results for twelve months"
                  onClick={() => set("embargo", !state.embargo)}
                  className={cx(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out",
                    focus,
                    state.embargo
                      ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]"
                      : "bg-neutral-200 dark:bg-neutral-700",
                  )}
                >
                  <span
                    className={cx(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-neutral-900",
                      state.embargo ? "translate-x-[18px]" : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
                  Hold results for twelve months
                </span>
              </div>
            </Row>

            <Row label="Station photo">
              <div className="flex flex-wrap items-center gap-2">
                {state.photo ? (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {state.photo}
                    </span>
                    <button
                      type="button"
                      onClick={() => set("photo", "")}
                      className={cx(btnSecondary, "h-8")}
                    >
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-600">
                      <Upload aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => set("photo", "HB")}
                      className={cx(btnSecondary, "h-8")}
                    >
                      <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                      Attach photo
                    </button>
                  </>
                )}
              </div>
            </Row>
          </div>

          <div className="flex flex-col-reverse items-stretch gap-2 bg-neutral-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900/60">
            <p className="text-[13px] text-neutral-500 dark:text-neutral-500">
              {dirty
                ? "Unsaved changes to the cruise plan."
                : "Cruise plan matches the filed version."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={!dirty}
                onClick={() => {
                  setState(INITIAL);
                  setDraft("");
                }}
                className={btnSecondary}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Revert
              </button>
              <button type="button" disabled={!dirty} className={btnPrimary}>
                {dirty ? (
                  <Save aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Check aria-hidden="true" className="h-4 w-4" />
                )}
                {dirty ? "Save plan" : "Saved"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
