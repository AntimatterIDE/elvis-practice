export function StickyContact() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:hidden">
      <a
        href="/contact"
        className="flex h-11 items-center justify-center rounded-full bg-oxide text-sm font-semibold text-paper"
      >
        Contact the practice
      </a>
    </div>
  );
}
