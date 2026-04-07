import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/clawbrowser-landing-v2.0" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
