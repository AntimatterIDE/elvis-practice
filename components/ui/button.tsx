import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "min-h-11 bg-gold-deep px-5 py-3 text-paper card-shadow hover:bg-gold-deep motion-safe:hover:-translate-y-0.5",
        secondary:
          "min-h-11 border border-line bg-card px-5 py-3 text-ink hover:border-gold/40 motion-safe:hover:-translate-y-0.5",
        ghost: "text-ink underline decoration-gold/40 underline-offset-4 hover:text-royal",
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
