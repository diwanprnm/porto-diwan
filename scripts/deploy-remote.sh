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
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT" >/dev/null; then
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

    exit 0
  fi
  sleep 2
done

echo "✗ GAGAL: app tidak hidup di port $PORT setelah 60 detik"
$C logs --tail=30 portfolio
exit 1
