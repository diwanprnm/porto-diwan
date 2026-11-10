import { getPool } from "./db";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

/**
 * Preferensi situs yang bisa diubah operator dari /admin.
 *
 * Berbeda dari isi CV: nilai di sini bukan konten, melainkan pengaturan. Untuk
 * sekarang isinya satu — bahasa mana yang dibuka di alamat utama.
 *
 * Pembacaannya lewat SATU fungsi, `getDefaultLocale`, dan tidak ada pemanggil
 * yang boleh menembak tabelnya langsung. Alasannya di komentar fungsi itu.
 */

/** Kunci baris di tabel `settings`. */
export const DEFAULT_LOCALE_KEY = "default_locale";

// ── Cache ──────────────────────────────────────────────────────────────────
//
// Tanpa cache, setiap request halaman publik menambah satu query ke database
// hanya untuk membaca satu kata. Middleware mengarahkan SEMUA request tanpa
// locale lewat nilai ini, jadi itu query yang frekuensinya setinggi trafik.
//
// Cache-nya sengaja sangat sederhana: satu nilai, satu stempel waktu. Bukan
// cache berkapasitas atau ber-TTL karena hanya ada satu nilai yang di-cache —
// struktur yang lebih besar hanya menambah kode tanpa mengubah perilaku.
//
// Masa berlakunya pendek (10 detik) karena itu satu-satunya cara perubahan dari
// /admin sampai ke situs: TIDAK ADA invalidasi lintas proses. `setDefaultLocale`
// hanya membersihkan cache di proses yang menjalankannya, sedangkan container
// produksi bisa punya beberapa proses dan aplikasinya bisa berjalan di lebih
// dari satu instance. TTL-lah yang menjamin semua proses akhirnya ikut berubah,
// tanpa perlu pub/sub atau menembak endpoint revalidate.
const CACHE_TTL_MS = 10_000;

let cached: { value: Locale; at: number } | null = null;

/**
 * Bahasa default yang sedang berlaku: baris di `settings` kalau ada dan sah,
 * kalau tidak `DEFAULT_LOCALE`.
 *
 * `isLocale` di sini bukan formalitas. Baris ini bisa diubah lewat psql, dan
 * nilai yang tidak dikenal — salah ketik, sisa percobaan — tidak boleh
 * diteruskan: middleware akan mengalihkan seluruh situs ke `/<nilai itu>`, dan
 * karena tidak ada halaman yang cocok, SEMUA URL mati. Nilai asing diperlakukan
 * sebagai "tidak diatur", bukan sebagai bahasa.
 *
 * Kegagalan database juga jatuh ke `DEFAULT_LOCALE`, dan itu disengaja: situs
 * tetap harus tampil kalau database sedang bermasalah. Halaman yang menampilkan
 * CV akan gagal dengan pesannya sendiri di tempat lain; yang tidak boleh terjadi
 * di sini adalah middleware melempar error dan menutup seluruh situs.
 */
export async function getDefaultLocale(): Promise<Locale> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  let value = DEFAULT_LOCALE;
  try {
    const { rows } = await getPool().query<{ value: string }>(
      "SELECT value FROM settings WHERE key = $1",
      [DEFAULT_LOCALE_KEY]
    );
    const stored = rows[0]?.value;
    if (isLocale(stored)) value = stored;
  } catch {
    // Lihat catatan di atas: database yang tidak bisa dihubungi bukan alasan
    // untuk menggagalkan seluruh situs.
  }

  cached = { value, at: now };
  return value;
}

/**
 * Simpan bahasa default. Dipanggil dari /admin.
 *
 * Mengembalikan `false` kalau `value` bukan locale yang dikenal. Nilai yang
 * tidak sah DITOLAK, bukan dibetulkan diam-diam: menuliskan nilai asing ke tabel
 * akan membuat getDefaultLocale mengabaikannya, sehingga admin melihat "Saved"
 * padahal tidak ada yang berubah.
 *
 * Cache di proses ini langsung dibersihkan supaya perubahan terlihat pada
 * request berikutnya, tidak menunggu TTL. Proses lain menunggu TTL — lihat
 * catatan panjang di atas.
 */
export async function setDefaultLocale(value: string): Promise<boolean> {
  if (!isLocale(value)) return false;

  await getPool().query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [DEFAULT_LOCALE_KEY, value]
  );

  cached = { value, at: Date.now() };
  return true;
}
