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

## CI/CD

Pipeline ada di `.github/workflows/cicd.yml`:

```
push ke develop        → tidak ada action apa pun
PR ke staging / main   → verify (lint+typecheck) + test + dependency review
merge ke staging       → verify → test → build → smoke → sbom → deploy staging
merge ke main          → verify → test → preflight (cek ledger) → ⏸ approve → deploy produksi
```

### Tahap pipeline, dan apa yang masing-masing buktikan

Ini bagian yang paling mudah disalahpahami, jadi ditulis eksplisit. Tiap tahap
menjawab pertanyaan yang **berbeda**, dan yang lebih mahal tidak bisa menggantikan
yang lebih murah:

| Job | Pertanyaan yang dijawab | Kalau dilewati |
|---|---|---|
| `verify` | Kodenya konsisten dan tipenya benar? | — |
| `test` | **Perilakunya** benar? | bug logika lolos; lint & tsc tetap hijau |
| `build` | Image berhasil dibangun? | — |
| `smoke` | Image **bisa dijalankan** dan melayani HTTP? | kegagalan start baru ketahuan setelah deploy |
| `deploy-staging` | Jalan di server sungguhan, dengan database sungguhan? | — |
| `preflight-production` | Isi commit ini sudah pernah lulus di staging? | kode yang belum diuji bisa sampai produksi |

Dua baris yang paling sering dikira sama:

- **`verify` ≠ `test`.** Lint dan `tsc` menjawab "kodenya rapi dan tipenya
  cocok". Keduanya tidak menjawab "perilakunya benar". Contoh nyata ada di
  `tests/pure.test.mjs`: `projectSlug("A - - - B")` harus `"a-b"`; kalau hasilnya
  `"a---b"`, tipe tetap `string`, lint tetap bersih, dan URL project-nya diam-diam
  rusak. Tidak ada pemeriksaan statis yang bisa menangkap itu.
- **`build` ≠ `smoke`.** `docker build` hijau artinya Dockerfile-nya selesai —
  bukan bahwa `npm start` di dalamnya berhasil. Modul native (`pg` punya binding
  per-platform), file yang lupa disalin ke stage runner, atau env yang kurang
  semuanya lolos build dan baru muncul saat dijalankan.

Urutannya sengaja dari yang paling murah: yang gagal di `verify` (hitungan detik)
tidak perlu membayar build image (hitungan menit).

### Smoke test

Job `smoke` menjalankan image yang baru dibangun — dengan referensi **by-digest**,
bukan tag — lalu menembak `/healthz` sampai 30 kali (jeda 2 detik). Kalau
container-nya mati, log-nya ikut dicetak supaya penyebabnya langsung terbaca.

`/healthz` (`src/app/healthz/route.ts`) **sengaja tidak menyentuh database**. Itu
keputusan sadar: yang diuji di sini adalah "image ini bisa dijalankan", bukan
"databasenya hidup". Kalau route itu ikut query database, smoke test di runner CI
akan gagal hanya karena tidak ada Postgres di sana — padahal image-nya sehat.
Akibatnya orang akan melemahkan pemeriksaannya supaya hijau, dan gerbang yang
dilemahkan supaya hijau sama saja dengan tidak ada gerbang.

Konektivitas database diuji di tempat yang memang punya database: health check di
`scripts/deploy-remote.sh` menembak `/` setelah deploy, dan `/` membaca database
sungguhan.

### Test

```bash
npm test        # node --test tests/
```

Runner-nya `node --test` bawaan Node 22 — **tidak ada framework test yang
dipasang**. Itu disengaja: menambah dependensi berarti `package-lock.json` ikut
berubah, dan `npm ci` menolak jalan kalau lockfile tidak sinkron dengan
`package.json`. Untuk menguji empat fungsi murni, itu biaya yang tidak perlu.

Fungsi murninya ada di `src/lib/pure.mjs` (bukan `.ts`) supaya runner bawaan Node
bisa menjalankannya tanpa toolchain. `src/lib/data.ts` mengimpor dan
meneruskannya, jadi pemanggil lama tidak perlu berubah.

**Yang diuji adalah titik batas, bukan kasus yang jelas benar.** Alasannya ada di
`00-KONSEP.md` study case: kalau menguji manual, orang mencoba belanja 50 dan 150
— tidak pernah tepat 100. Test di sini menguji nama dengan em-dash, nama yang
seluruhnya tanda baca, dan dua project yang slug-nya bertabrakan. Yang terakhir itu
menangkap bug yang tidak muncul sebagai error di mana pun: `slug` adalah kunci
`ON CONFLICT (slug)`, jadi dua project dengan slug sama akan saling menimpa
diam-diam.

### Model branch

Tiga branch, dan masing-masing punya peran:

| Branch | Peran |
|---|---|
| `develop` | tempat kerja sehari-hari. Push ke sini **tidak** menjalankan apa pun. |
| `staging` | gerbang uji. Merge ke sini membangun image dan menjalankannya di staging. |
| `main` | produksi. Merge ke sini men-deploy, setelah kamu klik Approve. |

Alurnya:

```
develop ──PR+merge──> staging ──PR+merge──> main
                         │                    │
                    build + deploy       deploy (approve)
```

**Aturan yang harus dipegang:** perubahan harus lewat `staging` dulu sebelum
`main`. Kalau tidak, isi commit di `main` belum pernah dibuild, dan job
`preflight-production` akan gagal. Itu memang disengaja — lihat bagian di bawah.

Push ke branch lain (mis. `feature/*`) juga tidak menjalankan apa pun.

### Daftar job

| Job | Jalan saat | Yang dikerjakan |
|---|---|---|
| `verify` | push/PR ke `staging` atau `main` | lint → typecheck |
| `test` | setelah `verify` | `node --test` — uji perilaku fungsi murni (tanpa dependensi baru) |
| `dependency-review` | PR saja | tolak PR yang menambah dependensi berkerentanan atau berlisensi tidak diizinkan |
| `build` | push ke `staging`, setelah `test` | build image → push ke Docker Hub (tag tree hash) → terbitkan digest |
| `smoke` | setelah `build` | jalankan image → tembak `/healthz` sampai 60 detik → cetak log kalau gagal |
| `sbom` | setelah `build` dan `smoke` | daftar seluruh paket di dalam image, disimpan sebagai artifact 90 hari |
| `deploy-staging` | setelah `build`, `smoke`, dan `sbom` | SSH ke server → pull by digest → migrasi → `up -d` → health check → catat ke ledger |
| `preflight-production` | push ke `main`, setelah `verify` + `test` | pastikan ledger punya entri untuk isi commit ini |
| `deploy-production` | setelah `preflight-production` | baca ledger → SSH ke server → pull by digest → migrasi → `up -d`, berhenti menunggu approve dulu |

PR ke `staging` atau `main` hanya menjalankan `verify` + `test` + `dependency-review`,
jadi pipeline ini dipakai sebagai gerbang sebelum merge: buat PR, biarkan hijau,
baru merge. Tidak ada job yang men-deploy pada PR — jadi PR dari fork (yang tidak
punya akses ke secret) tetap aman dicek.

Kalau `verify` gagal, job setelahnya tidak dijalankan sama sekali — bukan karena
ada pengecekan khusus, tapi karena `needs`. Dan `npm run build` tidak dijalankan
di `verify`: build sebenarnya terjadi di dalam image, jadi tidak ada gunanya
membangun dua kali.

### Produksi menjalankan image yang sama dengan staging

Ini poin utama rancangannya, dan alasannya seluruh pipeline berbentuk begini.

Image dibangun **sekali saja**, di `staging`. Produksi tidak punya job build sama
sekali — ia hanya menarik image yang sudah ada. Kalau produksi build ulang, hasil
uji staging tidak lagi berlaku untuk apa yang benar-benar jalan di produksi, dan
seluruh tahap staging jadi formalitas.

Ada dua masalah yang harus diselesaikan supaya jaminan itu benar-benar tegak.

**Masalah 1: bagaimana produksi tahu image mana yang harus ditarik?**

Bukan dari SHA commit. Merge ke `main` menghasilkan commit **baru** dengan SHA
berbeda walaupun isinya sama persis dengan commit di `staging`. Kalau tag-nya
memakai SHA commit, produksi tidak akan pernah menemukan image-nya.

Yang dipakai adalah **git tree hash** — `git rev-parse HEAD^{tree}`:

```
diwanprnm/porto:3f2a91c84b7e9d2f...    ← 40 karakter, hash isi pohon file
```

Tree hash hanya bergantung pada **isi**, jadi dua commit dengan isi sama
menghasilkan tree hash yang sama — di branch mana pun, dengan strategi merge apa
pun (merge commit, squash, rebase). Itulah yang membuat pencocokan antara
"yang diuji di staging" dan "yang di-deploy ke produksi" bisa dilakukan.

Logikanya ada di satu tempat, `scripts/image-tag.sh`.

**Masalah 2: tag bisa bergerak, jadi "tag-nya ada" belum cukup.**

Tag tree hash bisa di-push ulang untuk isi yang sama — misalnya kamu klik
**Re-run all jobs** pada run staging. Tag-nya sama, tapi byte-nya belum tentu
identik: `docker/build-push-action` menyertakan attestation provenance yang
memuat waktu build. Jadi tag yang sama bisa menunjuk manifest yang berbeda.

Artinya membuktikan "tag ada di Docker Hub" **tidak** membuktikan produksi akan
menjalankan byte yang sama dengan yang diuji di staging. Ini celah yang nyata,
bukan teoretis.

Yang menutupnya adalah **digest** — `repo@sha256:...`. Digest selalu menunjuk byte
yang sama, dan registry sendiri yang menolak kalau tidak cocok. Jadi:

| | Perannya |
|---|---|
| **tree hash** | *nama* tag — mencocokkan isi commit melewati merge |
| **digest** | *pin* byte — memastikan byte yang dijalankan benar-benar sama |

Digest baru diketahui **setelah** image di-push (registry yang menghitungnya), jadi
ia ditangkap di job `build` dan diteruskan lewat `outputs.pinned`.

**Yang menjembatani keduanya: ledger di server.**

Karena build terjadi di run `staging` dan deploy produksi terjadi di run `main`
yang terpisah, digest harus disimpan di suatu tempat. Tempatnya adalah ledger —
`scripts/deploy-ledger.sh`, file `~/porto/.deploy-map` di server:

```
3f2a91c84b7e... diwanprnm/porto@sha256:9c1f0a...
```

Isinya pemetaan tree hash → referensi by-digest, satu baris per entri.

Yang membuat ledger ini lebih dari sekadar catatan: **entri ditulis hanya setelah
health check di staging lulus.** Jadi produksi tidak bisa menjalankan artefak yang
sekadar pernah di-push — ia hanya bisa menjalankan artefak yang benar-benar sudah
berjalan dan terbukti hidup di staging.

### Gerbang: commit harus lewat staging dulu

Konsekuensinya adalah gerbang yang nyata, bukan sekadar konvensi.

Kalau ada commit yang sampai ke `main` tanpa pernah lewat `staging` — kamu push
langsung, atau merge sesuatu yang belum pernah dibuild — tidak ada entri di
ledger untuk tree hash-nya. Job `preflight-production` akan **gagal** dengan pesan
yang menjelaskan langkah perbaikannya, dan `deploy-production` tidak akan jalan.

Ini disengaja: lebih baik menolak deploy daripada diam-diam menjalankan kode yang
belum diuji. Perbaikannya: merge perubahan yang sama ke `staging` dulu, tunggu
job `Deploy staging` hijau, baru merge ke `main`.

### Ringkasan alur artefak

```
test (staging)
  └─ node --test tests/          ← perilaku, tanpa database, tanpa framework

build (staging)
  ├─ tag     : diwanprnm/porto:<tree-hash>      ← dari scripts/image-tag.sh
  └─ pinned  : diwanprnm/porto@sha256:...       ← digest, dari output build

smoke (runner CI)
  ├─ docker run PINNED → tembak /healthz
  └─ gagal = deploy tidak dilanjutkan, log container dicetak

deploy staging
  ├─ pull & jalankan PINNED (by digest)
  └─ health check lulus → catat ke ledger: <tree-hash> → <pinned>

preflight (main)
  └─ ledger punya entri untuk <tree-hash>?  → tidak = MERAH, berhenti

deploy produksi  (setelah approve)
  ├─ lookup ledger → dapat referensi pinned
  ├─ pull & jalankan PINNED yang sama persis
  └─ health check
```

`preflight-production` sengaja **tidak** memakai `environment: production`, jadi
gerbang approve baru muncul setelah image-nya dipastikan ada — kamu tidak pernah
diminta meng-approve deploy yang sudah pasti gagal.

### Secrets yang dibutuhkan

Tambahkan di **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Isi | Cara mengambil |
|---|---|---|
| `DOCKERHUB_USERNAME` | username Docker Hub | — |
| `DOCKERHUB_TOKEN` | access token Docker Hub | Docker Hub → Account settings → Security → New Access Token. **Jangan** pakai password akun. |
| `VPS_SSH_HOST` | IP atau domain server | — |
| `VPS_SSH_USER` | user SSH di server | — |
| `VPS_SSH_KEY` | private key untuk deploy | `ssh-keygen -t ed25519 -C deploy -f deploy_key`, lalu isi seluruh file `deploy_key` (termasuk baris `BEGIN`/`END`) |

Public key dari `deploy_key.pub` ditaruh di `~/.ssh/authorized_keys` server.

Verifikasi host ditangani `appleboy/ssh-action`. Secara default action-nya
menerima kunci host apa pun — cukup untuk server yang alamatnya kamu kendalikan,
tapi tidak menutup serangan man-in-the-middle. Kalau mau dikunci ke satu
fingerprint, isi input `fingerprint` di cicd.yml; cara mengambil nilainya ada di
README appleboy/ssh-action. Ini opsional.

`appleboy/ssh-action` menerima kunci privat apa adanya lewat secret, jadi tidak
ada file kunci yang ditulis di runner dan tidak ada `ssh-keyscan` yang perlu
dijalankan di CI.

### Gerbang approve produksi

Ada **satu langkah manual**, yaitu klik *Approve* sebelum produksi. Gerbangnya
dari GitHub Environment bernama `production`, bukan dari `if:` di YAML — jadi
tidak bisa dilewati dengan mengubah file.

Setel sekali di **Settings → Environments → New environment**, nama `production`,
lalu centang **Required reviewers** dan isi dirimu sendiri. Tanpa langkah ini
environment-nya tidak punya reviewer, dan `deploy-production` akan jalan langsung
tanpa approval — jadi ini bukan opsional.

Yang tercatat di audit log GitHub: siapa yang approve, kapan, dan SHA berapa.

### Environment `staging`

`deploy-staging` menyebut `environment: staging`, jadi GitHub akan **membuatnya
otomatis** saat workflow pertama kali jalan. Tidak ada yang perlu kamu setel.

Yang perlu dipastikan: environment `staging` **tidak** punya **Required
reviewers**. Kalau kamu menambahkannya di sana, deploy staging akan ikut menunggu
approve — dan seluruh gunanya staging sebagai uji otomatis jadi hilang.

Environment ini hanya dipakai supaya riwayat deploy staging terlihat di halaman
Deployments, terpisah dari produksi.

### Concurrency

`concurrency` di level workflow memakai group per branch, jadi staging dan
produksi tidak saling membatalkan. Bedanya:

- **staging** — `cancel-in-progress: true`. Push berturut-turut cukup menjalankan
  yang terakhir.
- **main** — `cancel-in-progress: false`. Dua merge beruntun ke `main` tidak
  boleh membatalkan run pertama, karena run itu mungkin sedang di tengah deploy
  produksi atau sedang menunggu approve.

Ini tidak bisa ditambal dengan `concurrency` di level job `deploy-production`:
begitu run-nya dibatalkan, seluruh job di dalamnya ikut hilang. Karena itu
perbaikannya harus di level workflow.

### Setup server (sekali saja)

Butuh Docker + plugin compose. Lalu:

**1. Login Docker Hub sekali.** Pipeline hanya `docker pull`, dan sesi login
tersimpan di `~/.docker/config.json` — jadi tidak ada kredensial yang perlu
dikirim lewat SSH:

```bash
docker login -u <DOCKERHUB_USERNAME>
```

**2. Siapkan direktori dan dua env file.** Satu untuk staging, satu untuk
produksi. Isinya sama kecuali `APP_PORT` dan `POSTGRES_PASSWORD`:

```bash
mkdir -p ~/porto && cd ~/porto

for env in staging production; do
  cat > ".env.$env" <<'EOF'
POSTGRES_PASSWORD=<password-panjang-random>
ADMIN_SECRET=<string-random-panjang>
ADMIN_PASSWORD_HASH=<hash bcrypt dari perintah di bagian Environment>
APP_IMAGE=<DOCKERHUB_USERNAME>/porto:placeholder
EOF
  chmod 600 ".env.$env"
done

echo 'APP_PORT=3001' >> .env.staging
echo 'APP_PORT=3000' >> .env.production
```

`APP_IMAGE` diisi `placeholder` saja — skrip deploy menimpanya sendiri setiap
kali jalan: staging dengan tag tree hash, produksi dengan referensi by-digest dari
ledger. `POSTGRES_PASSWORD` sebaiknya **berbeda** untuk kedua environment: kalau
sama, satu dump database staging bisa dibaca oleh produksi, dan tidak ada gunanya
memisahkan keduanya.

File `.env.staging` dan `.env.production` **tidak** dikirim oleh pipeline (kalau
dikirim, rahasianya akan melewati CI) dan tidak boleh di-commit. Yang dikirim
hanya `docker-compose.prod.yml`, `scripts/deploy-remote.sh`, dan
`scripts/deploy-ledger.sh` — otomatis.

**3. Pastikan port-nya tidak terbentur.** `docker-compose.prod.yml` hanya
memublikasikan port aplikasi. Dua environment memakai port host berbeda
(3000/3001), jadi tidak bentrok. Kalau ada reverse proxy di depannya, arahkan
domain staging dan produksi ke port masing-masing.

Selesai. Setelah ini setiap merge ke `staging` membangun dan men-deploy ke
staging, lalu merge ke `main` men-deploy ke produksi setelah kamu approve.

**Catatan tentang ledger.** File `~/porto/.deploy-map` tidak perlu kamu buat —
`deploy-ledger.sh` yang membuatnya sendiri saat deploy staging pertama yang lulus
health check. Sebelum itu ia tidak ada, dan `preflight-production` akan gagal
dengan pesan yang menjelaskan. Jadi urutan pertama kali harus:

```
1. merge ke staging   → build + deploy + health check lulus → ledger dibuat
2. merge ke main      → preflight menemukan entri → approve → produksi
```

Kalau kamu merge ke `main` lebih dulu, itu memang akan gagal — dan itu perilaku
yang benar.

### Rollback

Karena image bertag tree hash, rollback **tidak perlu build ulang** — image versi
lama masih ada di Docker Hub dengan tag yang tidak pernah berubah. Jalankan di
server:

```bash
cd ~/porto

# Lihat isi ledger — setiap baris: <tree-hash> <referensi-pinned>
cat .deploy-map

# Ambil referensi pinned untuk versi yang mau dijalankan lagi
IMAGE="$(bash scripts/deploy-ledger.sh lookup <tree-hash>)"
echo "Rollback ke: $IMAGE"

sed -i "s|^APP_IMAGE=.*|APP_IMAGE=$IMAGE|" .env.production

docker compose -f docker-compose.prod.yml -p porto-production \
  --env-file .env.production pull portfolio

docker compose -f docker-compose.prod.yml -p porto-production \
  --env-file .env.production up -d
```

Instan, karena image-nya tinggal di-pull. Perhatikan bahwa ledger menyimpan
referensi **by-digest**, jadi rollback menarik byte yang persis — bukan tag yang
mungkin sudah bergerak sejak terakhir di-deploy.

Cara lain adalah `git revert` lalu merge ke `main` — tapi itu **membangun image
baru** dari kode lama (dan tetap harus lewat `staging` dulu), jadi tidak instan
dan kurang tepat untuk keadaan darurat.

Perhatikan `-p porto-production` di perintah atas. Tanpa itu, compose memakai nama
project dari nama direktori, dan perintahmu bisa menyentuh container environment
yang salah.

Rollback mengembalikan **kode**, bukan **skema database**. Migrasi bersifat maju
saja — `db/schema.sql` memakai `CREATE TABLE IF NOT EXISTS` dan tidak pernah
menghapus kolom, jadi kode lama tetap jalan di atas skema baru. Tapi kalau suatu
saat ada migrasi yang menghapus atau mengubah kolom, itu tidak bisa dibalik, dan
menjalankan `deploy-remote.sh` tetap akan menerapkannya (idempoten, jadi tidak
merusak apa pun).

Kalau ledger ikut di-rollback — misalnya kamu ingin produksi melupakan entri
tertentu — edit saja `~/porto/.deploy-map` dan hapus barisnya. Formatnya sengaja
satu baris per entri supaya bisa dibaca dan disunting manusia tanpa perkakas.

### Catatan

- Staging dan produksi berbagi satu server tapi **tidak** berbagi database.
  Yang memisahkannya adalah `-p porto-<env>` saat menjalankan compose: nama
  project menentukan namespace container, network, dan volume. Jadi
  `porto-staging_pgdata` dan `porto-production_pgdata` adalah dua volume
  berbeda.
- Karena itu, **isi staging adalah salinan database yang kosong**, bukan copy
  produksi. Migrasi + seed jalan di sana seperti di database baru. Kalau perlu
  menguji perubahan terhadap data produksi yang asli, dump dulu ke staging —
  jangan arahkan staging ke volume produksi.
- `container_name` sengaja tidak dipakai di `docker-compose.prod.yml`. Kalau
  dipakai, dua environment akan berebut nama yang sama, dan service migrasi
  sekali-pakai (`docker compose run`) bentrok dengan container utama yang sedang
  jalan.
- Port database sengaja tidak dipublikasikan di `docker-compose.prod.yml`.
  Kalau perlu akses dari luar, pakai SSH tunnel — jangan buka `5432` ke publik.
- Migrasi berjalan otomatis tiap deploy, dan **aman diulang**: seed dilewati
  kalau tabel sudah berisi data, jadi isi yang sudah diedit lewat `/admin` tidak
  tertimpa.

## Struktur

```
.github/workflows/cicd.yml Pipeline: develop → staging (test+build+smoke+deploy) → main (deploy)
                           Deploy-nya memakai appleboy/scp-action + appleboy/ssh-action
tests/pure.test.mjs        Test perilaku fungsi murni, dijalankan `node --test`
src/lib/pure.mjs           Fungsi murni (slug, deskripsi, skill, gambar) — satu-satunya
                           salinan; diimpor data.ts dan scripts/db.mjs
src/app/healthz/route.ts   GET /healthz — smoke test; sengaja tidak menyentuh database
scripts/image-tag.sh       Isi commit → nama tag (git tree hash). Dipakai job build
scripts/deploy-ledger.sh   Ledger artefak di server (~/porto/.deploy-map):
                           tree hash → referensi by-digest, ditulis setelah health
                           check staging lulus. Dibaca preflight & deploy produksi
scripts/deploy-remote.sh   Dijalankan DI SERVER oleh ssh-action (pull → migrasi → up -d)
docker-compose.prod.yml    Compose untuk server; satu file, dibedakan oleh -p dan --env-file
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
