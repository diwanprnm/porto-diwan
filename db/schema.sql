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

-- ── Terjemahan (Bahasa Indonesia) ─────────────────────────────────────────
-- Bahasa Indonesia disimpan sebagai kolom KEMBARAN di sebelah nilai Inggris,
-- bukan sebagai baris atau tabel terpisah. Alasannya:
--
--   1. `slug` UNIQUE. Kalau dua bahasa jadi dua baris, satu slug tidak bisa
--      dipakai dua kali — padahal URL /projects/<slug> memang harus sama di
--      kedua bahasa supaya link antar bahasa tidak mati.
--   2. Kolom yang netral bahasa (image_id, github_url, live_url, sort_order)
--      tidak jadi punya dua salinan yang bisa menyimpang.
--   3. Aditif. Nilai yang sudah ada tetap jadi versi Inggris, jadi tidak ada
--      migrasi data: database lama langsung valid, dan kolom `_id` yang kosong
--      berarti "belum diterjemahkan" — pembaca jatuh ke nilai Inggris.
--
-- DEFAULT '' penting: baris yang sudah ada terisi string kosong, yang oleh
-- pickLocalized dianggap belum diterjemahkan. Kalau NULL, setiap pembaca harus
-- menangani dua bentuk "kosong" sekaligus.
--
-- ALTER TABLE ... IF NOT EXISTS supaya file ini tetap aman dijalankan berkali-
-- kali seperti CREATE di atas (docker-entrypoint-initdb.d dan `npm run
-- db:migrate` sama-sama menjalankannya).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS name_id   TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS project_descriptions (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  body       TEXT NOT NULL,
  PRIMARY KEY (project_id, sort_order)
);

-- body_id menyimpan paragraf versi Indonesia untuk baris yang sama.
--
-- Konsekuensi bentuk ini, dan cara menanganinya: dua bahasa dengan jumlah
-- paragraf berbeda berbagi baris yang sama, jadi sisi yang lebih pendek diisi
-- string kosong. saveProfileData menyejajarkan keduanya ke
-- max(panjang_en, panjang_id), dan trimTrailingEmpty di getProfileDataRaw
-- membuang ekor kosong itu saat dibaca — sehingga paragraf bahasa Indonesia
-- yang lebih banyak daripada Inggris tidak terpotong saat disimpan.
ALTER TABLE project_descriptions ADD COLUMN IF NOT EXISTS body_id TEXT NOT NULL DEFAULT '';

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

-- ── Pengaturan situs ──────────────────────────────────────────────────────
-- Preferensi operator yang berlaku untuk SELURUH situs (bukan per bahasa, bukan
-- per halaman). Untuk sekarang isinya satu baris: 'default_locale'.
--
-- Kenapa di database dan bukan di env: nilai ini harus bisa diubah dari /admin
-- tanpa rebuild dan tanpa restart container. Env dibaca saat proses start, jadi
-- mengubahnya berarti deploy ulang — dan middleware berjalan di Edge runtime,
-- yang hanya menerima nilai env yang di-inline saat build. Baris di tabel ini
-- dibaca saat request, jadi perubahan langsung berlaku.
--
-- Kenapa tabel key/value dan bukan kolom di profile_doc: profile_doc adalah
-- isi CV, dan seluruhnya ditulis ulang setiap Save dari editor. Preferensi situs
-- yang ikut terhapus karena seseorang menyimpan CV adalah bug yang sangat sulit
-- dilacak. Tabel terpisah tidak bisa tersentuh jalur itu.
--
-- `value` sengaja TEXT tanpa CHECK: skema tidak perlu tahu kode bahasa yang sah.
-- Validasi ada di pembacanya (getDefaultLocale), dan memang harus ada di sana —
-- baris ini bisa diubah lewat psql, jadi pembaca tidak boleh mempercayainya.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
