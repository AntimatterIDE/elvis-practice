import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-oxide text-paper shadow-[0_10px_24px_-16px_rgb(14_143_132_/_1)] hover:bg-oxide-deep",
        secondary: "border border-line bg-card text-ink hover:border-oxide/40 hover:text-oxide",
        ghost: "px-0 py-0 text-ink underline decoration-oxide/40 underline-offset-4 hover:translate-y-0 hover:text-oxide",
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
