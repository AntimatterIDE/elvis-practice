import { Check } from "lucide-react";

const lines = [
  "Unhurried visits",
  "Plain-language explanations",
  "Decisions made with you",
  "A plan you can follow",
];

export function FocusCycle() {
  return (
    <div className="focus-cycle">
      <p
        className="focus-cycle-live inline-flex min-h-9 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-paper"
        aria-hidden
      >
        <Check className="size-4 shrink-0 text-foam" aria-hidden />
        <span className="focus-cycle-track">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      </p>
      <ul className="focus-cycle-static grid gap-1.5 text-sm font-medium text-foam">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2">
            <Check className="size-4" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
