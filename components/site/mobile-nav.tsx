"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { publicNav } from "@/lib/site";

export function MobileNav() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm lg:hidden">
        <Menu className="size-4" aria-hidden />
        Menu
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-paper px-6 py-6 shadow-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-2xl">Menu</Dialog.Title>
            <Dialog.Close className="inline-flex items-center gap-2 text-sm">
              <X className="size-4" aria-hidden />
              Close
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Primary pages</Dialog.Description>
          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-4">
            {publicNav.map((item) => (
              <Dialog.Close asChild key={item.href}>
                <a className="font-display text-4xl leading-none text-ink" href={item.href}>
                  {item.label}
                </a>
              </Dialog.Close>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
