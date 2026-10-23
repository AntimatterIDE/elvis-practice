import "server-only";
import { claimCodeProblems, type CodeLibrary } from "@/lib/coding/codes";
import { extractCodingFacts } from "@/lib/coding/extract";
import type { CodingFacts, FactWarning } from "@/lib/coding/facts";
import { spineSuggestionsEnabled } from "@/lib/coding/flags";
import { codeLibrary } from "@/lib/coding/library";
import { codeVisit, type CodeVisitResult } from "@/lib/coding/spine";

export { spineSuggestionsEnabled };

export type SuggestResult = {
  enabled: boolean;
  facts: CodingFacts;
  coding: CodeVisitResult;
  extractWarnings: FactWarning[];
  blocked: string[];
};

/**
 * Full suggestion path: extract → office rules → CMS/NCCI check.
 * On by default; set SPINE_CODING_SUGGESTIONS=false to kill-switch.
 */
export async function suggestVisitCodes(
  note: string,
  options: { library?: CodeLibrary; dateOfService?: string; env?: Record<string, string | undefined> } = {},
): Promise<SuggestResult> {
  const emptyFacts: CodingFacts = { visit: null, procedures: [], diagnoses: [], injury: null };
  if (!spineSuggestionsEnabled(options.env)) {
    return {
      enabled: false,
      facts: emptyFacts,
      coding: { lines: [], diagnoses: [], warnings: ["Spine coding suggestions are off."] },
      extractWarnings: [],
      blocked: [],
    };
  }

  const library = options.library ?? codeLibrary();
  const dateOfService = options.dateOfService ?? new Date().toISOString().slice(0, 10);
  const extracted = await extractCodingFacts(note);
  const coding = codeVisit(extracted.facts, library, undefined, dateOfService);
  const blocked = claimCodeProblems(library, {
    dateOfService,
    lines: coding.lines.map((line) => ({
      cpt: line.cpt,
      modifiers: line.modifiers,
      diagnoses: line.diagnosisPointers,
      includeOnBill: line.cpt !== "99024",
      units: line.units,
    })),
  });

  return {
    enabled: true,
    facts: extracted.facts,
    coding,
    extractWarnings: extracted.warnings,
    blocked,
  };
}
