import { getPool } from "./db";

// Empat fungsi murni tinggal di pure.mjs, bukan di sini, supaya bisa diuji tanpa
// database dan tanpa framework test (lihat komentar di file itu). Yang penting:
// hanya ada SATU salinan. Sebelumnya projectSlug disalin di scripts/db.mjs dan
// descToArray disalin di AdminEditor.tsx — salinan seperti itu menyimpang tanpa
// ada yang tahu, dan test yang menguji salinan tidak membuktikan apa pun tentang
// kode yang benar-benar jalan.
//
// Nama-nama ini diteruskan ke bawah supaya pemanggil lama
// (src/app/[lang]/page.tsx, src/app/[lang]/projects/[slug]/page.tsx) tidak perlu
// diubah.
import {
  projectSlug,
  descToArray,
  groupSkillsByCategory,
  findProjectBySlug,
  withProjectSlugs,
  imageIdFromUrl,
  imageUrlFromId,
  pickLocalized,
  pickLocalizedArray,
  pickLocalizedText,
  trimTrailingEmpty,
} from "./pure.mjs";

import { DEFAULT_LOCALE, type Locale } from "./i18n";

export { projectSlug, descToArray, groupSkillsByCategory, findProjectBySlug };

export type Skill = {
  name: string;
  category: string;
};

export type Social = {
  platform: string;
  url: string;
  icon: string;
};

export type Experience = {
  period: string;
  title: string;
  company: string;
  highlights: string[];
  skills: string[];
};

export type Project = {
  name: string;
  /**
   * Slug URL kanonik, dihitung dari nama INGGRIS dan TIDAK ikut diterjemahkan.
   *
   * Wajib, bukan opsional: slug dipakai untuk membangun dan mencocokkan URL
   * /projects/<slug>, dan project tanpa slug berarti halaman detailnya tidak
   * punya alamat. Yang mengisinya hanya `withProjectSlugs`, dipanggil di dalam
   * resolveProfileData — jadi setiap `Project` (hasil terjemahan) sudah punya.
   *
   * `ProjectStored` dan baris mentah content/profile.json TIDAK punya slug:
   * keduanya dibaca sebelum slug dihitung, dan slug-nya dihitung ulang dari
   * `name` saat ditulis (lihat saveProfileData). `slugOf` di pure.mjs adalah
   * pembaca yang aman untuk keduanya — ia jatuh ke projectSlug(project.name).
   */
  slug: string;
  client: string;
  image: string;
  github_url: string;
  /** Opsional. Kosong = tombol "Live" tidak dirender, jadi tidak ada link mati. */
  live_url?: string;
  description: string | string[];
  skills: string[];
};

export type Language = {
  name: string;
  level: string;
};

export type Certification = {
  name: string;
  issuer: string;
  date: string;
  /** Opsional. Kosong = link "Verify" tidak dirender, jadi tidak ada link mati. */
  url?: string;
};

export type ProfileData = {
  profile: {
    name: string;
    title: string;
    image: string;
    bio: string;
    about: string;
  };
  contact: {
    location: string;
    email: string;
    phone: string;
    website: string;
  };
  education: {
    school: string;
    degree: string;
    period: string;
    gpa: string;
  };
  skills: Skill[];
  socials: Social[];
  experience: Experience[];
  projects: Project[];
  languages?: Language[];
  /**
   * Opsional. Dokumen lama di profile_doc tidak punya kunci ini, jadi setiap
   * pembaca harus siap menerima undefined — bukan array kosong.
   */
  certifications?: Certification[];
  __meta: { version: number; updated_at: string };
};

// ── Bentuk TERSIMPAN (dua bahasa) ──────────────────────────────────────────
//
// Bahasa Indonesia disimpan sebagai KEMBARAN di sebelah nilai Inggris, dengan
// akhiran `_id` — bukan sebagai dokumen kedua. Dua alasan:
//
//   1. Aditif. Semua nilai yang sudah ada berbahasa Inggris, jadi tidak ada
//      migrasi data: dokumen lama tetap valid apa adanya, dan field yang belum
//      diterjemahkan tampil dalam bahasa Inggris, bukan kosong.
//   2. Satu baris = satu project. Kalau dua bahasa jadi dua baris, kolom slug
//      yang unik itu mustahil, dan `image_id`/`github_url`/`live_url` yang
//      memang netral bahasa jadi punya dua salinan yang bisa menyimpang.
//
// Kembarannya OPSIONAL semua: dokumen yang belum pernah diterjemahkan tidak
// punya kuncinya sama sekali.
export type ExperienceStored = Experience & {
  period_id?: string;
  title_id?: string;
  highlights_id?: string[];
};

export type ProjectStored = Omit<Project, "slug"> & {
  /**
   * Slug tidak disimpan di database — selalu dihitung ulang dari `name` saat
   * dibaca dan saat ditulis. Opsional di sini karena data yang datang dari
   * editor memang tidak membawanya, dan nilai yang ikut terkirim diabaikan
   * (lihat saveProfileData: yang dipakai selalu projectSlug(p.name)).
   */
  slug?: string;
  name_id?: string;
  client_id?: string;
  description_id?: string | string[];
};

export type LanguageStored = Language & { name_id?: string; level_id?: string };

export type CertificationStored = Certification & {
  name_id?: string;
  issuer_id?: string;
  date_id?: string;
};

export type ProfileDataStored = Omit<ProfileData, "experience" | "projects" | "languages" | "certifications"> & {
  profile: ProfileData["profile"] & { title_id?: string; bio_id?: string; about_id?: string };
  education: ProfileData["education"] & { degree_id?: string };
  experience: ExperienceStored[];
  projects: ProjectStored[];
  languages?: LanguageStored[];
  certifications?: CertificationStored[];
};

// Bagian yang disimpan sebagai satu dokumen JSONB di tabel profile_doc.
// `projects` TIDAK termasuk — itu tabel sendiri.
type ProfileDoc = Omit<ProfileDataStored, "projects">;

/**
 * Ubah dokumen tersimpan (dua bahasa) menjadi satu bahasa.
 *
 * Ini satu-satunya tempat aturan "Indonesia jatuh ke Inggris" dijalankan untuk
 * data, dan hasilnya bertipe `ProfileData` biasa — string, bukan pasangan.
 * Halaman publik karena itu tidak perlu tahu apa-apa soal bentuk penyimpanan:
 * `page.tsx` menerima `profile.bio` sebagai string, persis seperti sebelumnya.
 *
 * Fungsi murni, jadi bisa diuji tanpa database — lihat tests/pure.test.mjs.
 */
export function resolveProfileData(
  stored: ProfileDataStored,
  lang: Locale
): ProfileData {
  const experience: Experience[] = (stored.experience ?? []).map((e) => ({
    period: pickLocalized(e.period, e.period_id, lang),
    title: pickLocalized(e.title, e.title_id, lang),
    // company & skills netral bahasa — nama perusahaan dan nama teknologi
    // tidak diterjemahkan.
    company: e.company,
    highlights: pickLocalizedArray(e.highlights, e.highlights_id, lang),
    skills: e.skills ?? [],
  }));

  // Slug dihitung DI SINI, selagi `name` masih berbahasa Inggris.
  //
  // Urutan ini yang penting: kalau slug dihitung sesudah pickLocalized, nama
  // yang dipakai adalah terjemahan, dan project yang namanya diterjemahkan
  // mendapat slug berbeda di tiap bahasa — "metagama-information-system" di
  // Inggris, "sistem-informasi-metagama" di Indonesia. Akibatnya tautan project
  // dari halaman Indonesia 404 di halaman Inggris.
  const projects: Project[] = withProjectSlugs(stored.projects ?? []).map((p) => ({
    slug: p.slug,
    name: pickLocalized(p.name, p.name_id, lang),
    client: pickLocalized(p.client, p.client_id, lang),
    image: p.image,
    github_url: p.github_url,
    live_url: p.live_url,
    description: pickLocalizedText(p.description, p.description_id, lang),
    skills: p.skills ?? [],
  }));

  const languages = stored.languages?.map((l) => ({
    name: pickLocalized(l.name, l.name_id, lang),
    level: pickLocalized(l.level, l.level_id, lang),
  }));

  const certifications = stored.certifications?.map((c) => ({
    name: pickLocalized(c.name, c.name_id, lang),
    issuer: pickLocalized(c.issuer, c.issuer_id, lang),
    date: pickLocalized(c.date, c.date_id, lang),
    url: c.url,
  }));

  return {
    profile: {
      name: stored.profile.name,
      title: pickLocalized(stored.profile.title, stored.profile.title_id, lang),
      image: stored.profile.image,
      bio: pickLocalized(stored.profile.bio, stored.profile.bio_id, lang),
      about: pickLocalized(stored.profile.about, stored.profile.about_id, lang),
    },
    contact: stored.contact,
    education: {
      school: stored.education.school,
      degree: pickLocalized(stored.education.degree, stored.education.degree_id, lang),
      period: stored.education.period,
      gpa: stored.education.gpa,
    },
    skills: stored.skills ?? [],
    socials: stored.socials ?? [],
    experience,
    projects,
    languages,
    certifications,
    __meta: stored.__meta,
  };
}

/**
 * Baca seluruh data CV dari database, sudah diterjemahkan ke `lang`.
 *
 * Bentuk nilai kembaliannya sengaja dipertahankan persis seperti versi
 * satu-bahasa dulu, supaya halaman publik tidak perlu tahu sumber datanya
 * berubah. Yang berbeda hanya isi `image`: sekarang "/api/images/<id>".
 */
export async function getProfileData(
  lang: Locale = DEFAULT_LOCALE
): Promise<ProfileData> {
  const stored = await getProfileDataRaw();
  return resolveProfileData(stored, lang);
}

/**
 * Baca data APA ADANYA — kedua bahasa utuh, tanpa diterjemahkan.
 *
 * Dipakai oleh /admin, dan itu bukan pilihan gaya: kalau editor menerima hasil
 * yang sudah diterjemahkan, menekan Save akan menulis kembali nilai bahasa
 * Inggris ke kolom Indonesia — artinya membuka editor lalu menyimpan
 * MENGHAPUS seluruh terjemahan. Editor harus melihat dan mengirim balik apa
 * yang benar-benar tersimpan.
 */
export async function getProfileDataRaw(): Promise<ProfileDataStored> {
  const pool = getPool();

  const { rows: docRows } = await pool.query<{ doc: ProfileDoc }>(
    "SELECT doc FROM profile_doc WHERE id = 1"
  );

  if (docRows.length === 0) {
    // Sengaja melempar error, bukan mengembalikan data kosong. Halaman kosong
    // tanpa penjelasan jauh lebih membingungkan daripada pesan yang jelas.
    throw new Error(
      "Database belum berisi data. Jalankan `npm run db:migrate` untuk mengisi dari content/profile.json."
    );
  }

  // Deskripsi dan skills diambil sekaligus lewat subquery, jadi tidak ada N+1
  // query saat jumlah project bertambah.
  //
  // CATATAN tipe: kolom BIGINT dikembalikan node-postgres sebagai STRING, bukan
  // number — pg sengaja tidak mengonversinya supaya id di atas 2^53 tidak
  // kehilangan presisi. Jadi `image_id` di sini bertipe string, dan penanganan
  // di bawah harus memperlakukan keduanya (number dari hasil imageIdFromUrl,
  // string dari database) sebagai sama.
  const { rows: projRows } = await pool.query<{
    name: string;
    name_id: string;
    client: string;
    client_id: string;
    image_id: string | null;
    github_url: string;
    live_url: string;
    descriptions: string[];
    descriptions_id: string[];
    skills: string[];
  }>(
    `SELECT
       p.name,
       p.name_id,
       p.client,
       p.client_id,
       p.image_id,
       p.github_url,
       p.live_url,
       COALESCE(
         (SELECT json_agg(d.body ORDER BY d.sort_order)
            FROM project_descriptions d WHERE d.project_id = p.id),
         '[]'::json
       ) AS descriptions,
       COALESCE(
         (SELECT json_agg(d.body_id ORDER BY d.sort_order)
            FROM project_descriptions d WHERE d.project_id = p.id),
         '[]'::json
       ) AS descriptions_id,
       COALESCE(
         (SELECT json_agg(s.name ORDER BY s.sort_order)
            FROM project_skills s WHERE s.project_id = p.id),
         '[]'::json
       ) AS skills
     FROM projects p
     ORDER BY p.sort_order, p.id`
  );

  const projects: ProjectStored[] = projRows.map((r) => ({
    name: r.name,
    name_id: r.name_id ?? "",
    client: r.client,
    client_id: r.client_id ?? "",
    image: imageUrlFromId(r.image_id),
    github_url: r.github_url,
    live_url: r.live_url,
    // Deskripsi disimpan satu paragraf per baris, dan dua bahasa dengan jumlah
    // paragraf berbeda berbagi baris yang sama — yang lebih pendek diisi string
    // kosong di belakang. Membuang ekor kosong mengembalikan array aslinya.
    description: trimTrailingEmpty(r.descriptions),
    description_id: trimTrailingEmpty(r.descriptions_id),
    skills: r.skills,
  }));

  return { ...docRows[0].doc, projects };
}

/**
 * Simpan seluruh data CV.
 *
 * Menerima bentuk TERSIMPAN (dua bahasa), bukan hasil terjemahan — lihat
 * catatan di getProfileDataRaw soal kenapa itu wajib.
 *
 * Dokumen JSONB dan tabel projects ditulis dalam SATU transaksi: kalau ada satu
 * bagian yang gagal, tidak ada yang setengah tersimpan.
 *
 * Urutan operasinya penting — projects disinkronkan lebih dulu, baru gambar
 * tanpa rujukan dibersihkan, supaya gambar yang masih dipakai tidak ikut
 * terhapus.
 */
export async function saveProfileData(data: ProfileDataStored): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Versi dibaca di dalam transaksi, bukan dari data yang dikirim klien.
    // Kalau memakai data.__meta, dua tab admin yang terbuka bersamaan akan
    // saling menimpa nomor versinya.
    const { rows: versionRows } = await client.query<{ version: number }>(
      `SELECT COALESCE((doc->'__meta'->>'version')::int, 0) AS version
         FROM profile_doc WHERE id = 1`
    );
    const version = (versionRows[0]?.version ?? 0) + 1;
    const meta = { version, updated_at: new Date().toISOString() };

    // ── 1. Dokumen JSONB ───────────────────────────────────────────────────
    const { projects, ...doc } = data;
    const fullDoc: ProfileDoc = { ...doc, __meta: meta };

    await client.query(
      `INSERT INTO profile_doc (id, doc) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`,
      [JSON.stringify(fullDoc)]
    );

    // ── 2. Projects ────────────────────────────────────────────────────────
    // Sinkronisasi berbasis slug: project yang slug-nya tidak ada lagi di data
    // masuk akan terhapus (beserta deskripsi & skill-nya lewat ON DELETE
    // CASCADE).
    //
    // Slug SELALU dihitung dari `p.name` — nama kanonik berbahasa Inggris —
    // bukan dari nama yang sedang ditampilkan. Kalau memakai `name_id`, URL
    // /projects/<slug> akan berbeda antar bahasa, dan mengubah terjemahan akan
    // menghapus lalu membuat ulang baris project (karena slug-nya berubah),
    // sehingga link lama mati.
    //
    // Konsekuensi yang perlu diketahui: kalau nama project diubah, slug-nya ikut
    // berubah, jadi baris lama terhapus dan URL /projects/<slug> yang lama jadi
    // 404. Sama seperti perilaku versi file-JSON dulu.
    const incomingSlugs = projects.map((p) => projectSlug(p.name));

    if (incomingSlugs.length > 0) {
      await client.query(`DELETE FROM projects WHERE slug <> ALL($1::text[])`, [incomingSlugs]);
    } else {
      // Tidak ada project sama sekali di data masuk — berarti semuanya dihapus.
      await client.query("DELETE FROM projects");
    }

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const slug = projectSlug(p.name);

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO projects (slug, name, name_id, client, client_id, image_id, github_url, live_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET
           name       = EXCLUDED.name,
           name_id    = EXCLUDED.name_id,
           client     = EXCLUDED.client,
           client_id  = EXCLUDED.client_id,
           image_id   = EXCLUDED.image_id,
           github_url = EXCLUDED.github_url,
           live_url   = EXCLUDED.live_url,
           sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [
          slug,
          p.name,
          p.name_id ?? "",
          p.client ?? "",
          p.client_id ?? "",
          imageIdFromUrl(p.image),
          p.github_url ?? "",
          p.live_url ?? "",
          i,
        ]
      );
      const projectId = rows[0].id;

      // Deskripsi & skills ditulis ulang seluruhnya. Lebih sederhana dan pasti
      // benar dibanding mencocokkan baris satu per satu, dan jumlahnya kecil.
      await client.query("DELETE FROM project_descriptions WHERE project_id = $1", [projectId]);

      // Kedua bahasa DISEJajarkan ke jumlah baris yang sama.
      //
      // Tabel ini menyimpan satu paragraf per baris dengan kunci
      // (project_id, sort_order), jadi dua bahasa dengan jumlah paragraf
      // berbeda tidak punya barisnya sendiri. Yang lebih pendek diisi string
      // kosong, dan trimTrailingEmpty di getProfileDataRaw membuangnya lagi
      // saat dibaca. Tanpa penyejajaran ini, paragraf bahasa Indonesia yang
      // lebih banyak daripada Inggris akan terpotong diam-diam saat disimpan.
      // `?? ""` bukan sekadar penjaga tipe: descToArray(undefined) menghasilkan
      // [undefined], dan .trim() di bawahnya akan melempar. Project yang
      // deskripsinya tidak pernah diisi tetap harus bisa disimpan.
      const descEn = descToArray(p.description ?? "")
        .map((s) => s.trim())
        .filter(Boolean);
      const descId = descToArray(p.description_id ?? "")
        .map((s) => s.trim())
        .filter(Boolean);
      const descRows = Math.max(descEn.length, descId.length);

      for (let d = 0; d < descRows; d++) {
        await client.query(
          `INSERT INTO project_descriptions (project_id, sort_order, body, body_id) VALUES ($1, $2, $3, $4)`,
          [projectId, d, descEn[d] ?? "", descId[d] ?? ""]
        );
      }

      await client.query("DELETE FROM project_skills WHERE project_id = $1", [projectId]);
      const skills = (p.skills ?? []).filter(Boolean);
      for (let s = 0; s < skills.length; s++) {
        await client.query(
          `INSERT INTO project_skills (project_id, sort_order, name) VALUES ($1, $2, $3)`,
          [projectId, s, skills[s]]
        );
      }
    }

    // ── 3. Bersihkan gambar tanpa rujukan ──────────────────────────────────
    // Mengganti gambar project meninggalkan BLOB lama yang tidak dipakai siapa
    // pun. Karena gambar disimpan di dalam database, tumpukan ini membengkakkan
    // ukuran database, jadi dibersihkan di sini.
    //
    // Himpunan gambar yang dirujuk dihitung di JavaScript, bukan lewat regex di
    // SQL, karena ada dua bentuk rujukan: foreign key (projects.image_id) dan
    // teks URL di dalam dokumen (foto profil + ikon socials). Menghitungnya di
    // sini juga membuat satu sumber kebenaran yang jelas.
    const referenced = new Set<number>();
    for (const p of projects) {
      const id = imageIdFromUrl(p.image);
      if (id !== null) referenced.add(id);
    }
    for (const m of JSON.stringify(fullDoc).matchAll(/\/api\/images\/(\d+)/g)) {
      referenced.add(Number(m[1]));
    }

    // Ada masa tenggang 1 jam: gambar yang baru di-upload lewat /api/upload tapi
    // belum sempat ditekan Save tidak boleh ikut terhapus.
    //
    // Kalau tidak ada satu pun gambar yang dirujuk, pembersihan DILEWATI.
    // `id <> ALL('{}')` bernilai benar untuk semua baris, jadi tanpanya seluruh
    // tabel images akan terhapus. Membiarkan gambar yatim lebih aman daripada
    // menghapus semuanya karena salah hitung rujukan.
    if (referenced.size > 0) {
      await client.query(
        `DELETE FROM images
          WHERE created_at < now() - interval '1 hour'
            AND id <> ALL($1::bigint[])`,
        [[...referenced]]
      );
    }

    await client.query("COMMIT");
    return version;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
