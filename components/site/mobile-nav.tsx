"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";
import { Mark } from "@/components/site/mark";
import { practice, publicNav } from "@/lib/site";

export function MobileNav() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-sm font-medium lg:hidden">
        <Menu className="size-4" aria-hidden />
        Menu
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-pine/50 backdrop-blur-[2px]" />
        <Dialog.Content className="sheet-in fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card px-6 py-6 shadow-[0_24px_80px_-32px_rgb(7_30_54_/_0.6)]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-3 font-display text-lg font-semibold">
              <Mark className="size-9" />
              {practice.name}
            </Dialog.Title>
            <Dialog.Close className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm">
              <X className="size-4" aria-hidden />
              Close
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Primary pages</Dialog.Description>
          <nav aria-label="Mobile" className="mt-8 flex flex-col">
            {publicNav.map((item) => (
              <Dialog.Close asChild key={item.href}>
                <a
                  className="flex items-center justify-between border-b border-line py-4 text-lg font-medium text-ink"
                  href={item.href}
                >
                  {item.label}
                  <ArrowRight className="size-4 text-oxide" aria-hidden />
                </a>
              </Dialog.Close>
            ))}
          </nav>
          <Dialog.Close asChild>
            <a
              href="/contact"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3 text-sm font-semibold text-paper"
            >
              Contact the practice
            </a>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
