import { cn } from "@/lib/utils";

function Line({ className, children, viewBox }: { className?: string; children: React.ReactNode; viewBox: string }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" strokeLinecap="butt">
        {children}
      </g>
    </svg>
  );
}

export function IconArrow({ className }: { className?: string }) {
  return (
    <Line className={className} viewBox="0 0 20 12">
      <path d="M1 6h16" />
      <path d="M12 1.5 17.5 6 12 10.5" />
    </Line>
  );
}

export function IconMenu({ className }: { className?: string }) {
  return (
    <Line className={className} viewBox="0 0 18 14">
      <path d="M1 1h16M1 7h16M1 13h16" />
    </Line>
  );
}

export function IconClose({ className }: { className?: string }) {
  return (
    <Line className={className} viewBox="0 0 14 14">
      <path d="M1 1l12 12M13 1 1 13" />
    </Line>
  );
}

export function IconRule({ className }: { className?: string }) {
  return (
    <Line className={cn("h-2 w-7", className)} viewBox="0 0 28 8">
      <path d="M1 4h26" />
    </Line>
  );
}

export function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path d="M1 7h12" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M7 1v12"
        stroke="currentColor"
        strokeWidth="1.35"
        className="origin-center transition-opacity duration-200 group-data-[state=open]:opacity-0 motion-reduce:transition-none"
      />
    </svg>
  );
}

const miniBone = "M2 4q16 4 32 0v5c10 1 18 4 26 7l-2 6c-8-3-16-5-24-5v6q-16-4-32 0z";

function Column({ className, viewBox, bones }: { className?: string; viewBox: string; bones: { x: number; y: number; r: number }[] }) {
  return (
    <svg viewBox={viewBox} aria-hidden className={className}>
      {bones.map((item) => (
        <path
          key={item.y}
          d={miniBone}
          fill="currentColor"
          transform={`translate(${item.x} ${item.y}) rotate(${item.r}) scale(${viewBox.startsWith("0 0 36") ? 0.28 : 0.4})`}
        />
      ))}
    </svg>
  );
}

/** Smaller bodies, a deeper curve: a cervical column. */
export function IconNeck({ className }: { className?: string }) {
  return (
    <Column
      className={className}
      viewBox="0 0 36 36"
      bones={[
        { x: 8, y: 0, r: -10 },
        { x: 5, y: 9, r: -4 },
        { x: 4, y: 18, r: 3 },
        { x: 7, y: 27, r: 10 },
      ]}
    />
  );
}

/** Larger bodies, a shallower curve: a lumbar column. */
export function IconLowBack({ className }: { className?: string }) {
  return (
    <Column
      className={className}
      viewBox="0 0 40 34"
      bones={[
        { x: 1, y: 0, r: -3 },
        { x: 0, y: 12, r: 1 },
        { x: 2, y: 24, r: 5 },
      ]}
    />
  );
}

/** Two vertebrae joined by a posterior rod. A diagram, not a procedure. */
export function IconAfterSurgery({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 34" aria-hidden className={className}>
      <path d={miniBone} fill="currentColor" transform="translate(0 1) scale(0.38)" />
      <path d={miniBone} fill="currentColor" transform="translate(0 18) scale(0.38)" />
      <path d="M27 8v18" fill="none" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

/** A clinic note: one page, three lines of writing. */
export function IconVisit({ className }: { className?: string }) {
  return (
    <Line className={className} viewBox="0 0 40 36">
      <path d="M6 3h28v30H6z" />
      <path d="M11 12h18M11 18h14M11 24h9" />
    </Line>
  );
}
