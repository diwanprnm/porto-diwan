// Migrasi + seed database.
//
//   node scripts/db.mjs
//
// Dua peran:
//   1. Terapkan db/schema.sql (idempoten, aman dijalankan berkali-kali).
//   2. Kalau database masih kosong, isi dari content/profile.json — termasuk
//      memindahkan file gambar di public/image/ menjadi BLOB di tabel images.
//
// Ditulis .mjs biasa (bukan .ts) supaya bisa dijalankan `node` langsung tanpa
// perlu tsx/ts-node. Karena itu tipe dari src/lib/data.ts tidak bisa diimpor di
// sini, dan bentuk data diperlakukan sebagai JSON apa adanya.
//
// Aturan yang perlu diuji tetap bisa dipakai bersama: pure.mjs juga .mjs, jadi
// file itu diimpor langsung (lihat di bawah) tanpa toolchain.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// projectSlug diimpor, bukan disalin. Sebelumnya fungsi ini punya salinan di
// sini, dan salinan seperti itu menyimpang tanpa ada yang tahu: seed memakai
// slug sebagai kunci, sementara aplikasi menghitung URL /projects/<slug> dari
// aturan yang sama. Kalau keduanya berbeda, link ke project jadi 404 tanpa satu
// pun error muncul di mana pun.
//
// Impor lintas bahasa ini bisa karena aturannya tinggal di pure.mjs, bukan .ts —
// script .mjs tidak bisa memuat TypeScript.
//
// PENTING: file ini dijalankan di dalam container (`npm run db:migrate` dipanggil
// scripts/deploy-remote.sh setiap deploy). Karena itu pure.mjs ikut disalin ke
// image — lihat dockerfile stage runner. Tanpa itu, migrasi gagal dengan
// ERR_MODULE_NOT_FOUND, dan kegagalan itu tidak tertangkap smoke test.
import { projectSlug } from "../src/lib/pure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Node 20.12+ bisa membaca .env sendiri. Kalau tidak ada, abaikan — mungkin
// DATABASE_URL memang diisi dari environment (mis. lewat docker-compose).
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // .env tidak ada. Bukan masalah selama DATABASE_URL diisi dari luar.
}

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function log(msg) {
  console.log(msg);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL belum diisi.\n" +
        "  Lokal : salin .env.example jadi .env\n" +
        "  Docker: jalankan lewat `docker compose run --rm portfolio npm run db:migrate`"
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // ── 1. Skema ───────────────────────────────────────────────────────────
    const schema = await readFile(path.join(root, "db", "schema.sql"), "utf-8");
    await client.query(schema);
    log("✓ Skema diterapkan (db/schema.sql).");

    // ── 2. Seed ────────────────────────────────────────────────────────────
    const { rows: projRows } = await client.query("SELECT count(*)::int AS n FROM projects");
    const { rows: docRows } = await client.query("SELECT count(*)::int AS n FROM profile_doc");
    if (projRows[0].n > 0 || docRows[0].n > 0) {
      log("• Database sudah berisi data — seed dilewati.");
      return;
    }

    const raw = await readFile(path.join(root, "content", "profile.json"), "utf-8");
    const data = JSON.parse(raw);
    log("• content/profile.json dibaca, mulai seed...");

    // Kumpulkan semua path gambar lokal yang dirujuk, supaya tiap file hanya
    // dimasukkan sekali ke tabel images.
    const referenced = new Set();
    if (data.profile?.image) referenced.add(data.profile.image);
    for (const s of data.socials ?? []) if (s.icon) referenced.add(s.icon);
    for (const p of data.projects ?? []) if (p.image) referenced.add(p.image);

    // path lama ("/image/x.png") → URL baru ("/api/images/12")
    const urlByOldPath = new Map();
    const skipped = [];

    for (const oldPath of referenced) {
      // "/image/x.png" → public/image/x.png
      const diskPath = path.join(root, "public", oldPath.replace(/^\//, ""));
      const ext = path.extname(diskPath).toLowerCase();
      const mime = MIME_BY_EXT[ext];

      if (!mime) {
        skipped.push(`${oldPath} (ekstensi ${ext || "tanpa ekstensi"} tidak dikenal)`);
        continue;
      }

      let bytes;
      try {
        bytes = await readFile(diskPath);
      } catch {
        skipped.push(`${oldPath} (file tidak ada di public/)`);
        continue;
      }

      const { rows } = await client.query(
        `INSERT INTO images (filename, mime, bytes) VALUES ($1, $2, $3) RETURNING id`,
        [path.basename(diskPath), mime, bytes]
      );
      urlByOldPath.set(oldPath, `/api/images/${rows[0].id}`);
      log(`  → gambar ${oldPath} → /api/images/${rows[0].id} (${Math.round(bytes.length / 1024)} KB)`);
    }

    if (skipped.length > 0) {
      log(`  ! Dilewati: ${skipped.join("; ")}`);
      log("    Field gambarnya akan dibiarkan kosong dan bisa di-upload lewat /admin.");
    }

    // ── Projects ───────────────────────────────────────────────────────────
    await client.query("BEGIN");
    try {
      let order = 0;
      for (const p of data.projects ?? []) {
        const imageUrl = p.image ? urlByOldPath.get(p.image) ?? null : null;
        // image_id diambil dari URL hasil, bukan dari path lama.
        let imageId = null;
        if (imageUrl) {
          const m = imageUrl.match(/\/api\/images\/(\d+)/);
          if (m) imageId = Number(m[1]);
        }

        const { rows } = await client.query(
          `INSERT INTO projects (slug, name, client, image_id, github_url, live_url, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            projectSlug(p.name),
            p.name,
            p.client ?? "",
            imageId,
            p.github_url ?? "",
            p.live_url ?? "",
            order++,
          ]
        );
        const projectId = rows[0].id;

        const descs = Array.isArray(p.description) ? p.description : [p.description ?? ""];
        let dOrder = 0;
        for (const body of descs.filter(Boolean)) {
          await client.query(
            `INSERT INTO project_descriptions (project_id, sort_order, body) VALUES ($1, $2, $3)`,
            [projectId, dOrder++, body]
          );
        }

        let sOrder = 0;
        for (const name of p.skills ?? []) {
          await client.query(
            `INSERT INTO project_skills (project_id, sort_order, name) VALUES ($1, $2, $3)`,
            [projectId, sOrder++, name]
          );
        }
      }

      // ── Sisa data sebagai satu dokumen JSONB ─────────────────────────────
      // Path gambar di dalam dokumen ikut ditulis ulang ke URL baru, supaya
      // tidak ada lagi rujukan ke /image/... yang tidak disajikan aplikasi.
      const doc = {
        profile: {
          ...data.profile,
          image: data.profile?.image
            ? urlByOldPath.get(data.profile.image) ?? ""
            : "",
        },
        contact: data.contact ?? {},
        education: data.education ?? {},
        skills: data.skills ?? [],
        socials: (data.socials ?? []).map((s) => ({
          ...s,
          icon: s.icon ? urlByOldPath.get(s.icon) ?? "" : "",
        })),
        experience: data.experience ?? [],
        languages: data.languages ?? [],
        __meta: data.__meta ?? { version: 1, updated_at: new Date().toISOString() },
      };

      await client.query(
        `INSERT INTO profile_doc (id, doc) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`,
        [JSON.stringify(doc)]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const n = (data.projects ?? []).length;
    log(`✓ Seed selesai: ${n} project, ${urlByOldPath.size} gambar, ${(data.skills ?? []).length} skill.`);
    log("");
    log("Langkah berikutnya: jalankan aplikasi (npm run dev) lalu buka /admin.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
