export function ReviewBanner({ children }: { children: string }) {
  return (
    <p className="border border-line bg-card px-4 py-3 text-sm text-pine" role="note">
      {children}
    </p>
  );
}
