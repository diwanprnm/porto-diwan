"use client";

import { useRef, useState } from "react";

/**
 * Upload gambar.
 *
 * Menggantikan input teks path gambar yang lama ("/image/diwan2.png"), yang
 * mengharuskan file ditaruh manual di public/ lalu namanya diketik. Sekarang
 * file dikirim ke /api/upload, disimpan sebagai BLOB di database, dan nilai
 * yang disimpan di data adalah URL "/api/images/<id>".
 *
 * Nilai lama tetap ditampilkan sebagai preview: gambar yang belum di-upload
 * ulang masih memakai URL hasil migrasi, dan URL itu juga "/api/images/<id>",
 * jadi preview-nya langsung benar tanpa perlakuan khusus.
 *
 * Diekstrak dari AdminEditor.tsx ke file sendiri karena sekarang dipakai dua
 * halaman admin (/admin dan /admin/projects). Salinan kedua pasti menyimpang —
 * dan yang menyimpang di sini adalah cara upload, bukan tampilannya.
 */
export default function ImageField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error || "Upload gagal");
      } else {
        onChange(body.url);
      }
    } catch {
      setErr("Tidak bisa menghubungi server");
    }
    setBusy(false);
    // Reset input supaya memilih file yang sama dua kali berturut-turut tetap
    // memicu onChange (tanpa ini, event-nya tidak jalan karena nilainya sama).
    if (fileRef.current) fileRef.current.value = "";
  }

  const btn =
    "px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="mt-3">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-20 h-20 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- gambar dari
            // /api/images bersifat dinamis dan sudah immutable, jadi optimizer
            // Next tidak memberi manfaat di sini.
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-600 text-center px-1">
              belum ada gambar
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {/* Input file ditaruh DI DALAM <label> yang membungkusnya. Dua alasan:
                (1) mengklik label otomatis membuka dialog file tanpa perlu .click()
                dari JavaScript, dan (2) `has-[:focus-visible]` bisa menggambar ring
                fokus pada label — kalau input-nya di luar label, ring-nya tidak
                akan terlihat dan tombol ini tidak bisa dipakai dengan keyboard. */}
            <label
              className={`${btn} bg-teal-800 hover:bg-teal-700 border-teal-700 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-900 ${
                busy ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {busy ? "Mengunggah…" : value ? "Ganti gambar" : "Pilih gambar"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
            </label>
            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange("")}
                className={`${btn} bg-slate-800 hover:bg-slate-700 border-slate-600`}
              >
                Hapus
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-1.5">
            PNG, JPEG, WebP, GIF, atau SVG. Maks 5 MB.
            {hint ? ` ${hint}` : ""}
          </p>
          {value && (
            <p className="text-[11px] text-slate-600 mt-0.5 break-all">{value}</p>
          )}
          {err && <p className="text-[11px] text-red-400 mt-1">{err}</p>}
        </div>
      </div>
    </div>
  );
}
