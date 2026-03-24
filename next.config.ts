import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure JSON data files are bundled correctly by webpack (Node.js runtime only)
  // API routes use Node.js runtime — not edge — so require() of JSON files works fine.
};

export default nextConfig;
