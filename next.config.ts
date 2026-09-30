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
