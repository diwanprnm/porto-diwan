#!/usr/bin/env bash
#
# Dijalankan DI SERVER oleh pipeline (langkah appleboy/ssh-action di cicd.yml).
#
# Dipisah ke file sendiri, bukan ditulis inline di YAML, karena:
#   - inline butuh escaping berlapis (\" dan \$) yang sulit dibaca dan mudah salah
#   - file ini bisa dijalankan manual di server untuk mengetes tanpa pipeline
#
# Argumen:
#   $1  environment: staging | production
#       → menentukan file rahasia (.env.<env>) dan nama project compose
#   $2  referensi image lengkap. Dua bentuk yang sah:
#         diwanprnm/porto:<tree-hash>          → tag; dipakai staging
#         diwanprnm/porto@sha256:...           → digest; dipakai produksi
#   $3  (opsional) tree-hash untuk DICATAT di ledger setelah health check lulus.
#       Hanya diisi oleh deploy staging. Produksi tidak mencatat — ia membaca.
#       Lihat scripts/deploy-ledger.sh untuk alasan ledger ini ada.
set -euo pipefail

ENV_NAME="$1"
IMAGE="$2"
RECORD_TREE="${3:-}"

cd /var/www/my-app/porto

# `-p` (nama project) menentukan namespace container, network, DAN volume.
# Karena itu staging dan produksi tidak saling menyentuh walau satu server:
#   - container : porto-staging-portfolio-1  vs  porto-production-portfolio-1
#   - database  : volume porto-staging_pgdata vs porto-production_pgdata
#
# `container_name` sengaja tidak dipakai di compose file. Kalau dipakai, dua
# project akan berebut nama yang sama dan service migrasi sekali-pakai bentrok
# dengan container utama yang sedang jalan.
C="docker compose -f docker-compose.prod.yml -p porto-$ENV_NAME --env-file .env.$ENV_NAME"

# Buang image repo ini yang tidak dipakai container mana pun.
#
# "Tidak dipakai" dihitung dari SEMUA container di server (`docker ps -aq`),
# bukan hanya milik environment ini: image staging yang sedang jalan tidak boleh
# terhapus saat deploy produksi, dan sebaliknya.
#
# Nama repo diambil dari IMAGE yang diterima skrip — dua bentuk yang sah,
# `repo:tag` (staging) dan `repo@sha256:...` (produksi).
#
# Dijalankan hanya setelah health check lulus, dan kegagalannya tidak
# menggagalkan deploy: menyisakan beberapa megabyte jauh lebih baik daripada
# menandai deploy yang sebenarnya sukses sebagai gagal.
prune_images() {
  local repo used id removed=0
  if [[ "$IMAGE" == *"@"* ]]; then
    repo="${IMAGE%%@*}"
  else
    repo="${IMAGE%:*}"
  fi

  # Image ID yang sedang dirujuk container (hidup maupun berhenti). Container
  # berhenti tetap dihitung: ia bisa di-`start` lagi, dan image-nya harus ada.
  used="$(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' 2>/dev/null | sort -u || true)"

  while read -r id; do
    [ -n "$id" ] || continue
    if printf '%s\n' "$used" | grep -qxF "$id"; then
      continue
    fi
    # Tanpa `-f`: image yang masih dirujuk sesuatu tidak boleh dipaksa hilang.
    # Kalau `rmi` menolak (mis. image punya beberapa tag), ia dilewati saja —
    # biaya meninggalkannya kecil, sedangkan `-f` bisa mencabut image yang
    # sedang dipakai.
    if docker rmi "$id" >/dev/null 2>&1; then
      removed=$((removed + 1))
    fi
  # `--no-trunc` penting: ID pendek (sha256:9c1f0a) tidak akan pernah cocok
  # dengan `.Image` dari inspect, yang selalu ID penuh. Tanpa ini, SETIAP image
  # dianggap tidak terpakai — termasuk yang sedang jalan — dan `docker rmi`
  # hanya menolaknya, jadi hasilnya "0 dibuang" selamanya tanpa error.
  done < <(docker image ls --no-trunc "$repo" --format '{{.ID}}' 2>/dev/null | sort -u)

  # Lapisan tanpa tag dari build lama (dangling). Tidak dirujuk apa pun, jadi
  # aman; ini yang paling banyak menumpuk setelah beberapa kali rebuild.
  docker image prune -f >/dev/null 2>&1 || true

  echo "✓ Prune: $removed image lama dibuang ($repo)"
}

# Versi yang di-deploy dicatat di .env.<env> di server. Ini satu-satunya tempat
# versi disimpan, dan sengaja ditulis di sini — bukan di file yang dikirim
# pipeline — supaya rahasia tidak pernah melewati CI.
sed -i "s|^APP_IMAGE=.*|APP_IMAGE=$IMAGE|" ".env.$ENV_NAME"

echo "→ Deploy $IMAGE ke $ENV_NAME"

$C pull portfolio

# Migrasi SEBELUM app diganti, supaya skema sudah siap saat versi baru melayani
# request. Aman diulang: db/schema.sql memakai CREATE TABLE IF NOT EXISTS, dan
# seed dilewati kalau tabel sudah berisi data — jadi isi yang sudah diedit lewat
# /admin tidak tertimpa.
#
# `-T` supaya tidak ada TTY yang mengambil alih.
$C run --rm -T portfolio npm run db:migrate

$C up -d

# Port dibaca dari env file, bukan di-hardcode, supaya skrip yang sama bisa
# dipakai staging (3001) maupun produksi (3000).
PORT=$(sed -n 's/^APP_PORT=//p' ".env.$ENV_NAME")
if [ -z "$PORT" ]; then
  echo "GAGAL: APP_PORT tidak ada di .env.$ENV_NAME"
  exit 1
fi

# Tanpa pengecekan ini, deploy yang gagal akan terlihat hijau di Actions.
#
# Yang ditembak /en, BUKAN "/" — dan itu bukan detail. "/" hanya me-redirect
# (lihat src/middleware.ts), jadi curl ke sana berhenti sebelum satu baris data
# dibaca, dan deploy dengan database rusak akan lolos. Halaman berbahasa-lah yang
# benar-benar membaca database, jadi itu yang harus diuji.
#
# /en ditembak LANGSUNG, bukan lewat "/": ke mana "/" mengarah ditentukan baris
# `default_locale` di tabel settings, yang bisa diubah dari /admin. Kalau health
# check ini menembak "/", mengubah bahasa default jadi `id` akan membuat
# pemeriksaan yang sama menempuh jalur yang berbeda — dan, kalau redirect-nya
# bermasalah, gagal karena alasan yang tidak ada hubungannya dengan database.
#
# Alasannya sama dengan catatan di src/app/healthz/route.ts: /healthz sengaja
# tidak menyentuh database, jadi konektivitasnya diuji di sini.
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT/en" >/dev/null; then
    echo "✓ OK: app hidup di port $PORT ($i percobaan)"

    # Dicatat HANYA setelah app terbukti hidup. Inilah yang membuat ledger
    # berarti: produksi nanti membaca catatan ini, jadi ia hanya bisa
    # menjalankan artefak yang benar-benar sudah berjalan dan lulus health
    # check di staging — bukan sekadar artefak yang pernah di-push ke Docker
    # Hub lalu tidak pernah dijalankan.
    #
    # Kalau pencatatan gagal (mis. disk penuh), jangan tutupi kegagalannya:
    # deploy staging dianggap gagal, karena tanpa catatan ini produksi tidak
    # akan bisa memakai image-nya.
    if [ -n "$RECORD_TREE" ]; then
      bash "$(dirname "${BASH_SOURCE[0]}")/deploy-ledger.sh" record "$RECORD_TREE" "$IMAGE"
      echo "✓ Ledger: $RECORD_TREE → $IMAGE"
    fi

    # Image lama dibuang SETELAH deploy terbukti hidup dan paling akhir, supaya
    # deploy yang gagal masih meninggalkan versi sebelumnya di disk.
    #
    # Yang dihapus hanya image repo ini yang tidak dirujuk container mana pun.
    # Image yang sedang jalan tidak mungkin ikut terhapus — docker menolak, dan
    # pemeriksaan di bawah melewatinya lebih dulu. Image environment lain juga
    # aman: ia sedang dipakai container-nya, jadi ikut masuk daftar `keep`.
    #
    # Rollback tidak bergantung pada image lama di disk: ledger menyimpan
    # referensi by-digest, jadi versi sebelumnya tinggal di-pull lagi dari
    # Docker Hub. Yang dihemat di sini ruang disk, bukan kemampuan rollback.
    #
    # Kegagalan prune sengaja tidak menggagalkan deploy (`|| true`): app sudah
    # hidup, dan yang paling buruk hanyalah beberapa megabyte tertinggal.
    prune_images || true

    exit 0
  fi
  sleep 2
done

echo "✗ GAGAL: app tidak hidup di port $PORT setelah 60 detik"
$C logs --tail=30 portfolio
exit 1
