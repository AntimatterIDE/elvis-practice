import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-line bg-card px-3 py-3 text-base text-ink shadow-sm placeholder:text-muted/70",
        className,
      )}
      {...props}
    />
  );
}
