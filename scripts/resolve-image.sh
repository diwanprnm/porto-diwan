#!/usr/bin/env bash
#
# Mencetak referensi image PINNED (repo@sha256:...) untuk commit yang sedang
# di-checkout — dan bisa dihitung ULANG, bukan hanya dibaca dari output job.
#
# Kenapa ini ada:
#
#   Job `build` menerbitkan `pinned` lewat `jobs.<id>.outputs`, dan itu cukup
#   selama SELURUH workflow dijalankan dalam satu graf. Tapi "Re-run failed
#   jobs" di GitHub TIDAK menjalankan ulang job yang menjadi `needs`-nya — jadi
#   job yang di-run sendirian melihat `needs.build.outputs.pinned` sebagai
#   string KOSONG, lalu gagal dengan "referensi image tidak sah: ''" padahal
#   image-nya ada di registry.
#
#   Output job memang tidak pernah bertahan melewati re-run sebagian: ia hanya
#   hidup di dalam satu eksekusi graf. Jadi yang dipakai di sini bukan output
#   itu, melainkan dua hal yang bisa dihitung ulang kapan saja:
#
#     tag    → git tree hash isi commit   (deterministik; scripts/image-tag.sh)
#     digest → dibaca dari registry        (registry yang menghitungnya)
#
#   Hasilnya identik dengan yang diterbitkan job `build`, tapi tidak lagi
#   bergantung pada job itu baru saja jalan.
#
# Perintah:
#   resolve-image.sh        cetak referensi pinned: repo@sha256:...
#   resolve-image.sh tag    cetak tree hash saja
#
# Env:
#   PINNED               referensi dari job build, kalau ada. Dipakai apa
#                        adanya (setelah divalidasi) supaya jalur normal tetap
#                        memakai nilai yang sudah dihitung build.
#   DOCKERHUB_USERNAME   diteruskan ke scripts/image-tag.sh.
set -euo pipefail

# Dihitung dari lokasi skrip, bukan dari direktori kerja: scripts/image-tag.sh
# menjalankan `git rev-parse`, jadi ia butuh cwd di dalam repo.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE="${1:-ref}"

IMAGE="$(bash scripts/image-tag.sh)"
TAG="${IMAGE##*:}"

if [ "$MODE" = "tag" ]; then
  printf '%s\n' "$TAG"
  exit 0
fi

# Jalur normal: job `build` sudah menghitung referensinya, jadi dipakai apa
# adanya — tidak ada panggilan registry yang tidak perlu.
PINNED="${PINNED:-}"
if [ -n "$PINNED" ]; then
  case "$PINNED" in
    *@sha256:*)
      printf '%s\n' "$PINNED"
      exit 0
      ;;
    *)
      echo "✗ GAGAL: 'pinned' dari job build cacat: '$PINNED'" >&2
      echo "Nilainya tidak memuat '@sha256:'. Artinya langkah 'id: pin' di job" >&2
      echo "build menghasilkan referensi yang cacat." >&2
      exit 1
      ;;
  esac
fi

# Jalur re-run sendirian: output job build tidak tersedia. Tag-nya tetap bisa
# dihitung (deterministik dari isi commit), dan digest-nya ditanyakan langsung
# ke registry — registry-lah yang menghitungnya, jadi ini nilai yang sama
# dengan yang diterbitkan build.
#
# `docker buildx imagetools inspect` dipakai karena ia membaca manifest dari
# registry TANPA menarik image-nya: satu permintaan kecil, bukan pull penuh.
# Tool ini ada di runner GitHub (dan `docker/setup-buildx-action` sudah dipakai
# di job build), jadi tidak ada langkah pemasangan yang perlu ditambah.
#
# Digest diambil dari output TEKSNYA, bukan lewat `--format '{{...}}'`: nama
# field di dalam template bisa berbeda antar versi buildx dan berubah tanpa
# pemberitahuan, dan itu jadi kegagalan yang membingungkan di sini. Baris
# "Digest:" yang PERTAMA adalah digest index-nya — nilai yang sama dengan output
# `digest` dari build-push-action, karena action itu juga menerbitkan digest
# index (image + attestation provenance).
#
# stderr disertakan saat gagal: kalau buildx-nya yang tidak ada, pesan "image
# tidak ada di registry" akan menyesatkan — orang lalu mencari image yang
# sebenarnya ada.
if ! INSPECT="$(docker buildx imagetools inspect "$IMAGE" 2>&1)"; then
  echo "✗ GAGAL: tidak bisa membaca '$IMAGE' dari registry." >&2
  echo >&2
  echo "Pesan aslinya:" >&2
  printf '%s\n' "$INSPECT" | sed 's/^/  /' >&2
  echo >&2
  echo "Kalau pesannya menyebut image tidak ditemukan: tag itu berasal dari git" >&2
  echo "tree hash isi commit, jadi artinya isi commit ini belum pernah di-build &" >&2
  echo "di-push oleh job 'build'. Merge ke staging dulu supaya image-nya ada." >&2
  exit 1
fi

DIGEST="$(printf '%s\n' "$INSPECT" | awk '/^Digest:/ { print $2; exit }')"

if [ -z "$DIGEST" ]; then
  echo "✗ GAGAL: output inspect tidak memuat baris 'Digest:' untuk '$IMAGE'." >&2
  printf '%s\n' "$INSPECT" | sed 's/^/  /' >&2
  exit 1
fi

printf '%s\n' "${IMAGE%:*}@${DIGEST}"
