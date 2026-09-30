import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-xl border border-line bg-card px-3 py-3 text-base text-ink shadow-sm placeholder:text-muted/70",
        className,
      )}
      {...props}
    />
  );
}
