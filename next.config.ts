import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: [
    '@audio/decode',
    '@audio/decode-ape',
    '@audio/decode-wavpack',
    '@audio/decode-tta',
    '@audio/decode-mpc',
    '@audio/decode-eac3',
    '@audio/decode-dsd'
  ],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
