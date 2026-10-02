import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/control";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-32", className)} {...props} />;
}
