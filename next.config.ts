import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gambar disajikan dari route sendiri (/api/images/[id]), jadi tidak ada
    // domain eksternal yang perlu didaftarkan di sini.
    remotePatterns: [],
  },
  // pg memakai require dinamis dan native binding opsional; kalau ikut di-bundle
  // bundler, hasilnya sering gagal saat runtime. Dibiarkan sebagai package
  // eksternal supaya di-resolve Node seperti biasa.
  serverExternalPackages: ["pg"],
  // ISR: daripada full static export, kita pakai Node.js runtime
  // agar API routes + revalidation berfungsi
  output: "standalone",
};

export default nextConfig;
