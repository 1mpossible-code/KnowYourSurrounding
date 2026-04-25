import type { NextConfig } from "next";

// Allow specific dev origins to access Next.js dev resources (webpack HMR) from other hosts.
// You can override by setting ALLOWED_DEV_ORIGINS in your env (comma-separated).
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)
  : ["192.168.1.194"];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // only include this in development builds (harmless in production but keep scoped)
  ...(process.env.NODE_ENV === "development" ? { allowedDevOrigins } : {}),
};

export default nextConfig;
