import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// GET /api/images/[id] — menyajikan gambar dari BLOB di database.
//
// Isi sebuah gambar tidak pernah berubah selama id-nya sama (mengganti gambar
// berarti membuat baris baru dengan id baru), jadi respons ini boleh di-cache
// selamanya. Ini juga alasan Next Image di halaman publik dipasang `unoptimized`:
// tidak ada gunanya optimizer mengambil ulang gambar yang sudah immutable.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validasi bentuk id sebelum menyentuh database. Tanpa ini, "abc" akan
  // dikirim ke Postgres untuk kolom BIGINT dan menghasilkan error 500 alih-alih
  // 404 yang benar.
  if (!/^\d+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const { rows } = await getPool().query<{ mime: string; bytes: Buffer }>(
      "SELECT mime, bytes FROM images WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { mime, bytes } = rows[0];

    // Buffer dikirim apa adanya. BodyInit di lib DOM tidak menerima Buffer,
    // jadi di-cast; di runtime Node, Buffer memang body yang sah.
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        // Gambar yang di-upload admin bisa berupa SVG, dan SVG bisa memuat
        // script. Tanpa header ini, SVG yang dibuka langsung di tab browser
        // berjalan di origin yang sama dan bisa membaca cookie admin.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat gambar";
    return new NextResponse(message, { status: 500 });
  }
}
