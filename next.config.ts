import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false,
  },
};

export default nextConfig;
