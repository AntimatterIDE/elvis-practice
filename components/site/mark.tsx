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
      <svg viewBox="0 0 32 32" className="size-7" fill="currentColor">
        <path d="M8 2.2h10v2.2h6.2v4.2h-6.2v2.2H8z" />
        <path d="M6 12.2h12.2v2.4h7v4.6h-7v2.4H6z" />
        <path d="M8 22.2h10.4v2.2h6.4v4.2h-6.4v2.2H8z" />
      </svg>
    </span>
  );
}
