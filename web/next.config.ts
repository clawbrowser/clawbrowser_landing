import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? basePath : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
