import { cn } from "@/lib/utils";

const href = "https://www.practicezero.com/";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 64" className={className} aria-hidden="true">
      <ellipse cx="22" cy="32" rx="16" ry="22" fill="none" stroke="currentColor" strokeWidth="5.5" />
      <path d="M10 48 L34 16" stroke="#2D4BF0" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

export function PracticeZeroCredit({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Mark
        className={cn(
          "h-6 w-5 shrink-0",
          dark ? "text-[#F5F4EF] drop-shadow-[0_0_6px_rgba(45,75,240,0.95)]" : "text-neutral-800",
        )}
      />
      <span className={cn("text-[13px] tracking-wide", dark ? "text-[#F5F4EF]/75" : "text-neutral-600")}>
        A{" "}
        <span
          className={cn(
            "font-semibold lowercase tracking-[-0.03em]",
            dark ? "text-[#F5F4EF] [text-shadow:0_0_12px_rgba(45,75,240,0.9)]" : "text-neutral-900",
          )}
        >
          practice zero
        </span>{" "}
        practice
      </span>
    </a>
  );
}
