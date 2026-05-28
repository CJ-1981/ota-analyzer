import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ota-analyzer",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
