"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { IconPlus } from "@/components/site/icons";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header asChild>
      <h2 className="flex">
        <AccordionPrimitive.Trigger
          className={cn(
            "group flex min-h-11 flex-1 items-center justify-between gap-4 py-5 text-left font-display text-xl font-medium leading-snug text-ink transition hover:text-oxide-deep",
            className,
          )}
          {...props}
        >
          {children}
          <IconPlus className="size-3.5 shrink-0 text-oxide-deep" />
        </AccordionPrimitive.Trigger>
      </h2>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className={cn("pb-5 text-lg leading-relaxed text-muted", className)} {...props}>
      {children}
    </AccordionPrimitive.Content>
  );
}
