export function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 md:px-8" aria-live="polite">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">Loading</p>
      <div className="mt-6 h-12 w-2/3 max-w-md bg-line/70" />
      <div className="mt-4 h-4 w-full max-w-xl bg-line/50" />
      <div className="mt-2 h-4 w-5/6 max-w-lg bg-line/50" />
    </div>
  );
}
