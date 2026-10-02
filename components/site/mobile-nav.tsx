"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/site/mark";
import { SiteLink } from "@/components/site/site-link";
import { practice, publicNav } from "@/lib/site";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm font-medium lg:hidden">
        <Menu className="size-4" aria-hidden />
        Menu
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-pine/50 backdrop-blur-[2px]" />
        <Dialog.Content className="sheet-in fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card px-6 py-6 shadow-[0_24px_80px_-32px_rgb(7_30_54_/_0.6)]">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="flex min-w-0 items-center gap-3 font-display text-lg font-semibold">
              <Mark className="size-9" />
              <span className="truncate">{practice.name}</span>
            </Dialog.Title>
            <Dialog.Close className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm">
              <X className="size-4" aria-hidden />
              Close
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Primary pages</Dialog.Description>
          <nav aria-label="Mobile" className="mt-8 flex flex-col">
            {publicNav.map((item) => (
              <Dialog.Close asChild key={item.href}>
                <SiteLink
                  className="flex min-h-11 items-center justify-between border-b border-line py-3 text-lg font-medium text-ink"
                  activeClassName="text-oxide-deep"
                  href={item.href}
                >
                  {item.label}
                  <ArrowRight className="size-4 text-oxide-deep" aria-hidden />
                </SiteLink>
              </Dialog.Close>
            ))}
            <Dialog.Close asChild>
              <SiteLink
                className="flex min-h-11 items-center justify-between border-b border-line py-3 text-lg font-medium text-ink"
                activeClassName="text-oxide-deep"
                href="/portal/login"
              >
                Patient login
                <ArrowRight className="size-4 text-oxide-deep" aria-hidden />
              </SiteLink>
            </Dialog.Close>
          </nav>
          <Dialog.Close asChild>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-oxide-deep px-5 text-sm font-semibold text-paper hover:bg-oxide-ink"
            >
              Contact the practice
            </Link>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
