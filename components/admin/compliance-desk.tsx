"use client";

import { useEffect, useState } from "react";
import { askComplianceAssistant, reviseBaaDraft } from "@/app/admin/compliance/actions";
import { loadComplianceDeskAction, upsertComplianceDeskAction } from "@/app/admin/desk/actions";
import { PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
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
  type VendorBaa,
} from "@/lib/compliance/hipaa-baa";
import { cn } from "@/lib/utils";

const storageKey = "alignment-compliance-v1";

type Turn = { role: "user" | "assistant"; content: string };

type Saved = {
  checked: string[];
  drafts: Record<string, string>;
  messages: Turn[];
  updatedAt?: string;
};

const emptySaved: Saved = { checked: [], drafts: {}, messages: [], updatedAt: "" };

function readSaved(): Saved {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "") as Partial<Saved>;
    const drafts = parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {};
    return {
      checked: Array.isArray(parsed.checked) ? parsed.checked.filter((id) => typeof id === "string") : [],
      drafts: Object.fromEntries(Object.entries(drafts).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.filter((turn): turn is Turn => (turn?.role === "user" || turn?.role === "assistant") && typeof turn.content === "string").slice(-20)
        : [],
    };
  } catch {
    return emptySaved;
  }
}

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

function CheckList({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: { id: string; label: string }[];
  checked: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => {
          const on = checked.includes(item.id);
          return (
            <li key={item.id}>
              <label className={cn("flex cursor-pointer gap-3 text-sm text-neutral-800", on && "text-neutral-500 line-through")}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-oxide"
                  checked={on}
                  onChange={() => onToggle(item.id)}
                />
                <span>{item.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AgreementDraft({
  vendor,
  body,
  onChange,
}: {
  vendor: VendorBaa;
  body: string;
  onChange: (body: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(body));
  const [instruction, setInstruction] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  async function write() {
    setPending(true);
    setNotice("");
    const result = await reviseBaaDraft({ vendorId: vendor.id, body, instruction });
    setPending(false);
    if ("body" in result && result.body) {
      onChange(result.body);
      setInstruction("");
      setOpen(true);
      setNotice("Draft updated. Counsel still has to review it before anyone signs.");
      return;
    }
    setNotice("message" in result && result.message ? result.message : "The draft could not be written.");
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide agreement" : body ? "Open agreement" : "Draft agreement"}
        </Button>
        {body ? <span className="text-xs text-oxide">Draft saved for the practice</span> : null}
      </div>
      {open ? (
        <div className="mt-4 grid gap-3">
          <p className="text-xs leading-relaxed text-muted">
            A draft for counsel. It is not signed, and it is not legal advice.
          </p>
          <label className="grid gap-2 text-sm font-medium">
            Agreement
            <textarea
              className={`${fieldClass} min-h-72 font-normal leading-relaxed`}
              value={body}
              onChange={(event) => onChange(event.target.value)}
              placeholder="The draft appears here. You can edit it directly, or ask the assistant to rewrite it."
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Change to make
            <input
              className={fieldClass}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Example: make the breach notice 10 days and name New York law"
              disabled={pending}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => void write()}>
              {pending ? "Writing…" : body ? "Revise with AI" : "Write a first draft"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!body}
              onClick={() => {
                void navigator.clipboard.writeText(body).then(
                  () => setNotice("Copied."),
                  () => setNotice("Select the agreement and copy it from there."),
                );
              }}
            >
              Copy
            </Button>
          </div>
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ComplianceDesk() {
  const legal = checklist.filter((item) => item.group === "legal");
  const technical = checklist.filter((item) => item.group === "technical");
  const [saved, setSaved] = useState<Saved>(emptySaved);
  const [hydrated, setHydrated] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [assistantNote, setAssistantNote] = useState("");

  useEffect(() => {
    let cancel = false;
    async function hydrate() {
      const local = readSaved();
      const remote = await loadComplianceDeskAction();
      if (cancel) return;
      if (remote.ok && remote.payload) {
        const remoteStamp = remote.payload.updatedAt || "";
        const localStamp = local.updatedAt || "";
        setSaved(remoteStamp >= localStamp ? { ...remote.payload, updatedAt: remoteStamp } : local);
      } else {
        setSaved(local);
      }
      setHydrated(true);
    }
    void hydrate();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stamp = saved.updatedAt || new Date().toISOString();
    const next = { ...saved, updatedAt: stamp };
    localStorage.setItem(storageKey, JSON.stringify(next));
    const timer = setTimeout(() => {
      void upsertComplianceDeskAction({
        checked: next.checked,
        drafts: next.drafts,
        messages: next.messages,
        updatedAt: stamp,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, saved]);

  function toggle(id: string) {
    setSaved((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      checked: current.checked.includes(id) ? current.checked.filter((item) => item !== id) : [...current.checked, id],
    }));
  }

  function setDraft(id: string, body: string) {
    setSaved((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      drafts: { ...current.drafts, [id]: body },
    }));
  }

  async function ask(text: string) {
    const content = text.trim();
    if (!content || asking) return;
    const messages = [...saved.messages, { role: "user" as const, content }];
    setSaved((current) => ({ ...current, messages, updatedAt: new Date().toISOString() }));
    setQuestion("");
    setAssistantNote("");
    setAsking(true);
    const result = await askComplianceAssistant({ messages, checked: saved.checked });
    setAsking(false);
    if ("reply" in result && result.reply) {
      setSaved((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        messages: [...current.messages, { role: "assistant", content: result.reply }],
      }));
      return;
    }
    setAssistantNote("message" in result && result.message ? result.message : "The assistant did not answer.");
  }

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
            <span>
              Checklist · {saved.checked.length} of {checklist.length}
            </span>
          </div>
        }
      />

      <nav aria-label="Compliance sections" className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          ["#checklist", "Checklist"],
          ["#assistant", "Assistant"],
          ["#baas", "Required BAAs"],
          ["#summary", "Summary"],
          ["#phi", "PHI map"],
          ["#gaps", "Gaps"],
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
        <Section id="checklist" title="01 · Checklist">
          <p className="mb-5 text-sm text-muted">
            {saved.checked.length} of {checklist.length} done. Checks stay in this browser.
          </p>
          <div className="grid gap-8 sm:grid-cols-2">
            <CheckList title="Legal / contracts" items={legal} checked={saved.checked} onToggle={toggle} />
            <CheckList title="Technical / ops" items={technical} checked={saved.checked} onToggle={toggle} />
          </div>
        </Section>

        <Section id="assistant" title="02 · Assistant">
          <p className="mb-4 text-sm text-muted">
            Ask what to do next, or what a clause should cover. The assistant can see which checklist items are done. It does not sign anything.
          </p>
          <div className={panelClass}>
            <div className="grid gap-3">
              {saved.messages.length ? (
                <ol className="grid max-h-80 gap-3 overflow-y-auto">
                  {saved.messages.map((turn, index) => (
                    <li key={`${turn.role}-${index}`} className={cn("text-sm leading-relaxed", turn.role === "user" ? "text-neutral-900" : "text-neutral-700")}>
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                        {turn.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span className="whitespace-pre-wrap">{turn.content}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">No questions yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {["What should we sign first?", "Which checklist items are still open?"].map((prompt) => (
                  <Button key={prompt} type="button" variant="secondary" disabled={asking} onClick={() => void ask(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask(question);
                }}
              >
                <label className="grid gap-2 text-sm font-medium">
                  Question
                  <input
                    className={fieldClass}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about a vendor, a clause, or the next step"
                    disabled={asking}
                  />
                </label>
                <Button type="submit" disabled={asking || !question.trim()} className="justify-self-start">
                  {asking ? "Asking…" : "Ask"}
                </Button>
              </form>
              {assistantNote ? <p className="text-sm text-muted">{assistantNote}</p> : null}
            </div>
          </div>
        </Section>

        <Section id="summary" title="03 · Executive summary">
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

        <Section id="baas" title="04 · Required BAAs">
          <p className="mb-5 text-sm text-muted">
            Seven agreements before real patients. Open one to write a draft, edit it, or have the assistant revise it. Drafts stay in this browser.
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
                    <AgreementDraft vendor={vendor} body={saved.drafts[vendor.id] ?? ""} onChange={(body) => setDraft(vendor.id, body)} />
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

        <Section id="phi" title="05 · PHI data map">
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

        <Section id="gaps" title="06 · Gaps beyond BAAs">
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

        <Section id="cost" title="07 · Cost note">
          <p className="text-xs leading-relaxed text-muted">{costNote}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Prepared by practice zero for {complianceMeta.coveredEntity} · Re-check vendor status if
            go-live slips more than 30 days.
          </p>
        </Section>
      </div>
    </main>
  );
}
