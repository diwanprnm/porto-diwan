import { NextRequest, NextResponse } from "next/server";
import { getDefaultLocale, setDefaultLocale } from "@/lib/settings";
import { getAdminFromCookie } from "@/lib/auth";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * Bahasa default situs: dibaca publik, diubah hanya oleh admin.
 *
 * Kenapa lewat route dan bukan langsung dari database:
 *
 *   - Middleware (src/middleware.ts) berjalan di Edge runtime dan tidak bisa
 *     memakai driver `pg`. Ia membaca nilai ini lewat HTTP ke sini. Route ini
 *     berjalan di Node runtime, tempat `pg` memang bisa dipakai.
 *   - /admin memakai GET yang sama untuk menampilkan nilai yang sedang berlaku,
 *     jadi tidak ada dua jalur pembacaan yang bisa menyimpang.
 *
 * GET sengaja publik: ini bahasa halaman depan, dan middleware perlu
 * membacanya untuk request yang belum tentu membawa cookie apa pun. Tidak ada
 * yang rahasia di sini.
 */

// Tidak boleh di-cache oleh Next atau CDN: nilai ini berubah dari /admin, dan
// halaman yang menampilkan bahasa yang sudah tidak berlaku adalah bug yang
// terlihat persis seperti "tombolnya tidak bekerja".
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const locale = await getDefaultLocale();
    return NextResponse.json(
      { locale },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // getDefaultLocale sudah menelan kegagalan database dan mengembalikan
    // DEFAULT_LOCALE, jadi cabang ini praktis tidak tercapai. Tetap ada supaya
    // middleware SELALU menerima bentuk yang bisa dibaca — kegagalan di sini
    // berarti seluruh situs berhenti di-redirect dengan benar.
    return NextResponse.json(
      { locale: DEFAULT_LOCALE },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PUT(req: NextRequest) {
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { locale?: unknown };
    const ok = await setDefaultLocale(String(body.locale ?? ""));

    if (!ok) {
      // Ditolak, bukan dibetulkan diam-diam: nilai yang tidak dikenal tidak
      // akan pernah dibaca oleh getDefaultLocale, jadi menerimanya berarti
      // admin melihat "Saved" padahal tidak ada yang berubah.
      return NextResponse.json(
        { error: "Bahasa tidak dikenal. Pilih en atau id." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, locale: body.locale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
