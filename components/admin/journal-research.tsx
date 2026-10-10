"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { composeJournalDraft, findJournalPapers, type FoundPaper } from "@/app/admin/journal/actions";
import { Field, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";

const steps = ["Searching the spine literature", "Reading the papers", "Writing the clinic note"] as const;

export function JournalResearch() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState(0);
  const [busy, setBusy] = useState(false);
  const [papers, setPapers] = useState<FoundPaper[]>([]);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPapers([]);
    setBusy(true);
    setPhase(1);
    const found = await findJournalPapers(topic);
    if ("error" in found) {
      setError(found.error);
      setBusy(false);
      setPhase(0);
      return;
    }
    setPapers(found.papers);
    setPhase(3);
    const draft = await composeJournalDraft(topic, found.papers);
    if ("error" in draft) {
      setError(draft.error);
      setBusy(false);
      setPhase(0);
      return;
    }
    setPhase(3);
    router.push(`/admin/journal/${draft.id}`);
    router.refresh();
  }

  return (
    <section className={`${panelClass} mt-8`}>
      <h2 className="font-display text-2xl">New draft</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        The search lists the papers first, with links, and then writes a full note in the clinic&apos;s voice. It stays a draft until you approve it.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <Field label="Topic">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className={fieldClass}
            placeholder="Lumbar spinal stenosis"
            maxLength={180}
            disabled={busy}
          />
        </Field>
        <Button className="justify-self-start" disabled={busy}>
          {busy ? "Working" : "Research journals and draft"}
        </Button>
      </form>
      {phase > 0 ? (
        <ol className="mt-6 grid gap-2 text-sm" aria-live="polite">
          {steps.map((label, index) => {
            const current = index + 1;
            const state = phase > current ? "Done" : phase === current ? "Now" : "Waiting";
            return (
              <li key={label} className={phase === current ? "font-semibold text-ink" : "text-muted"}>
                <span className="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">{state}</span>
                {label}
              </li>
            );
          })}
        </ol>
      ) : null}
      {papers.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {papers.map((paper) => (
            <li key={paper.pmid} className="rounded-2xl border border-line px-4 py-3 text-sm">
              <a className="font-medium underline underline-offset-4" href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}>
                {paper.title}
              </a>
              <span className="mt-1 block text-muted">
                {paper.journal}
                {paper.year ? ` · ${paper.year}` : ""} · PMID {paper.pmid}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-emergency">
          {error}
        </p>
      ) : null}
    </section>
  );
}
