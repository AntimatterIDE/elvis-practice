import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "min-h-11 rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,#0a6e66)] px-5 py-3 text-[var(--rb-accent-fg,#f3f7fb)] hover:bg-oxide-ink active:scale-[0.99]",
        secondary:
          "min-h-11 rounded-[var(--rb-r-lg,10px)] border border-neutral-200 bg-white px-5 py-3 text-ink hover:bg-neutral-50",
        ghost: "text-ink underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
