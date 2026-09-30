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
 * Slug URL dari nama project. Dipakai untuk /[lang]/projects/[slug].
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
 * Buang elemen yang kosong atau berisi spasi saja. Dipakai splitProjectTexts,
 * dan sengaja lokal: aturan "kosong" di sini sama dengan pickLocalized (string
 * kosong ATAU spasi saja = belum diisi), tapi tidak perlu diekspor karena tidak
 * ada pemanggil lain.
 *
 * @param {(string | undefined | null)[]} arr
 * @returns {string[]}
 */
function nonEmptyStrings(arr) {
  return arr.filter((s) => typeof s === "string" && s.trim() !== "");
}

/**
 * Pisahkan dua peran teks sebuah project: ringkasan untuk kartu, teks lengkap
 * untuk halaman detail.
 *
 * Kebutuhan keduanya berbeda — kartu ingin satu kalimat utuh yang tidak
 * terpotong, halaman detail ingin seluruh cerita — jadi satu field tidak bisa
 * melayani keduanya. Tapi keduanya juga tidak boleh kosong kalau yang lain
 * terisi: project lama hanya punya satu teks, dan halaman yang mendadak kosong
 * lebih buruk daripada teks yang dipakai di dua tempat.
 *
 * Karena itu ada cadangan dua arah:
 *
 *   description terisi          → kartu memakai description
 *   description kosong          → kartu memakai paragraf PERTAMA long_description
 *   long_description terisi     → detail memakai long_description
 *   long_description kosong     → detail memakai description
 *
 * Hasilnya selalu array paragraf (bentuk yang sama dengan `description` di
 * halaman), bukan string, supaya pemanggil tidak perlu tahu bentuk aslinya.
 *
 * @param {string | string[] | undefined | null} description
 * @param {string | string[] | undefined | null} longDescription
 * @returns {{ card: string[], detail: string[] }}
 */
export function splitProjectTexts(description, longDescription) {
  const card = nonEmptyStrings(descToArray(description ?? ""));
  const detail = nonEmptyStrings(descToArray(longDescription ?? ""));

  if (card.length > 0) {
    return { card, detail: detail.length > 0 ? detail : card };
  }
  if (detail.length > 0) {
    // Belum ada ringkasan: kartu memakai paragraf pertama teks panjang, dan
    // dipotong hanya di sini — bukan dengan line-clamp di CSS, yang memotong
    // di tengah kata tanpa jejak bahwa ada teks lanjutan.
    return { card: [detail[0]], detail };
  }
  return { card: [], detail: [] };
}

/**
 * Kelompokkan skill per kategori, mempertahankan urutan aslinya di dalam tiap
 * kelompok.
 *
 * `@template T` penting di sini, bukan sekadar kerapian dokumentasi: pemanggil
 * memakai hasilnya sebagai `Skill[]` (mis. `items.map((s) => s.name)` di
 * src/app/[lang]/page.tsx). Kalau tipe kembaliannya dipersempit jadi objek
 * berkategori saja, `s.name` tidak lagi dikenal dan `tsc` gagal — padahal
 * fungsinya benar.
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
 * Memakai slugOf, bukan projectSlug(p.name) langsung: project yang sudah
 * melewati resolveProfileData punya `slug` yang dihitung dari nama Inggris,
 * sedangkan `name`-nya sudah diterjemahkan. Memakai `name` di sini akan
 * menggagalkan pencarian justru untuk project yang namanya diterjemahkan.
 *
 * `@template` diberi batasan, bukan `@template T` telanjang: pemanggilnya
 * meneruskan `Project[]` (punya `slug`) maupun baris mentah content/profile.json
 * (cuma `name`), dan batasan inilah yang membuat keduanya sah tanpa satu pun
 * `any` di tipe kembaliannya.
 *
 * @template {{ slug?: string, name: string }} T
 * @param {T[]} projects
 * @param {string} slug
 * @returns {T | undefined}
 */
export function findProjectBySlug(projects, slug) {
  return projects.find((p) => slugOf(p) === slug);
}

/**
 * Slug kanonik sebuah project. Memakai `slug` kalau sudah ada.
 *
 * Cadangan ke projectSlug(p.name) penting untuk objek yang belum melewati
 * withProjectSlugs — baris mentah content/profile.json di test, misalnya.
 *
 * @param {{ slug?: string, name: string }} project
 * @returns {string}
 */
export function slugOf(project) {
  return project.slug ?? projectSlug(project.name);
}

/**
 * Lampirkan slug kanonik ke tiap project, dihitung dari nama INGGRIS.
 *
 * Dipanggil SEBELUM nama diterjemahkan (lihat resolveProfileData di
 * lib/data.ts). Urutannya itu yang menentukan, bukan isi fungsinya:
 *
 *   dari nama Inggris   "Metagama Information System" → "metagama-information-system"
 *   dari terjemahan     "Sistem Informasi Metagama"   → "sistem-informasi-metagama"
 *
 * Yang kedua bukan sekadar URL yang jelek. Slug adalah identitas project di URL,
 * jadi slug yang berbeda antar bahasa membuat /projects/<slug> menunjuk project
 * yang tidak ada di bahasa lain: tautan dari halaman Indonesia 404 di halaman
 * Inggris, dan `alternates.languages` di metadata menjanjikan ke Google pasangan
 * halaman yang tidak pernah ada. Karena itu slug harus sama di kedua bahasa, dan
 * satu-satunya nama yang sama di kedua bahasa adalah nama Inggris.
 *
 * @template {{ name: string }} T
 * @param {T[]} projects
 * @returns {(T & { slug: string })[]}
 */
export function withProjectSlugs(projects) {
  return projects.map((p) => ({ ...p, slug: projectSlug(p.name) }));
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

/**
 * Ambil nilai sesuai bahasa, dengan Inggris sebagai cadangan.
 *
 * Terjemahan Indonesia disimpan sebagai KEMBARAN di sebelah nilai Inggris
 * (kunci `foo_id` di sebelah `foo`), bukan sebagai dokumen terpisah. Aturan
 * pembacaannya ada di sini dan hanya di sini, karena inilah satu-satunya
 * keputusan yang bisa salah dan diam-diam: kalau cadangannya lupa, halaman
 * berbahasa Indonesia menampilkan bidang KOSONG — dan bidang kosong di tengah
 * halaman yang lain terisi jauh lebih membingungkan daripada teks yang masih
 * berbahasa Inggris.
 *
 * `_id` yang kosong ATAU berisi spasi saja dianggap belum diterjemahkan, karena
 * itulah yang dihasilkan kolom teks yang dibiarkan kosong di admin. String
 * kosong bukan terjemahan.
 *
 * `_id` yang tidak ada (undefined) juga jatuh ke Inggris: dokumen lama di
 * profile_doc tidak punya kuncinya sama sekali, dan itu harus tetap valid.
 *
 * @param {string | undefined | null} en
 * @param {string | undefined | null} id
 * @param {string} lang
 * @returns {string}
 */
export function pickLocalized(en, id, lang) {
  if (lang === "id" && typeof id === "string" && id.trim() !== "") return id;
  return en ?? "";
}

/**
 * Versi pickLocalized untuk array paragraf (deskripsi project, highlights
 * experience). Panjang kedua versi boleh berbeda — terjemahan wajar memecah
 * paragraf secara berbeda.
 *
 * Elemen kosong DIBUANG dari sisi Indonesia, dan itu bukan kerapian: deskripsi
 * project disimpan satu baris per paragraf di tabel dengan kunci
 * (project_id, sort_order), jadi dua bahasa dengan jumlah paragraf berbeda
 * terpaksa berbagi baris yang sama dan sisi yang lebih pendek diisi string
 * kosong. Tanpa penyaringan ini, paragraf kosong itu ikut ter-render sebagai
 * jarak menganga di tengah halaman.
 *
 * @param {string[] | undefined | null} en
 * @param {string[] | undefined | null} id
 * @param {string} lang
 * @returns {string[]}
 */
export function pickLocalizedArray(en, id, lang) {
  if (lang === "id" && Array.isArray(id)) {
    const cleaned = id.filter((s) => typeof s === "string" && s.trim() !== "");
    if (cleaned.length > 0) return cleaned;
  }
  return en ?? [];
}

/**
 * pickLocalized untuk nilai yang boleh berupa string tunggal ATAU array
 * (deskripsi project di content/profile.json memakai keduanya — lihat
 * descToArray). Memilih helper yang tepat, bukan menyalin aturannya.
 *
 * @param {string | string[] | undefined | null} en
 * @param {string | string[] | undefined | null} id
 * @param {string} lang
 * @returns {string | string[]}
 */
export function pickLocalizedText(en, id, lang) {
  const enIsArray = Array.isArray(en);
  const idIsArray = Array.isArray(id);

  if (enIsArray || idIsArray) {
    return pickLocalizedArray(
      enIsArray ? en : en == null ? [] : [en],
      idIsArray ? id : id == null ? [] : [id],
      lang
    );
  }
  return pickLocalized(en, id, lang);
}

/**
 * Buang elemen kosong di UJUNG array saja — bukan di tengah.
 *
 * Dipakai saat MEMBACA kembali paragraf dua bahasa dari tabel, yang menyimpan
 * satu paragraf per baris dengan kunci (project_id, sort_order). Dua bahasa
 * dengan jumlah paragraf berbeda berbagi baris yang sama dan yang lebih pendek
 * diisi string kosong di BELAKANG, jadi membuang ekor kosong mengembalikan
 * array aslinya utuh.
 *
 * Elemen kosong di TENGAH sengaja dipertahankan: itu paragraf kosong yang
 * memang diketik pengguna, dan membuangnya akan menggeser paragraf sesudahnya
 * ke posisi yang salah.
 *
 * @template T
 * @param {T[] | undefined | null} arr
 * @returns {T[]}
 */
export function trimTrailingEmpty(arr) {
  if (!Array.isArray(arr)) return [];
  let end = arr.length;
  while (end > 0) {
    const v = arr[end - 1];
    if (v == null || String(v).trim() === "") end--;
    else break;
  }
  return arr.slice(0, end);
}

/**
 * Apakah pathname ini menunjuk sebuah FILE, bukan sebuah rute halaman?
 *
 * Dipakai middleware untuk memutuskan apakah sebuah request boleh diberi prefiks
 * locale. Request untuk file di public/ tidak punya prefiks locale — dan tidak
 * boleh diberi, karena file itu memang disajikan apa adanya di path-nya. Tanpa
 * pemeriksaan ini, "/image/diwan2.png" (foto profil, dan semua ikon social)
 * akan di-redirect ke "/en/image/diwan2.png" lalu 404.
 *
 * Aturannya "segmen terakhir mengandung titik", dan di sini ada dua hal yang
 * mudah salah:
 *
 *   - "/" → segmen terakhirnya string KOSONG, bukan "/". Implementasi yang
 *     memeriksa pathname utuh atau mengambil segmen dengan cara lain bisa
 *     menganggap beranda sebagai file, dan seluruh situs berhenti di-redirect.
 *   - slug project tidak pernah mengandung titik (projectSlug menyisakan
 *     [a-z0-9] dan tanda hubung saja), jadi tidak ada halaman yang salah
 *     dianggap file.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function looksLikeFile(pathname) {
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

/**
 * Prefiks locale sebuah path, atau undefined kalau tidak ada.
 *
 * Dipakai middleware untuk memutuskan apakah sebuah URL sudah berbahasa atau
 * belum — dan itu keputusan yang menentukan seluruh situs:
 *
 *   - "/english-notes" BUKAN "/en" diikuti "/glish-notes". Kecocokannya harus
 *     persis satu segmen penuh. Kalau tidak, halaman yang kebetulan diawali
 *     kode bahasa dianggap sudah berbahasa, tidak di-redirect, lalu 404.
 *   - "/en" (tanpa segmen sesudahnya) tetap cocok.
 *   - "/projects/en" TIDAK cocok: "en" di situ slug project, bukan prefiks.
 *
 * Ada di sini, bukan sebagai regex di middleware, karena kasus batas di atas
 * persis jenis yang tidak akan terlihat sampai ada yang mengkliknya — dan di
 * sini mereka ditutup oleh `npm test`.
 *
 * @param {string} pathname
 * @param {readonly string[]} locales
 * @returns {string | undefined}
 */
export function localePrefix(pathname, locales) {
  const first = /^\/([^/]+)/.exec(pathname)?.[1];
  return first !== undefined && locales.includes(first) ? first : undefined;
}
