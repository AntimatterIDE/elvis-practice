import type { NextConfig } from "next";

const canonicalOrigin = (process.env.CANONICAL_ORIGIN || "https://thealignmentclinic.com").replace(/\/$/, "");
const redirectHosts = (
  process.env.REDIRECT_HOSTS || "elvisfrancoismd.com,www.elvisfrancoismd.com,www.thealignmentclinic.com"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

  const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // lib/coding/library.ts reads these at runtime. Keys are route globs, so
  // dynamic segments need escaped brackets.
  outputFileTracingIncludes: {
    "/api/coding/search": ["./data/coding/**/*.json"],
    "/api/coding/check": ["./data/coding/**/*.json"],
    "/api/coding/suggest": ["./data/coding/**/*.json"],
    "/api/dev/spine-eval": [
      "./data/coding/**/*.json",
      "./tests/fixtures/spine-office-facts.json",
      "./docs/spine-coding/baseline-2026-10-22/cases.json",
      "./docs/spine-coding/baseline-2026-10-22/imperfect-cases.json",
    ],
    "/api/encounters/\\[id\\]": ["./data/coding/**/*.json"],
    "/api/encounters/\\[id\\]/process": ["./data/coding/**/*.json"],
    "/api/encounters/\\[id\\]/suggest": ["./data/coding/**/*.json"],
    "/admin/operations/claims/\\[id\\]": ["./data/coding/**/*.json"],
  },
  async redirects() {
    return redirectHosts.flatMap((host) => [
      {
        source: "/",
        has: [{ type: "host" as const, value: host }],
        destination: canonicalOrigin,
        permanent: true,
      },
      {
        source: "/:path+",
        has: [{ type: "host" as const, value: host }],
        destination: `${canonicalOrigin}/:path+`,
        permanent: true,
      },
    ]);
  },
};

export default nextConfig;
