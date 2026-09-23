import { NextResponse } from "next/server";

// GET /healthz — dipakai smoke test di pipeline (job `build`).
//
// SENGAJA tidak menyentuh database, dan itu keputusan yang disengaja.
//
// Yang dibuktikan smoke test adalah "image ini benar-benar bisa dijalankan dan
// melayani HTTP" — bukan "databasenya hidup". Dua hal itu berbeda, dan
// menguji keduanya di satu tempat membuat pemeriksaannya lebih lemah: kalau
// route ini ikut query database, smoke test di runner CI akan gagal hanya
// karena tidak ada Postgres di sana, padahal image-nya sehat. Hasilnya orang
// akan melemahkan pemeriksaannya supaya hijau — dan gerbang yang dilemahkan
// supaya hijau sama saja dengan tidak ada gerbang.
//
// Konektivitas database diuji di tempat yang memang punya database: health check
// di scripts/deploy-remote.sh menembak "/" setelah deploy, dan "/" membaca
// database sungguhan.
//
// `force-dynamic` supaya Next tidak mencoba men-prerender route ini saat build
// image — build tidak punya akses jaringan apa pun, dan route yang di-prerender
// akan mengubah sifat build.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}
