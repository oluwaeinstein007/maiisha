import type { NextConfig } from "next";

// Product/category images are served by the Laravel backend (local disk in
// dev, object storage in prod) — allow next/image to optimise them from
// whichever host NEXT_PUBLIC_API_URL points at.
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

const nextConfig: NextConfig = {
  /* Standalone output lets the production Docker image ship only the
   * traced runtime (server.js + minimal node_modules) instead of the
   * full node_modules tree. */
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
      },
    ],
  },
};

export default nextConfig;
