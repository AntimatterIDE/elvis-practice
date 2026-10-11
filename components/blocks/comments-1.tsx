"use client";

import { useMemo, useState } from "react";
import { CornerUpLeft, MoreHorizontal, Smile } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const frame =
  "rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900";
const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-950";

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

type Reply = {
  id: string;
  author: string;
  role: string;
  time: string;
  body: string;
};

type Thread = Reply & { reactions: number; replies: Reply[] };

const THREADS: Thread[] = [
  {
    id: "t1",
    author: "Priya Nandakumar",
    role: "Platform",
    time: "2h ago",
    body: "The cutover window is tight. If we hold the read replica until the backfill drains we lose the rollback path, so I would rather split this into two deploys.",
    reactions: 4,
    replies: [
      {
        id: "t1r1",
        author: "Marcus Bell",
        role: "Infrastructure",
        time: "1h ago",
        body: "Agreed. Two deploys also means the schema change lands on a quiet day instead of during the migration itself.",
      },
      {
        id: "t1r2",
        author: "Sofia Alvarez",
        role: "Platform",
        time: "48m ago",
        body: "I can prepare the second deploy behind a flag so we can flip it without another release.",
      },
    ],
  },
  {
    id: "t2",
    author: "Wei Chen",
    role: "Data",
    time: "36m ago",
    body: "One caveat: the backfill job reads from the same connection pool as the API. We should cap it at eight workers or the request latency will spike during business hours.",
    reactions: 2,
    replies: [],
  },
  {
    id: "t3",
    author: "Tomás Guerrero",
    role: "Reliability",
    time: "12m ago",
    body: "Added a dashboard for pool saturation so we can watch it live. Alert fires at 80 percent for five minutes.",
    reactions: 1,
    replies: [],
  },
];

const SORTS = ["Newest", "Oldest"] as const;
type Sort = (typeof SORTS)[number];

export default function Comments1() {
  const [sort, setSort] = useState<Sort>("Oldest");
  const [liked, setLiked] = useState<string[]>(["t1"]);
  const [draft, setDraft] = useState("");

  const threads = useMemo(
    () => (sort === "Oldest" ? THREADS : [...THREADS].reverse()),
    [sort],
  );

  const total = THREADS.reduce((sum, t) => sum + 1 + t.replies.length, 0);

  const toggleLike = (id: string) =>
    setLiked((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );

  const Actions = ({ id, reactions }: { id: string; reactions: number }) => {
    const on = liked.includes(id);
    return (
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => toggleLike(id)}
          className={cx(
            "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border px-2 text-[12px] tabular-nums",
            on
              ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-neutral-100",
            transition,
            focus,
          )}
        >
          <Smile className="h-3.5 w-3.5" aria-hidden />
          {reactions + (on ? 1 : 0)}
        </button>
        <button
          type="button"
          className={cx(
            "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] px-2 text-[12px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
            transition,
            focus,
          )}
        >
          <CornerUpLeft className="h-3.5 w-3.5" aria-hidden />
          Reply
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[640px] w-full flex-col justify-center overflow-y-auto bg-white p-6 sm:p-8 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
              Migration plan feedback
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-neutral-500">
              {total} comments · 4 participants
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Sort comments"
            className="flex shrink-0 items-center gap-0.5 rounded-[var(--rb-r-lg,10px)] bg-neutral-100 p-1 dark:bg-neutral-800"
          >
            {SORTS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={option === sort}
                onClick={() => setSort(option)}
                className={cx(
                  "inline-flex h-7 cursor-pointer items-center rounded-[var(--rb-r-sm,6px)] px-2.5 text-[13px]",
                  option === sort
                    ? "bg-white font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-neutral-950 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                  transition,
                  focus,
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={frame}>
          <div
            className={cx(
              panel,
              "max-h-[280px] overflow-y-auto sm:max-h-[368px]",
            )}
          >
            {threads.map((thread) => (
              <article key={thread.id} className="px-4 py-3.5">
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {initials(thread.author)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {thread.author}
                        <span className="ml-2 font-normal text-neutral-500">
                          {thread.role} · {thread.time}
                        </span>
                      </p>
                      <button
                        type="button"
                        aria-label={`More actions on ${thread.author}'s comment`}
                        className={cx(
                          "inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100",
                          transition,
                          focus,
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {thread.body}
                    </p>

                    <Actions id={thread.id} reactions={thread.reactions} />

                    {thread.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l border-neutral-200 pl-4 dark:border-neutral-800">
                        {thread.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5">
                            <span
                              aria-hidden
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {initials(reply.author)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                                {reply.author}
                                <span className="ml-2 font-normal text-neutral-500">
                                  {reply.time}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                {reply.body}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-2 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <label htmlFor="comments-1-draft" className="sr-only">
            Write a comment
          </label>
          <textarea
            id="comments-1-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Write a comment"
            className={cx(
              "w-full resize-none bg-transparent text-[13px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100",
            )}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-[12px] text-neutral-500">
              Mention a teammate with @ to notify them.
            </p>
            <button
              type="button"
              disabled={draft.trim().length === 0}
              className={cx(
                "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] bg-neutral-900 px-3 text-[13px] font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-neutral-100 dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]",
                "hover:bg-neutral-800 dark:hover:bg-white",
                "disabled:pointer-events-none disabled:opacity-40",
                transition,
                focus,
              )}
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
