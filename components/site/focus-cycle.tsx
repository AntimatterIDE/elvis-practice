"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const lines = [
  "Unhurried visits",
  "Plain-language explanations",
  "Decisions made with you",
  "A plan you can follow",
];

export function FocusCycle() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduce]);

  if (reduce) {
    return (
      <ul className="grid gap-1.5 text-sm font-medium text-foam">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2">
            <Check className="size-4" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
      <Check className="size-4 shrink-0 text-foam" aria-hidden />
      <span className="sr-only">Practice focus: {lines.join(", ")}.</span>
      <span aria-hidden className="relative inline-grid">
        {lines.map((line) => (
          <span key={line} className="invisible col-start-1 row-start-1 px-px whitespace-nowrap">
            {line}
          </span>
        ))}
        <motion.span
          key={lines[index]}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {lines[index]}
        </motion.span>
      </span>
    </p>
  );
}
