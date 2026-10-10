"use client";

import { useEffect, useState } from "react";

export function JournalProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-line/70" aria-hidden="true">
      <div className="h-full bg-oxide" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function JournalRail({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [top, setTop] = useState(168);

  useEffect(() => {
    const bar = document.querySelector(".site-bar");
    const measure = () => {
      const height = bar instanceof HTMLElement ? bar.offsetHeight : 0;
      setTop(height + 20);
    };
    measure();
    const watched = new ResizeObserver(measure);
    if (bar instanceof HTMLElement) watched.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      watched.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (sections.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <aside className="hidden w-64 shrink-0 self-start lg:block">
      <nav
        className="sticky z-30 overflow-y-auto overscroll-contain"
        style={{ top, maxHeight: `calc(100vh - ${top}px - 16px)` }}
        aria-label="In this note"
      >
        <ul className="space-y-1 border-l-2 border-line">
          {sections.map((section) => {
            const current = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={current ? "true" : undefined}
                  className={
                    current
                      ? "-ml-0.5 block border-l-2 border-oxide-deep py-1.5 pl-4 text-sm font-medium text-oxide-deep"
                      : "block py-1.5 pl-4 text-sm text-muted hover:text-ink"
                  }
                >
                  {section.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
