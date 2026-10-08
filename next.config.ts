import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  // Lets phones on the LAN load the dev server; Next 16 blocks it otherwise.
  allowedDevOrigins: ["192.168.*.*"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
