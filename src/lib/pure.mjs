// Fungsi murni: tidak menyentuh database, filesystem, maupun jaringan — dan
// tidak mengimpor apa pun. Karena itu semuanya bisa diuji tanpa Postgres, tanpa
// menjalankan Next.js, dan tanpa memasang test framework.
//
// Kenapa .mjs dan bukan .ts: runner bawaan Node (`node --test`) menjalankan file
// .mjs apa adanya, tanpa toolchain. Kalau file ini .ts, tahap TEST di CI harus
// lebih dulu memasang sesuatu yang bisa membaca TypeScript — dan itu berarti
// menambah dependensi hanya untuk menguji empat fungsi. Alasan yang sama dipakai
// scripts/db.mjs.
//
// File ini adalah SATU-SATUNYA salinan aturan-aturan ini. Sebelumnya projectSlug
// disalin di scripts/db.mjs dan descToArray disalin di AdminEditor.tsx. Salinan
// seperti itu tidak pernah ketahuan saat menyimpang: aturan slug yang berbeda
// antara seed dan aplikasi membuat URL /projects/<slug> jadi 404 tanpa error di
// mana pun. Sekarang keduanya mengimpor dari sini, dan tests/pure.test.mjs
// menjaga perilakunya.

/**
 * Slug URL dari nama project. Dipakai untuk /projects/[slug].
 *
 * Nama project tidak disimpan sebagai slug terpisah, jadi slug-nya diturunkan
 * dari nama supaya admin tidak perlu mengisi field tambahan. Bagian setelah
 * em-dash dibuang, jadi "Diarvis — Regional Asset Management" jadi "diarvis".
 *
 * Konsekuensi yang perlu diketahui: kalau nama project diubah lewat admin,
 * URL detail-nya ikut berubah, dan link lama ke project itu jadi 404.
 *
 * @param {string} name
 * @returns {string}
 */
export function projectSlug(name) {
  return name
    .split("—")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deskripsi project boleh berupa satu string atau array paragraf. Halaman
 * publik dan admin editor sama-sama perlu bentuk yang seragam.
 *
 * @param {string | string[]} desc
 * @returns {string[]}
 */
export function descToArray(desc) {
  if (Array.isArray(desc)) return desc;
  return [desc];
}

/**
 * Kelompokkan skill per kategori, mempertahankan urutan aslinya di dalam tiap
 * kelompok.
 *
 * `@template T` penting di sini, bukan sekadar kerapian dokumentasi: pemanggil
 * memakai hasilnya sebagai `Skill[]` (mis. `items.map((s) => s.name)` di
 * src/app/page.tsx). Kalau tipe kembaliannya dipersempit jadi objek berkategori
 * saja, `s.name` tidak lagi dikenal dan `tsc` gagal — padahal fungsinya benar.
 *
 * @template T
 * @param {T[]} skills
 * @returns {Record<string, T[]>}
 */
export function groupSkillsByCategory(skills) {
  const groups = {};
  for (const s of skills) {
    (groups[s.category] ??= []).push(s);
  }
  return groups;
}

/**
 * Cari project berdasarkan slug URL-nya.
 *
 * @template T
 * @param {T[]} projects
 * @param {string} slug
 * @returns {T | undefined}
 */
export function findProjectBySlug(projects, slug) {
  return projects.find((p) => projectSlug(p.name) === slug);
}

/**
 * URL gambar → id numeriknya. Dipakai sebagai foreign key, jadi angka ini yang
 * disimpan ke kolom `image_id`.
 *
 * Sengaja cocok PERSIS ("^...$"), bukan mencari di dalam string. Path lama
 * ("/image/x.png") karena itu menghasilkan null — yang berarti "tidak ada
 * gambar" — alih-alih ikut terkonversi. Kalau anchor-nya dilepas, URL yang
 * kebetulan memuat pola itu di tengah akan salah dianggap sebagai rujukan
 * gambar.
 *
 * @param {string | undefined | null} url
 * @returns {number | null}
 */
export function imageIdFromUrl(url) {
  if (!url) return null;
  const m = url.match(/^\/api\/images\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

/**
 * Kebalikan dari imageIdFromUrl. `null` jadi string kosong — bukan "/api/images/null".
 *
 * @param {string | number | null} id
 * @returns {string}
 */
export function imageUrlFromId(id) {
  if (id === null) return "";
  return `/api/images/${id}`;
}
