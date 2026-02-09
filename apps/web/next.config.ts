import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@txtskills/ui"],
};

export default nextConfig;

// Enable Cloudflare bindings during local development (next dev)
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
