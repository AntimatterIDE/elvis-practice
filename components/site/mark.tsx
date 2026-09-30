import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-pine text-foam shadow-[0_8px_18px_-12px_rgb(7_30_54_/_0.8)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-6">
        <path
          d="M16 3.5c3 3.4-3 5.6 0 9s-3 5.6 0 9 0 5.2 0 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="16" cy="8" r="1.35" fill="#9fe3d8" />
        <circle cx="16" cy="16" r="1.35" fill="#9fe3d8" />
        <circle cx="16" cy="24" r="1.35" fill="#9fe3d8" />
      </svg>
    </span>
  );
}
