-- Skema database portofolio.
--
-- Semua CREATE memakai IF NOT EXISTS supaya file ini aman dijalankan berkali-kali
-- (docker-entrypoint-initdb.d menjalankannya sekali saat volume dibuat, dan
-- `npm run db:migrate` bisa menjalankannya lagi kapan saja).

-- ── Gambar ────────────────────────────────────────────────────────────────
-- Bytes gambar disimpan langsung di database. id-nya dipakai sebagai URL:
-- /api/images/<id>. Karena isi gambar tidak pernah berubah untuk satu id,
-- response-nya bisa di-cache selamanya (lihat api/images/[id]/route.ts).
CREATE TABLE IF NOT EXISTS images (
  id         BIGSERIAL PRIMARY KEY,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  bytes      BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Projects ──────────────────────────────────────────────────────────────
-- Deskripsi dan skills dipecah jadi tabel sendiri karena keduanya berurutan
-- (deskripsi = paragraf, skills = urutan tampil), dan urutan tidak boleh
-- bergantung pada urutan baris di tabel.
--
-- image_id ON DELETE SET NULL: kalau gambar dihapus, project tetap ada dengan
-- gambar kosong, bukan ikut terhapus.
CREATE TABLE IF NOT EXISTS projects (
  id         BIGSERIAL PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  client     TEXT NOT NULL DEFAULT '',
  image_id   BIGINT REFERENCES images(id) ON DELETE SET NULL,
  github_url TEXT NOT NULL DEFAULT '',
  live_url   TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_descriptions (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  body       TEXT NOT NULL,
  PRIMARY KEY (project_id, sort_order)
);

CREATE TABLE IF NOT EXISTS project_skills (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  name       TEXT NOT NULL,
  PRIMARY KEY (project_id, sort_order)
);

-- ── Sisa data ─────────────────────────────────────────────────────────────
-- profile, contact, education, skills, socials, experience, languages, __meta
-- disimpan sebagai satu dokumen JSONB. Bagian-bagian ini dibaca dan ditulis
-- selalu sebagai satu kesatuan dari admin editor, jadi memecahnya jadi tabel
-- sendiri tidak memberi keuntungan dan hanya menambah kode.
--
-- CHECK (id = 1): tabel ini memang hanya boleh punya satu baris.
CREATE TABLE IF NOT EXISTS profile_doc (
  id  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  doc JSONB NOT NULL
);
