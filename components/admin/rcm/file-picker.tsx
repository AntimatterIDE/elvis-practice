"use client";

import { Button } from "@/components/ui/button";

export function FilePicker({
  label,
  busy,
  variant,
  accept,
  onFiles,
}: {
  label: string;
  busy: boolean;
  variant: "primary" | "secondary";
  accept: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <span className={`relative inline-flex rounded-[var(--rb-r-lg,10px)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${busy ? "pointer-events-none opacity-50" : ""}`}>
      <Button type="button" variant={variant} tabIndex={-1} aria-hidden>
        {busy ? "Uploading…" : label}
      </Button>
      <input
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        multiple
        disabled={busy}
        aria-label={label}
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (chosen.length) onFiles(chosen);
        }}
      />
    </span>
  );
}
