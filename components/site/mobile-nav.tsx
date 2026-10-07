"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { IconArrow, IconClose, IconMenu } from "@/components/site/icons";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SiteLink } from "@/components/site/site-link";
import { publicNav } from "@/lib/site";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [trackedPath, setTrackedPath] = useState(pathname);

  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-3 text-sm font-medium lg:hidden">
        <IconMenu className="size-4" />
        Menu
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-[2px]" />
        <Dialog.Content className="sheet-in fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card px-6 py-6 shadow-[0_24px_80px_-32px_rgb(7_30_54_/_0.6)]">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="min-w-0 flex-1">
              <Link href="/" className="flex flex-col items-start">
                <span className="font-display text-base font-bold leading-[1.15] text-navy">The Alignment Clinic</span>
                <span className="font-display text-base font-bold leading-[1.15] text-gold">orthopedic spine surgery</span>
              </Link>
            </Dialog.Title>
            <Dialog.Close className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm">
              <IconClose className="size-3.5" />
              Close
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Primary pages</Dialog.Description>
          <nav aria-label="Mobile" className="mt-8 flex flex-col">
            {publicNav.map((item) => (
              <Dialog.Close asChild key={item.href}>
                <SiteLink
                  className="flex min-h-11 items-center justify-between border-b border-line py-3 text-lg font-medium text-ink"
                  activeClassName="text-royal"
                  href={item.href}
                >
                  {item.label}
                  <IconArrow className="size-4 text-royal" />
                </SiteLink>
              </Dialog.Close>
            ))}
            <Dialog.Close asChild>
              <SiteLink
                className="flex min-h-11 items-center justify-between border-b border-line py-3 text-lg font-medium text-ink"
                activeClassName="text-royal"
                href="/portal/login"
              >
                Patient login
                <IconArrow className="size-4 text-royal" />
              </SiteLink>
            </Dialog.Close>
          </nav>
          <Dialog.Close asChild>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-gold-deep px-5 text-sm font-semibold text-paper hover:bg-gold-deep"
            >
              Contact the practice
            </Link>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
