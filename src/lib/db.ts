import { Pool } from "pg";

// Satu Pool per proses.
//
// Di mode dev, Next.js me-reload modul tiap kali file berubah. Kalau Pool dibuat
// di level modul tanpa penjagaan, setiap reload meninggalkan Pool lama yang masih
// memegang koneksi, dan Postgres lama-lama kehabisan slot koneksi. Karena itu
// Pool disimpan di globalThis supaya dipakai ulang antar-reload.
//
// Di produksi cukup satu Pool biasa.
declare global {
  // eslint-disable-next-line no-var
  var __portoPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example jadi .env lalu sesuaikan nilainya."
    );
  }
  return new Pool({
    connectionString,
    // Batasi jumlah koneksi: satu instance portofolio tidak butuh banyak, dan
    // Postgres default hanya menerima 100 koneksi.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!globalThis.__portoPool) {
    globalThis.__portoPool = createPool();
  }
  return globalThis.__portoPool;
}
