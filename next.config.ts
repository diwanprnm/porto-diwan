import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images served from /public/ — local paths are already supported
    // Tambahkan domain eksternal di sini kalau perlu load dari CDN
    remotePatterns: [],
  },
  // ISR: daripada full static export, kita pakai Node.js runtime
  // agar API routes + revalidation berfungsi
  output: "standalone",
};

export default nextConfig;