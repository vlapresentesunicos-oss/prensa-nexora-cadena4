import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ],
  },
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
