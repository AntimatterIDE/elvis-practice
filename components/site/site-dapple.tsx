"use client";

import DappledLight from "@/components/react-bits/dappled-light";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SiteDapple({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <DappledLight
      plant="olive"
      placement="top-left"
      backgroundColor="#f3f7fb"
      lightColor="#fffaf3"
      shadowColor="#c5d0dc"
      window="off"
      wind={0.4}
      shadowStrength={0.8}
      softness={1.2}
      grain={0.12}
      className={cn("h-auto w-full", className)}
    >
      {children}
    </DappledLight>
  );
}
