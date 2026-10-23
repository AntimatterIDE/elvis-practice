/** Suggestions stay off until the office fixture set passes and this env is set. */
export function spineSuggestionsEnabled(env: Record<string, string | undefined> = process.env) {
  return (env.SPINE_CODING_SUGGESTIONS ?? "").trim().toLowerCase() === "true";
}
