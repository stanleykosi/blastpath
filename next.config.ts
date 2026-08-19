import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    useTypeScriptCli: false,
    webpackBuildWorker: false,
  },
};

export default nextConfig;
