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
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:hidden">
      <div className="flex h-14 items-center gap-3 px-3">
        <BrandMark className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-neutral-500">{practice.name}</p>
          <p className="truncate text-[13px] font-medium text-neutral-900">{label}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 px-3 text-[13px] font-medium text-neutral-800"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <div className="max-h-[70vh] overflow-y-auto border-t border-neutral-200 bg-neutral-50 px-2 py-3 text-neutral-900">
          <AdminNav onNavigate={() => setOpen(false)} />
          <div className="mt-4 border-t border-neutral-200 px-3 pt-4">
            <p className="text-[13px] font-medium text-neutral-900">{name}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{role}</p>
            <form action={signOut} className="mt-3">
              <button className="text-[13px] text-neutral-600 underline decoration-neutral-300 underline-offset-4">Sign out</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
