// Helper bersama untuk halaman admin (/admin dan /admin/projects).
//
// Diekstrak dari AdminEditor.tsx supaya kedua editor memakai aturan pelokalan
// yang PERSIS sama. Ini bukan soal rapi-rapian: kalau dua halaman punya salinan
// sendiri, satu bisa lupa aturan "kolom kosong jatuh ke Inggris" dan menulis
// nilai Inggris ke kolom Indonesia — dan itu menghapus terjemahan tanpa error
// di mana pun.

import { descToArray } from "@/lib/pure.mjs";

/**
 * Pemisah antar paragraf di kolom Description/Long description, dan karena itu
 * juga pemisah antar baris di textarea-nya. Dipakai untuk split saat mengetik
 * dan join saat render, jadi keduanya tidak mungkin berbeda tanpa ketahuan.
 */
export const DESC_SEP = "\n";

/**
 * Membersihkan array yang diedit sebagai teks: buang spasi ujung dan elemen
 * kosong.
 *
 * KAPAN dipanggil itu intinya, bukan apa yang dikerjakan. Fungsi ini hanya boleh
 * jalan saat mengetik SUDAH SELESAI (onBlur) — jangan pernah di onChange.
 *
 * Alasannya: pada onChange, karakter terakhir dari nilai selalu karakter yang
 * baru saja ditekan. Pembersihan pada saat itu menghapus karakter tersebut, jadi
 * ketikan berikutnya menempel ke teks sebelumnya. Itu penyebab satu keluarga bug
 * di empat kolom sekaligus:
 *
 *   - "Hello "  → spasi ujung di-trim   → "Hello"  → huruf berikutnya menempel
 *   - "React,"  → elemen kosong dibuang → "React"  → koma hilang, tidak bisa
 *                 mengetik item kedua
 *   - Enter     → baris kosong dibuang  → paragraf baru tidak pernah bisa dibuat
 *
 * Karena itu onChange hanya boleh `split(sep)`, dan render harus `join(sep)`
 * dengan pemisah yang sama persis, sehingga nilainya bolak-balik utuh dan apa
 * yang diketik itulah isi state. Pembersihannya menyusul di sini.
 *
 * Kalau hasil bersihnya kosong, disisakan satu elemen kosong: array kosong
 * membuat kotak teks tampak mengosongkan dirinya sendiri tanpa alasan yang
 * terlihat.
 */
export function cleanTextArray(parts: string[]): string[] {
  const cleaned = parts.map((s) => s.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [""];
}

/**
 * Baca satu field dengan kunci yang baru diketahui saat runtime.
 *
 * Kunci itu ditentukan bahasa aktif (`foo` atau `foo_id`), jadi tidak ada cara
 * menuliskannya secara statis. Helper ini mengurung satu-satunya `as` di file
 * ini, supaya pembacaan field di seluruh komponen tetap bebas cast.
 *
 * Parameternya `object` dan bukan `Record<string, unknown>` dengan sengaja:
 * `object` menerima semua bentuk data di sini, termasuk `ProjectStored` yang
 * berupa irisan dengan `Omit<…>` (mapped type). `Record<string, unknown>` tidak
 * dijamin menerima mapped type — index signature-nya tidak dibuat otomatis
 * untuk tipe hasil `Omit`, sehingga pemanggilnya bisa gagal typecheck.
 *
 * Nilai kembaliannya `unknown`, bukan `any`: pemanggil WAJIB mempersempitnya
 * (di sini selalu `as string | undefined`), jadi tidak ada `any` yang menyebar
 * diam-diam lewat helper ini.
 */
export function fields(obj: object): Record<string, unknown> {
  return obj as unknown as Record<string, unknown>;
}

/**
 * Bikin sekumpulan pembaca field untuk bahasa yang sedang diedit.
 *
 * Bahasa Indonesia disimpan sebagai kolom kembaran berakhiran `_id` di sebelah
 * nilai Inggris (lihat ProfileDataStored di lib/data.ts). Fungsi-fungsi di sini
 * adalah SATU-SATUNYA tempat aturan itu ditulis:
 *
 *   locKey  — kolom mana yang ditulis/dibaca untuk bahasa aktif.
 *   loc     — nilai untuk bahasa aktif. Kosong kalau belum diterjemahkan.
 *   ph      — nilai Inggris sebagai placeholder saat mengisi bahasa Indonesia.
 *   locArr  — versi array paragraf (Description) untuk bahasa aktif.
 *   phArr   — nilai Inggris (array paragraf) sebagai placeholder.
 *
 * Placeholder itu penting untuk alur kerjanya, bukan hiasan: tanpa melihat teks
 * Inggrisnya, penerjemah tidak tahu apa yang harus diterjemahkan, dan kolom
 * kosong terlihat seperti data hilang alih-alih "belum diisi".
 */
export function makeLocalizers(lang: "en" | "id") {
  const locKey = (k: string) => (lang === "id" ? `${k}_id` : k);

  const loc = (obj: object, k: string): string =>
    (fields(obj)[locKey(k)] as string | undefined) ?? "";

  const ph = (obj: object, k: string): string | undefined =>
    lang === "id" ? ((fields(obj)[k] as string | undefined) ?? "") : undefined;

  // Array teks untuk bahasa aktif.
  //
  // Lewat descToArray, bukan `Array.isArray(v) ? v : []`: `description` boleh
  // berbentuk STRING tunggal (project "Metagama Information System" di seed).
  // Dengan pemeriksaan Array saja, nilai string itu menghasilkan array kosong —
  // textarea Description tampil kosong padahal isinya ada, dan mengetik satu
  // huruf di situ menimpa seluruh deskripsi aslinya. Bentuk string adalah bentuk
  // yang sah di sini, bukan data yang rusak.
  const locArr = (obj: object, k: string): string[] =>
    descToArray((fields(obj)[locKey(k)] as string | string[] | undefined) ?? "");

  const phArr = (obj: object, k: string): string | undefined =>
    lang === "id"
      ? descToArray((fields(obj)[k] as string | string[] | undefined) ?? "").join(DESC_SEP)
      : undefined;

  return { locKey, loc, ph, locArr, phArr };
}
