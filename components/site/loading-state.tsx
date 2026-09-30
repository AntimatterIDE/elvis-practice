export function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 md:px-8" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-oxide">Loading</p>
      <div className="mt-6 h-12 w-2/3 max-w-md animate-pulse rounded-2xl bg-line/80" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-line/60" />
      <div className="mt-2 h-4 w-5/6 max-w-lg animate-pulse rounded-full bg-line/60" />
    </div>
  );
}
