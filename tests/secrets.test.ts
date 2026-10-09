import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const allowed = new Set([
  "lib/supabase/admin.ts",
  "lib/env.ts",
  "lib/portal/supabase-store.ts",
  "lib/stedi/record.ts",
  "app/admin/actions.ts",
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

  it("keeps the Bird key on the server", () => {
    const files = ["app", "components", "lib"].flatMap((directory) => walk(directory));
    const allowedBird = new Set(["lib/env.ts", "lib/bird/client.ts"]);
    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      const readsKey = /readServerEnv\(\)\.BIRD_API_KEY|source\.BIRD_API_KEY|process\.env\.BIRD_API_KEY/.test(source);
      if (!readsKey) continue;
      const relative = file.split(path.sep).join("/");
      expect(allowedBird.has(relative)).toBe(true);
      expect(source.includes('"use client"') || source.includes("'use client'")).toBe(false);
    }
  });

  it("keeps the Stedi key on the server", () => {
    const files = ["app", "components", "lib"].flatMap((directory) => walk(directory));
    const allowedStedi = new Set(["lib/env.ts", "lib/stedi/client.ts"]);
    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      const readsKey = /readServerEnv\(\)\.STEDI_API_KEY|source\.STEDI_API_KEY|process\.env\.STEDI_API_KEY/.test(source);
      if (!readsKey) continue;
      const relative = file.split(path.sep).join("/");
      expect(allowedStedi.has(relative)).toBe(true);
      expect(source.includes('"use client"') || source.includes("'use client'")).toBe(false);
    }
  });
});
