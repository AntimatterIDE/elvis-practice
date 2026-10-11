"use client";

import { useState } from "react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,transform] duration-150 ease-out";

const frame =
  "flex flex-col gap-1 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900";

const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-950";

type Member = {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  online: boolean;
  bio: string;
};

const MEMBERS: Member[] = [
  {
    id: "rivera",
    name: "Sam Rivera",
    initials: "SR",
    role: "Product Lead",
    location: "Lisbon",
    online: true,
    bio: "Runs discovery and roadmap for the payments surface.",
  },
  {
    id: "hale",
    name: "Imani Hale",
    initials: "IH",
    role: "Staff Engineer",
    location: "Berlin",
    online: true,
    bio: "Owns the ledger service and the move to event sourcing.",
  },
  {
    id: "okafor",
    name: "Dana Okafor",
    initials: "DO",
    role: "Design Director",
    location: "New York",
    online: false,
    bio: "Sets the visual system and reviews every shipped surface.",
  },
  {
    id: "moss",
    name: "Rowan Moss",
    initials: "RM",
    role: "Data Scientist",
    location: "Toronto",
    online: false,
    bio: "Builds the forecasting models behind the revenue dashboard.",
  },
  {
    id: "silva",
    name: "Nina Silva",
    initials: "NS",
    role: "Support Manager",
    location: "São Paulo",
    online: true,
    bio: "Leads the escalation desk across three regions.",
  },
  {
    id: "abara",
    name: "Tomas Abara",
    initials: "TA",
    role: "Solutions Architect",
    location: "Singapore",
    online: false,
    bio: "Pairs with enterprise accounts through their first integration.",
  },
];

export default function Card1() {
  const [connected, setConnected] = useState<Set<string>>(
    () => new Set(["hale"]),
  );

  const toggle = (id: string) =>
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="h-full min-h-[560px] w-full overflow-y-auto bg-white p-6 sm:p-8 dark:bg-neutral-950">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MEMBERS.map((member) => {
          const isConnected = connected.has(member.id);

          return (
            <li key={member.id} className={frame}>
              <div
                className={cx(
                  panel,
                  "flex flex-1 flex-col items-center px-4 py-6 text-center",
                )}
              >
                <span className="relative">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {member.initials}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 rounded-full bg-white p-0.5 dark:bg-neutral-950"
                  >
                    <span
                      className={cx(
                        "block h-2.5 w-2.5 rounded-full",
                        member.online
                          ? "bg-neutral-900 dark:bg-neutral-100"
                          : "bg-neutral-300 dark:bg-neutral-700",
                      )}
                    />
                  </span>
                </span>

                <p className="mt-3 w-full truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                  {member.name}
                </p>
                <p className="mt-0.5 w-full truncate text-xs text-neutral-500 dark:text-neutral-500">
                  {member.role} · {member.location}
                </p>

                <p className="mt-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {member.bio}
                </p>
              </div>

              <button
                type="button"
                aria-pressed={isConnected}
                onClick={() => toggle(member.id)}
                className={cx(
                  "inline-flex h-10 w-full shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-lg,10px)] px-3 text-[13px] font-medium active:scale-[0.99]",
                  isConnected
                    ? "border border-neutral-200/70 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    : "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(20.5%_0_0))_90%,transparent)] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))] dark:hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(100%_0_0))_90%,transparent)]",
                  transition,
                  focus,
                )}
              >
                {isConnected ? "Connected" : "Connect"}
                <span className="sr-only"> with {member.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
