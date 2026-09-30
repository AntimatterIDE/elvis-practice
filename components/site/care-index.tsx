"use client";

import { useState } from "react";
import { carePathways } from "@/lib/site";

export function CareIndex() {
  const [openId, setOpenId] = useState<string | null>(carePathways[0]?.id ?? null);

  return (
    <div className="border-t border-line">
      {carePathways.map((item) => {
        const open = openId === item.id;
        const panelId = `${item.id}-panel`;
        return (
          <div key={item.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-6 py-6 text-left"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className="font-display text-4xl leading-none md:text-5xl">{item.label}</span>
                <span className="text-sm text-oxide">{open ? "Close" : "Read"}</span>
              </button>
            </h3>
            {open ? (
              <div id={panelId} className="max-w-xl pb-6 text-lg leading-relaxed text-muted">
                <p>{item.body}</p>
                {"href" in item && item.href ? (
                  <a className="mt-4 inline-block text-ink underline underline-offset-4" href={item.href}>
                    Continue to the visit page
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
