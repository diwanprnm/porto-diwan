import { NextResponse } from "next/server";
import { getProfileDataRaw } from "@/lib/data";

// GET /api/profile — public read
//
// Mengembalikan bentuk TERSIMPAN (kedua bahasa), bukan hasil terjemahan, karena
// satu-satunya pemanggilnya adalah /admin. Kalau di sini dikembalikan hasil
// terjemahan, editor akan mengirim balik nilai Inggris ke kolom Indonesia saat
// Save — dan membuka lalu menyimpan akan menghapus seluruh terjemahan.
// Lihat catatan di getProfileDataRaw.
export async function GET() {
  try {
    const data = await getProfileDataRaw();
    return NextResponse.json(data, {
      // Tidak di-cache: ini data yang sedang diedit admin, dan salinan lama
      // berarti editor menampilkan nilai yang sudah tidak ada di database.
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
