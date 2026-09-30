export function StickyContact() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 md:hidden">
      <a
        href="/contact"
        className="flex h-11 items-center justify-center bg-oxide text-sm text-paper"
      >
        Contact
      </a>
    </div>
  );
}
