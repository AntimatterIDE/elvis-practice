import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/control";

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlClass,
        "min-h-12 px-4 py-3.5 pr-10",
        "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%20fill%3D%22none%22%20stroke%3D%22%230a6e66%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E']) bg-[right_14px_center] bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}
