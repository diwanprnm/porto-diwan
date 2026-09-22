import { getPool } from "./db";

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
  __meta: { version: number; updated_at: string };
};

// Bagian yang disimpan sebagai satu dokumen JSONB di tabel profile_doc.
// `projects` TIDAK termasuk — itu tabel sendiri.
type ProfileDoc = Omit<ProfileData, "projects">;

// URL gambar disimpan di dalam data sebagai "/api/images/<id>". Angka id-nya
// yang dipakai sebagai foreign key, jadi perlu diekstrak balik. Regex ini juga
// otomatis menolak path lama ("/image/x.png") — hasilnya null, yang berarti
// "tidak ada gambar".
function imageIdFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const m = url.match(/^\/api\/images\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function imageUrlFromId(id: string | number | null): string {
  if (id === null) return "";
  return `/api/images/${id}`;
}

/**
 * Baca seluruh data CV dari database.
 *
 * Bentuk nilai kembaliannya sengaja dipertahankan persis seperti versi
 * file-JSON dulu, supaya halaman publik tidak perlu tahu sumber datanya
 * berubah. Yang berbeda hanya isi `image`: sekarang "/api/images/<id>".
 */
export async function getProfileData(): Promise<ProfileData> {
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
    client: string;
    image_id: string | null;
    github_url: string;
    live_url: string;
    descriptions: string[];
    skills: string[];
  }>(
    `SELECT
       p.name,
       p.client,
       p.image_id,
       p.github_url,
       p.live_url,
       COALESCE(
         (SELECT json_agg(d.body ORDER BY d.sort_order)
            FROM project_descriptions d WHERE d.project_id = p.id),
         '[]'::json
       ) AS descriptions,
       COALESCE(
         (SELECT json_agg(s.name ORDER BY s.sort_order)
            FROM project_skills s WHERE s.project_id = p.id),
         '[]'::json
       ) AS skills
     FROM projects p
     ORDER BY p.sort_order, p.id`
  );

  const projects: Project[] = projRows.map((r) => ({
    name: r.name,
    client: r.client,
    image: imageUrlFromId(r.image_id),
    github_url: r.github_url,
    live_url: r.live_url,
    description: r.descriptions,
    skills: r.skills,
  }));

  return { ...docRows[0].doc, projects };
}

/**
 * Simpan seluruh data CV.
 *
 * Dokumen JSONB dan tabel projects ditulis dalam SATU transaksi: kalau ada satu
 * bagian yang gagal, tidak ada yang setengah tersimpan.
 *
 * Urutan operasinya penting — projects disinkronkan lebih dulu, baru gambar
 * tanpa rujukan dibersihkan, supaya gambar yang masih dipakai tidak ikut
 * terhapus.
 */
export async function saveProfileData(data: ProfileData): Promise<number> {
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
        `INSERT INTO projects (slug, name, client, image_id, github_url, live_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           name       = EXCLUDED.name,
           client     = EXCLUDED.client,
           image_id   = EXCLUDED.image_id,
           github_url = EXCLUDED.github_url,
           live_url   = EXCLUDED.live_url,
           sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [
          slug,
          p.name,
          p.client ?? "",
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
      const descriptions = descToArray(p.description)
        .map((s) => s.trim())
        .filter(Boolean);
      for (let d = 0; d < descriptions.length; d++) {
        await client.query(
          `INSERT INTO project_descriptions (project_id, sort_order, body) VALUES ($1, $2, $3)`,
          [projectId, d, descriptions[d]]
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

export function groupSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
  const groups: Record<string, Skill[]> = {};
  for (const s of skills) {
    (groups[s.category] ??= []).push(s);
  }
  return groups;
}

export function descToArray(desc: string | string[]): string[] {
  if (Array.isArray(desc)) return desc;
  return [desc];
}

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
 * CATATAN: fungsi ini punya salinan di scripts/db.mjs (script .mjs tidak bisa
 * mengimpor .ts). Kalau aturan slug diubah, ubah dua tempat.
 */
export function projectSlug(name: string): string {
  return name
    .split("—")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findProjectBySlug(projects: Project[], slug: string): Project | undefined {
  return projects.find((p) => projectSlug(p.name) === slug);
}
