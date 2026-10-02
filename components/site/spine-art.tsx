import { cn } from "@/lib/utils";

/** Lateral lumbar vertebra. The body is the block; the fin is the spinous process. */
const bone = "M2 4q16 4 32 0v5c10 1 18 4 26 7l-2 6c-8-3-16-5-24-5v6q-16-4-32 0z";

const vertebrae = [
  { x: 34, y: 2, r: -5 },
  { x: 30, y: 36, r: -2 },
  { x: 28, y: 70, r: 0 },
  { x: 30, y: 104, r: 3 },
  { x: 36, y: 138, r: 6 },
  { x: 44, y: 172, r: 9 },
];

export function SpineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 210" preserveAspectRatio="xMidYMid meet" className={cn("spine-plate", className)} aria-hidden>
      <path d="M14 8v194" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.28" />
      {vertebrae.map((item) => (
        <path
          key={item.y}
          d={bone}
          fill="currentColor"
          transform={`translate(${item.x} ${item.y}) rotate(${item.r})`}
        />
      ))}
    </svg>
  );
}
