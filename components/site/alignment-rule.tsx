"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function AlignmentRule({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div aria-hidden className={cn("w-px bg-oxide", className)} />;
  }

  return (
    <motion.div
      aria-hidden
      className={cn("w-px origin-top bg-oxide", className)}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
