import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/control";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlClass, "min-h-12", className)} {...props} />;
}
