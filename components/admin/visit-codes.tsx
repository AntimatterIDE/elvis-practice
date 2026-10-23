"use client";

import { CodeSearch } from "@/components/admin/code-search";
import { fieldClass } from "@/components/admin/rcm/ui";
import type { CodeMatch } from "@/lib/coding/codes";
import type { VisitCode } from "@/lib/encounters/types";
import { diagnosisLimit, pointerLimit } from "@/lib/rcm/claim-rules";

export type LineDraft = { code: string; description: string; units: string; modifiers: string[]; diagnoses: string[] };

export type CodesDraft = { diagnoses: VisitCode[]; lines: LineDraft[] };

export function VisitCodes({
  codes,
  disabled,
  onChange,
}: {
  codes: CodesDraft;
  disabled: boolean;
  onChange: (next: CodesDraft) => void;
}) {
  const { diagnoses, lines } = codes;

  function addDiagnosis(match: CodeMatch) {
    if (diagnoses.some((item) => item.code === match.code)) return;
    onChange({ ...codes, diagnoses: [...diagnoses, { code: match.code, description: match.description, approved: true }] });
  }

  function moveUp(index: number) {
    const next = [...diagnoses];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange({ ...codes, diagnoses: next });
  }

  function removeDiagnosis(code: string) {
    onChange({
      diagnoses: diagnoses.filter((item) => item.code !== code),
      lines: lines.map((line) => ({ ...line, diagnoses: line.diagnoses.filter((item) => item !== code) })),
    });
  }

  function addLine(match: CodeMatch) {
    const first = diagnoses[0]?.code;
    const line: LineDraft = {
      code: match.code,
      description: match.description,
      units: "1",
      modifiers: ["", "", "", ""],
      diagnoses: first ? [first] : [],
    };
    onChange({ ...codes, lines: [...lines, line] });
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    onChange({ ...codes, lines: lines.map((line, position) => (position === index ? { ...line, ...patch } : line)) });
  }

  function link(index: number, code: string, linked: boolean) {
    const current = lines[index].diagnoses;
    updateLine(index, { diagnoses: linked ? [...current, code] : current.filter((item) => item !== code) });
  }

  return (
    <div className="mt-6 grid gap-6">
      <section>
        <h3 className="text-sm font-medium text-neutral-900">Diagnoses (ICD-10-CM)</h3>
        <p className="mt-1 text-sm text-muted">
          Put the main diagnosis first. A claim carries up to {diagnosisLimit}, and only billable codes are offered.
          Suggested codes from the note appear here for review — edit or remove anything wrong before you approve.
        </p>
        {diagnoses.length ? (
          <ol className="mt-2 grid gap-2">
            {diagnoses.map((item, index) => (
              <li key={item.code} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">
                    {index + 1}. {item.code}
                  </span>
                  <span className="text-muted"> · {item.description}</span>
                </span>
                <span className="flex gap-3">
                  {index > 0 ? (
                    <button type="button" className="underline" onClick={() => moveUp(index)} disabled={disabled}>
                      Move up
                    </button>
                  ) : null}
                  <button type="button" className="underline" onClick={() => removeDiagnosis(item.code)} disabled={disabled}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">No diagnoses yet.</p>
        )}
        {diagnoses.length < diagnosisLimit ? (
          <CodeSearch
            kind="diagnosis"
            label="Add a diagnosis"
            placeholder="Add a diagnosis: type a code or words, such as M48.062 or stenosis"
            disabled={disabled}
            onPick={addDiagnosis}
          />
        ) : null}
      </section>
      <section>
        <h3 className="text-sm font-medium text-neutral-900">Procedures (CPT and HCPCS)</h3>
        <p className="mt-1 text-sm text-muted">
          CPT codes show the number only, so check each one against the op note. Link each line to the diagnoses it treats, up to {pointerLimit}.
        </p>
        {lines.length ? (
          <ol className="mt-2 grid gap-3">
            {lines.map((line, index) => (
              <li key={index} className="rounded-[var(--rb-r-md,8px)] border border-neutral-200 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium">
                      Line {index + 1} · {line.code}
                    </span>
                    {line.description ? <span className="text-muted"> · {line.description}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => onChange({ ...codes, lines: lines.filter((_, position) => position !== index) })}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <label className="grid gap-1">
                    <span className="text-muted">Units</span>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={line.units}
                      onChange={(event) => updateLine(index, { units: event.target.value })}
                      disabled={disabled}
                    />
                  </label>
                  {line.modifiers.map((modifier, position) => (
                    <label key={position} className="grid gap-1">
                      <span className="text-muted">Modifier {position + 1}</span>
                      <input
                        className={fieldClass}
                        maxLength={2}
                        value={modifier}
                        onChange={(event) => {
                          const modifiers = [...line.modifiers];
                          modifiers[position] = event.target.value.toUpperCase();
                          updateLine(index, { modifiers });
                        }}
                        disabled={disabled}
                      />
                    </label>
                  ))}
                </div>
                <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <legend className="mb-2 text-muted">Diagnoses for this line</legend>
                  {diagnoses.length ? (
                    diagnoses.map((item, position) => {
                      const linked = line.diagnoses.includes(item.code);
                      return (
                        <label key={item.code} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={linked}
                            onChange={(event) => link(index, item.code, event.target.checked)}
                            disabled={disabled || (!linked && line.diagnoses.length >= pointerLimit)}
                          />
                          {position + 1}. {item.code}
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-muted">Add a diagnosis first.</p>
                  )}
                </fieldset>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">No procedures yet.</p>
        )}
        <CodeSearch
          kind="procedure"
          label="Add a procedure"
          placeholder="Add a procedure: type a CPT or HCPCS code, such as 63047 or J1010"
          disabled={disabled}
          onPick={addLine}
        />
      </section>
    </div>
  );
}
