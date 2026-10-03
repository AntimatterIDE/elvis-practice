function Line({ className, children, viewBox }: { className?: string; children: React.ReactNode; viewBox: string }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" className={className}>
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

export function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
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
