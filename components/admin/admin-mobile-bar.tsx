"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { AdminNav, currentDeskLabel } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/site/brand";
import { practice } from "@/lib/site";

export function AdminMobileBar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const label = currentDeskLabel(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur md:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <BrandMark className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{practice.name}</p>
          <p className="truncate font-display text-lg leading-tight">{label}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line bg-card px-3 py-2 text-sm font-semibold"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <div className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-pine px-3 py-4 text-paper">
          <AdminNav onNavigate={() => setOpen(false)} />
          <div className="mt-6 border-t border-white/10 px-3 pt-4">
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foam/70">{role}</p>
            <form action={signOut} className="mt-3">
              <button className="text-sm text-paper/70 underline decoration-white/30 underline-offset-4">Sign out</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
