"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type EvalRow = {
  id: string;
  ok: boolean;
  cptHit: boolean;
  icdHit: boolean;
  cpts: string[];
  icds: string[];
  extractWarnings: string[];
  validatorProblems: string[];
};

type EvalResult = {
  count: number;
  passed: number;
  failed: number;
  passRate: number;
  rows: EvalRow[];
  message?: string;
};

export function SpineEvalDesk() {
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(60);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/dev/spine-eval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const payload = (await response.json()) as EvalResult;
      if (!response.ok) {
        setError(payload.message || "Eval failed.");
        return;
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Spine coding live eval</h1>
      <p className="mt-2 text-sm text-muted">
        Runs note → OpenAI fact extract → TypeScript rules → CMS/NCCI on the production server. Staff only. This
        burns OpenAI credits — use before tomorrow&apos;s real claims.
      </p>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Cases
          <input
            type="number"
            min={1}
            max={60}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) || 60)}
            className="mt-1 block w-24 rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <Button type="button" onClick={run} disabled={busy}>
          {busy ? "Running…" : "Run live eval"}
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {result ? (
        <div className="mt-6">
          <p className="text-sm font-medium">
            {result.passed}/{result.count} passed ({Math.round(result.passRate * 100)}%)
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-muted">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">OK</th>
                  <th className="py-2 pr-3">CPT</th>
                  <th className="py-2 pr-3">ICD</th>
                  <th className="py-2 pr-3">Issues</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 align-top">
                    <td className="py-2 pr-3 font-medium">{row.id}</td>
                    <td className="py-2 pr-3">{row.ok ? "pass" : "FAIL"}</td>
                    <td className="py-2 pr-3">{row.cpts.join(", ") || "—"}</td>
                    <td className="py-2 pr-3">{row.icds.join(", ") || "—"}</td>
                    <td className="py-2 pr-3 text-muted">
                      {[...row.extractWarnings, ...row.validatorProblems].join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}
