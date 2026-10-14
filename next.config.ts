import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./imports/**/*"] },
};

export default nextConfig;
