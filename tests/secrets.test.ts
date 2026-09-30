import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const allowed = new Set([
  "lib/supabase/admin.ts",
  "lib/env.ts",
  "scripts/seed-content.ts",
]);

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    if (entry === "node_modules" || entry === ".next") return [];
    if (statSync(fullPath).isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

describe("service role boundary", () => {
  it("never reaches a client component", () => {
    const files = ["app", "components", "lib", "scripts"].flatMap((directory) => walk(directory));
    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      const relative = file.split(path.sep).join("/");
      const mentionsSecret =
        source.includes("SUPABASE_SERVICE_ROLE_KEY") || source.includes("createSupabaseAdminClient");
      if (!mentionsSecret) continue;
      expect(allowed.has(relative)).toBe(true);
      expect(source.includes('"use client"') || source.includes("'use client'")).toBe(false);
    }
  });
});
