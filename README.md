# Porto — CV / Portofolio Dinamis

Situs CV pribadi dengan panel admin. Seluruh isi (profil, skill, experience,
project) disimpan di **PostgreSQL**, dan gambar (foto profil, ikon socials,
screenshot project) disimpan sebagai **BLOB di dalam database** — bukan file di
disk. Jadi backup cukup satu dump database.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- PostgreSQL 17, driver `pg`
- Auth admin: cookie JWT (`jose`) + bcrypt

## Menjalankan

### Lewat Docker (disarankan)

```bash
# 1. Nyalakan database
docker compose up -d db

# 2. Buat skema + isi data awal dari content/profile.json
docker compose run --rm portfolio npm run db:migrate

# 3. Jalankan aplikasi
docker compose up --build
```

Buka http://localhost:3000, panel admin di http://localhost:3000/admin
(password default `admin123` — **ganti sebelum dipakai di server publik**, lihat
bagian Environment di bawah).

### Lokal tanpa Docker

Butuh PostgreSQL yang jalan. Salin `.env.example` jadi `.env` dan sesuaikan
`DATABASE_URL`, lalu:

```bash
npm install
npm run db:migrate
npm run dev
```

## Database

Empat tabel (`db/schema.sql`):

| Tabel | Isi |
|---|---|
| `images` | Gambar sebagai BLOB (`bytes`) + `mime` + `filename` |
| `projects` | Satu baris per project; `image_id` menunjuk ke `images` |
| `project_descriptions` | Paragraf deskripsi, berurutan (`sort_order`) |
| `project_skills` | Tech stack per project, berurutan |
| `profile_doc` | Sisanya (profil, contact, education, skills, socials, experience, languages) sebagai satu dokumen JSONB |

`projects` dan `images` dipisah jadi tabel sendiri. Sisanya sengaja disimpan
sebagai satu dokumen JSONB karena selalu dibaca dan ditulis sebagai satu
kesatuan dari admin — memecahnya jadi tabel per entity tidak memberi keuntungan
dan hanya menambah kode.

### Mengubah skema

Edit `db/schema.sql`, lalu jalankan `npm run db:migrate` lagi. File itu memakai
`CREATE TABLE IF NOT EXISTS`, jadi aman dijalankan berkali-kali. Perhatikan:
`docker compose` juga menjalankan file itu otomatis, tapi **hanya saat volume
`pgdata` masih kosong** (pertama kali dibuat). Kalau volume sudah ada, jalankan
`db:migrate` secara manual.

### Kalau mengganti nama project

URL halaman detail (`/projects/[slug]`) dihitung dari nama project, bukan
disimpan terpisah. Mengganti nama berarti slug-nya berubah, baris lama terhapus,
dan **link lama ke project itu jadi 404**. Kalau perlu URL yang stabil, tambahkan
kolom `slug` yang diisi manual.

## Gambar

- Upload lewat `/admin` → tombol "Pilih gambar". File dikirim ke `POST /api/upload`
  dan disimpan sebagai BLOB.
- Disajikan oleh `GET /api/images/[id]` dengan `Cache-Control: immutable`, karena
  isi sebuah gambar tidak pernah berubah selama id-nya sama.
- Batas ukuran 5 MB. Format: PNG, JPEG, WebP, GIF, SVG.
- Gambar **tidak** di-resize saat upload. Kalau perlu, kompres dulu sebelum upload.

Gambar yang tidak lagi dirujuk siapa pun dihapus otomatis saat menyimpan dari
admin (masa tenggang 1 jam, supaya gambar yang baru di-upload tapi belum
di-Save tidak ikut terhapus).

## Environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Contoh: `postgres://porto:porto@localhost:5432/porto` |
| `ADMIN_SECRET` | ya (produksi) | Kunci penanda tangan JWT. Kalau dibiarkan default, siapa pun yang tahu nilai default-nya bisa membuat cookie admin sendiri. |
| `ADMIN_PASSWORD_HASH` | tidak | Hash bcrypt password admin. Kalau kosong, login memakai `admin123`. |

Membuat hash password:

```bash
node -e "console.log(require('bcryptjs').hashSync('passwordAnda', 10))"
```

## Struktur

```
db/schema.sql              Skema database
scripts/db.mjs             Migrasi + seed (dari content/profile.json)
src/lib/db.ts              Pool koneksi Postgres
src/lib/data.ts            Baca/tulis data CV (getProfileData, saveProfileData)
src/lib/auth.ts            JWT + bcrypt
src/app/api/upload         POST  — upload gambar
src/app/api/images/[id]    GET   — sajikan gambar dari database
src/app/api/profile        GET   — data untuk admin editor
src/app/api/profile/update PUT   — simpan perubahan
src/app/api/auth/login     POST  — login admin
src/app/admin              Panel admin
content/profile.json       Data awal (sumber seed; tidak dibaca saat runtime)
```

`content/profile.json` hanya dipakai **sekali** oleh seed untuk mengisi database
yang masih kosong. Setelah itu sumber kebenarannya adalah database. File itu
dibiarkan di repo sebagai cadangan data awal, dan `public/image/` dibiarkan
sebagai cadangan gambar asli.

## Catatan teknis

- Halaman publik memakai `dynamic = "force-dynamic"`, bukan ISR. Alasannya build
  di Docker tidak punya akses ke service `db`, jadi halaman yang di-prerender saat
  build akan gagal. Konsekuensinya setiap request menyentuh Postgres — tidak
  terasa untuk portofolio sekecil ini.
- `<Image>` dipasang `unoptimized` karena sumbernya route dinamis yang sudah
  immutable. Efeknya Next tidak lagi meng-resize / convert ke WebP otomatis.
- `output: "standalone"` di `next.config.ts` belum dipakai oleh `dockerfile`
  (yang disalin `.next`, bukan `.next/standalone`).
