import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@devmentor/core", "@devmentor/db", "@devmentor/ui"],
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
