export function SagittalMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 240" className={className} aria-hidden>
      <path
        d="M40 10 C58 42 22 72 40 104 C60 138 20 168 40 202 C48 220 40 230 40 232"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function PhotoPlaceholder({
  label = "Photograph pending",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <figure className={`relative flex min-h-72 flex-col justify-between border border-line bg-card p-6 text-oxide ${className}`}>
      <SagittalMotif className="h-48 w-16" />
      <figcaption className="text-xs uppercase tracking-[0.16em] text-muted">{label}</figcaption>
    </figure>
  );
}
