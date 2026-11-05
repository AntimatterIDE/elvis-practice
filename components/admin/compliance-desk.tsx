import { PageHeader, panelClass } from "@/components/admin/rcm/ui";
import {
  checklist,
  complianceGaps,
  complianceMeta,
  costNote,
  executiveSummary,
  freezeNote,
  keepOffPhi,
  phiBuckets,
  phiFlows,
  phiTables,
  thisWeekOrder,
  vendorBaas,
} from "@/lib/compliance/hipaa-baa";
import { cn } from "@/lib/utils";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PriorityMark({ n }: { n: number }) {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-medium text-white">
      {n}
    </span>
  );
}

export function ComplianceDesk() {
  const legal = checklist.filter((item) => item.group === "legal");
  const technical = checklist.filter((item) => item.group === "technical");

  return (
    <main>
      <PageHeader
        kicker="Clinic"
        title="Compliance"
        lede={`HIPAA Business Associate requirements for ${complianceMeta.coveredEntity} on ${complianceMeta.productionSite}. What must be in place across the live site and practice desk before real patients are onboarded.`}
        meta={
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span>Covered entity · {complianceMeta.coveredEntity}</span>
            <span>Platform · {complianceMeta.platform}</span>
            <span>Brief · {complianceMeta.prepared}</span>
          </div>
        }
      />

      <nav aria-label="Compliance sections" className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          ["#summary", "Summary"],
          ["#baas", "Required BAAs"],
          ["#phi", "PHI map"],
          ["#gaps", "Gaps"],
          ["#checklist", "Checklist"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 hover:border-neutral-300 hover:text-neutral-900"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-10 grid max-w-4xl gap-12">
        <Section id="summary" title="01 · Executive summary">
          <div className="grid gap-4">
            <p className="text-sm leading-relaxed text-neutral-800">{executiveSummary}</p>
            <p className="text-sm leading-relaxed text-neutral-800">{thisWeekOrder}</p>
            <aside className={cn(panelClass, "border-amber-200 bg-amber-50/60")}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-800">Operational freeze</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-950">{freezeNote}</p>
            </aside>
            <p className="text-xs leading-relaxed text-muted">{complianceMeta.disclaimer}</p>
          </div>
        </Section>

        <Section id="baas" title="02 · Required BAAs">
          <p className="mb-5 text-sm text-muted">
            Seven agreements before real patients. Sign in priority order.
          </p>
          <ol className="grid gap-4">
            {vendorBaas.map((vendor) => (
              <li key={vendor.id} className={panelClass}>
                <div className="flex flex-wrap items-start gap-3">
                  <PriorityMark n={vendor.priority} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-medium text-neutral-900">{vendor.party}</h3>
                      <span className="text-xs text-oxide">{vendor.action}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{vendor.role}</p>
                    <p className="mt-2 text-sm text-neutral-800">
                      <span className="text-muted">BAA · </span>
                      {vendor.baaPath}
                    </p>
                    <ul className="mt-3 grid gap-1.5 text-sm leading-relaxed text-neutral-700">
                      {vendor.detail.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    {vendor.docs ? (
                      <a
                        href={vendor.docs}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900"
                      >
                        Vendor docs
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-neutral-900">No BAA possible — keep off PHI</h3>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {keepOffPhi.map((item) => (
                <li key={item.vendor} className="flex flex-wrap items-baseline justify-between gap-3 py-3 text-sm">
                  <span className="font-medium text-neutral-900">{item.vendor}</span>
                  <span className="text-muted">{item.control}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="phi" title="03 · PHI data map">
          <p className="mb-5 text-sm text-muted">
            Where protected health information flows on the live architecture.
          </p>
          <div className="grid gap-4">
            {phiFlows.map((flow) => (
              <div key={flow.label} className={panelClass}>
                <h3 className="text-sm font-medium text-neutral-900">{flow.label}</h3>
                <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-neutral-700">
                  {flow.path.map((step, index) => (
                    <li key={`${flow.label}-${step}`} className="inline-flex items-center gap-1.5">
                      {index > 0 ? <span className="text-neutral-400" aria-hidden>→</span> : null}
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Primary PHI tables</h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {phiTables.map((table) => (
                  <li
                    key={table}
                    className="rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs text-neutral-800"
                  >
                    {table}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Storage buckets</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {phiBuckets.map((bucket) => (
                  <li key={bucket.name} className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs text-neutral-800">{bucket.name}</span>
                    <span className={bucket.phi ? "text-emergency" : "text-muted"}>
                      {bucket.phi ? "PHI" : bucket.note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="gaps" title="04 · Gaps beyond BAAs">
          <p className="mb-5 text-sm text-muted">
            Non-BAA gaps that still fail a risk assessment.
          </p>
          <ul className="grid gap-3">
            {complianceGaps.map((item) => (
              <li key={item.gap} className={panelClass}>
                <h3 className="text-sm font-medium text-neutral-900">{item.gap}</h3>
                <p className="mt-1 text-sm text-muted">Risk · {item.risk}</p>
                <p className="mt-2 text-sm text-neutral-800">{item.mitigation}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="checklist" title="05 · This-week checklist">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Legal / contracts</h3>
              <ul className="mt-3 grid gap-2">
                {legal.map((item) => (
                  <li key={item.id} className="flex gap-3 text-sm text-neutral-800">
                    <span
                      className="mt-0.5 size-4 shrink-0 rounded border border-neutral-300 bg-white"
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Technical / ops</h3>
              <ul className="mt-3 grid gap-2">
                {technical.map((item) => (
                  <li key={item.id} className="flex gap-3 text-sm text-neutral-800">
                    <span
                      className="mt-0.5 size-4 shrink-0 rounded border border-neutral-300 bg-white"
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-muted">{costNote}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Prepared by practice zero for {complianceMeta.coveredEntity} · Re-check vendor status if
            go-live slips more than 30 days.
          </p>
        </Section>
      </div>
    </main>
  );
}
