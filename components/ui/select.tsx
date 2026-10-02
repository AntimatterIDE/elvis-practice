import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/control";

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(controlClass, "min-h-12", className)} {...props} />;
}
