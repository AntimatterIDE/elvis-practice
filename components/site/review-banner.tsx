export function ReviewBanner({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-line bg-mist px-4 py-3 text-sm leading-relaxed text-ink" role="note">
      {children}
    </p>
  );
}
