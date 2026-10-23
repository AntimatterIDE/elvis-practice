/**
 * Spine coding suggestions (extract → rules → CMS/NCCI).
 * On by default for production claims. Set SPINE_CODING_SUGGESTIONS=false to kill-switch.
 */
export function spineSuggestionsEnabled(env: Record<string, string | undefined> = process.env) {
  const raw = (env.SPINE_CODING_SUGGESTIONS ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}
