import {
  architectureBlurb,
  codingSourceGroups,
  leastResistanceSteps,
  statusLabel,
  type CodingSource,
  type SourceStatus,
} from "@/lib/dev/coding-sources";

const statusClass: Record<SourceStatus, string> = {
  have: "border-oxide/25 bg-mint text-oxide-ink",
  need_free: "border-clinic-blue/20 bg-clinic-blue-soft text-clinic-blue",
  need_paid: "border-gold/30 bg-[#f7efd6] text-gold",
  optional: "border-neutral-200 bg-neutral-50 text-neutral-600",
  practice: "border-pine/15 bg-mist text-pine",
};

function countByStatus(status: SourceStatus) {
  return codingSourceGroups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.status === status).length,
    0,
  );
}

function StatusPill({ status }: { status: SourceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] ${statusClass[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function SourceCard({ item, index }: { item: CodingSource; index: number }) {
  const external = item.url.startsWith("http");
  return (
    <article className="group relative overflow-hidden rounded-[1.35rem] border border-line/90 bg-white/90 p-5 shadow-[0_20px_50px_-40px_rgb(7_30_54_/_0.55)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-oxide/35 hover:shadow-[0_28px_60px_-36px_rgb(10_110_102_/_0.45)] sm:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[radial-gradient(circle_at_center,rgb(14_143_132_/_0.12),transparent_68%)] opacity-0 transition duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-neutral-400">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1.5 font-display text-[1.35rem] leading-snug tracking-[-0.02em] text-ink">
            {item.name}
          </h3>
        </div>
        <StatusPill status={item.status} />
      </div>
      <p className="relative mt-4 text-[15px] leading-relaxed text-muted">{item.whatItGives}</p>
      <dl className="relative mt-5 grid gap-4 border-t border-line/80 pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Where to get it
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-ink/80">{item.where}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Source link</dt>
          <dd className="mt-1.5">
            <a
              href={item.url}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-clinic-blue transition hover:text-oxide-deep"
            >
              <span className="truncate">{item.url.replace(/^https?:\/\//, "")}</span>
              {external ? (
                <span aria-hidden className="shrink-0 text-oxide">
                  ↗
                </span>
              ) : null}
            </a>
          </dd>
        </div>
        {item.fileOnDisk ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">In this repo</dt>
            <dd className="mt-1.5 rounded-lg bg-pine/[0.04] px-2.5 py-2 font-mono text-[12px] leading-snug text-pine">
              {item.fileOnDisk}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Refresh</dt>
          <dd className="mt-1.5 text-sm text-muted">{item.refresh}</dd>
        </div>
        {item.notes ? (
          <div className="sm:col-span-2 rounded-xl border border-dashed border-line bg-paper/80 px-3.5 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Note</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{item.notes}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export function CodingDataDesk() {
  const have = countByStatus("have");
  const needFree = countByStatus("need_free");
  const needPaid = countByStatus("need_paid");
  const practice = countByStatus("practice");

  return (
    <main className="grid gap-14 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,#071e36_0%,#0b3d78_42%,#0a6e66_100%)] px-6 py-10 text-white shadow-[0_40px_80px_-48px_rgb(7_30_54_/_0.85)] sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(159,227,216,0.35), transparent 34%), radial-gradient(circle at 88% 12%, rgba(185,212,245,0.28), transparent 30%), linear-gradient(180deg, transparent, rgba(7,30,54,0.35))",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, rgba(255,255,255,0.45) 0 1px, transparent 1px 14px)",
          }}
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foam/90">
            Partner brief · staff only · not indexed
          </p>
          <h1 className="mt-4 font-display text-[2.35rem] leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
            Exact data for <span className="italic text-foam">impenetrable</span> code generation
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/78">
            Spine coding that cannot invent codes. Published CMS and AMA sources feed the rules and the validator.
            The path of least resistance is below — free CMS edits first, AMA only when we need official CPT text.
          </p>
        </div>
        <dl className="relative mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["On disk", have, "Ready to use"],
            ["Free — get next", needFree, "CMS NCCI pack"],
            ["Paid — AMA", needPaid, "Distributor license"],
            ["Practice", practice, "NPI, notes, EIN"],
          ].map(([label, value, hint]) => (
            <div
              key={label as string}
              className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-md"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</dt>
              <dd className="mt-1 font-display text-3xl tracking-tight text-white">{value}</dd>
              <dd className="mt-0.5 text-xs text-white/60">{hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="least-resistance"
        className="scroll-mt-8 overflow-hidden rounded-[2rem] border border-oxide/20 bg-[linear-gradient(180deg,#ffffff_0%,#eef8f6_100%)] p-6 shadow-[0_30px_70px_-48px_rgb(10_110_102_/_0.55)] sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-oxide/15 pb-6">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oxide">Start here</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.02em] text-ink sm:text-4xl">
              Path of least resistance
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              The shortest route to claim-safe, edit-exact coding without waiting on AMA. Five moves. Do them in order.
            </p>
          </div>
          <p className="rounded-full border border-oxide/25 bg-mint px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-oxide-ink">
            Recommended sequence
          </p>
        </div>

        <ol className="relative mt-8 grid gap-0">
          <div
            className="pointer-events-none absolute bottom-6 left-[1.35rem] top-6 hidden w-px bg-[linear-gradient(180deg,#0e8f84,rgba(14,143,132,0.15))] sm:block"
            aria-hidden
          />
          {leastResistanceSteps.map((item, index) => (
            <li
              key={item.step}
              className="relative grid gap-4 py-5 sm:grid-cols-[3.2rem_minmax(0,1fr)] sm:gap-6 sm:py-6"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="relative z-[1] flex sm:justify-center">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-oxide/30 bg-white font-display text-xl text-oxide shadow-[0_10px_24px_-16px_rgb(10_110_102_/_0.9)]">
                  {item.step}
                </span>
              </div>
              <div className="rounded-2xl border border-line/80 bg-white/90 px-5 py-4 transition duration-300 hover:border-oxide/35">
                <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-5 rounded-[1.75rem] border border-line bg-white/80 p-6 sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Architecture</p>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.02em] text-ink">{architectureBlurb.title}</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {architectureBlurb.points.map((point, index) => (
            <li
              key={point}
              className="rounded-2xl border border-line bg-paper/70 px-4 py-4 text-sm leading-relaxed text-muted"
            >
              <span className="mb-2 block font-mono text-[11px] tracking-[0.16em] text-oxide">
                {String(index + 1).padStart(2, "0")}
              </span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Legend</p>
          {(Object.keys(statusLabel) as SourceStatus[]).map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </section>

      {codingSourceGroups.map((group) => (
        <section key={group.id} className="grid gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Dataset group</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.02em] text-ink">{group.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{group.lede}</p>
          </div>
          <ul className="grid gap-4">
            {group.items.map((item, index) => (
              <li key={item.id}>
                <SourceCard item={item} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="rounded-[1.5rem] border border-line bg-pine px-6 py-6 text-sm leading-relaxed text-white/70 sm:px-8">
        <p className="font-display text-xl text-white">Keep this page current</p>
        <p className="mt-2 max-w-2xl">
          Checklist data lives in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-foam">
            lib/dev/coding-sources.ts
          </code>{" "}
          and is mirrored in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-foam">
            docs/spine-coding/plan.md
          </code>{" "}
          §3.1. Staff login required. Not for public SEO.
        </p>
      </footer>
    </main>
  );
}
