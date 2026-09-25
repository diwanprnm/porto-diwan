import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAdminFromCookie } from "@/lib/auth";

// Batas ukuran file. Gambar disimpan apa adanya di database (tanpa di-resize),
// jadi batas ini yang menjaga tabel images tidak membengkak. Naikkan kalau perlu,
// tapi ingat setiap upload menambah ukuran database secara permanen.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// POST /api/upload — admin upload gambar, tersimpan sebagai BLOB di database.
export async function POST(req: NextRequest) {
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json(
      { error: "Body harus multipart/form-data dengan field bernama 'file'." },
      { status: 400 }
    );
  }

  if (!file) {
    return NextResponse.json({ error: "Tidak ada file yang dikirim." }, { status: 400 });
  }

  // Tipe file ditentukan dari MIME yang dikirim browser, dan itu bisa dipalsukan.
  // Ini bukan celah yang berbahaya di sini: yang meng-upload hanya admin yang
  // sudah login, dan gambar disajikan kembali dengan Content-Type dari kolom
  // `mime` yang sudah divalidasi di bawah — bukan ditebak dari nama file.
  const mime = file.type;
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, mime)) {
    return NextResponse.json(
      { error: `Tipe file tidak didukung: ${mime || "tidak diketahui"}. Pakai PNG, JPEG, WebP, GIF, atau SVG.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { error: `Ukuran file ${mb} MB melebihi batas 5 MB.` },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File kosong." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    // Nama file dari klien dipakai hanya sebagai label di admin, bukan sebagai
    // path. Ambil basename-nya supaya "../" di nama tidak ikut tersimpan.
    const filename = (file.name.split(/[\\/]/).pop() || "upload").slice(0, 200);

    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO images (filename, mime, bytes) VALUES ($1, $2, $3) RETURNING id`,
      [filename, mime, bytes]
    );

    const id = Number(rows[0].id);
    return NextResponse.json({ id, url: `/api/images/${id}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
