#!/usr/bin/env bash
#
# Ledger artefak: catatan image mana yang sudah di-deploy DAN lulus health check
# di staging.
#
# Dijalankan DI SERVER. File ledger ada di <root repo>/.deploy-map, satu baris
# per entri:
#
#   <tree-hash> <referensi-image-pinned>
#   3f2a91c84b7e... diwanprnm/porto@sha256:9c1f0a...
#
# Kenapa file ini ada:
#
#   Image ditandai dengan git TREE hash (lihat scripts/image-tag.sh), dan tag
#   bisa bergerak: kalau job `build` dijalankan ulang — mis. kamu klik "Re-run
#   all jobs" — tag yang sama di-push lagi, dan byte-nya belum tentu identik
#   (build-push-action menyertakan attestation provenance yang memuat waktu
#   build). Jadi "tag-nya ada di Docker Hub" TIDAK cukup untuk membuktikan
#   produksi akan menjalankan byte yang sama dengan yang diuji di staging.
#
#   Digest menutup celah itu: `repo@sha256:...` selalu byte yang sama, dan
#   registry sendiri yang menolak kalau tidak cocok.
#
# Yang membuat ledger ini lebih dari sekadar pemetaan: entri ditulis SETELAH
# health check di staging lulus. Jadi produksi hanya bisa menjalankan artefak
# yang benar-benar sudah berjalan dan terbukti hidup di staging — bukan sekadar
# artefak yang pernah di-push.
#
# Referensi LENGKAP yang disimpan, bukan digest saja, supaya nama repo tidak
# perlu ditulis ulang di YAML workflow — nilainya sudah ada di referensi image
# yang diterima skrip deploy.
#
# Perintah:
#   record <tree-hash> <ref>   catat; entri lama untuk tree yang sama diganti
#   lookup <tree-hash>         cetak ref ke stdout; exit 1 kalau tidak ada
#
# `lookup` sengaja TIDAK mencetak pesan saat gagal — pemanggilnya yang tahu
# konteksnya (preflight produksi vs deploy produksi), jadi merekalah yang
# menyusun penjelasannya.
set -euo pipefail

# Path dihitung dari lokasi skrip, bukan dari direktori kerja, supaya ledger
# tetap ketemu walau skrip ini dipanggil dari mana saja.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER="$REPO_ROOT/.deploy-map"

CMD="${1:-}"

case "$CMD" in
  record)
    TREE="${2:?record butuh tree-hash}"
    REF="${3:?record butuh referensi image}"

    # Ditulis lewat file sementara lalu `mv`, bukan `>>` langsung: `mv` bersifat
    # atomik dalam satu filesystem, jadi ledger tidak pernah terbaca dalam
    # keadaan separuh tertulis.
    TMP="$LEDGER.tmp.$$"

    # Entri lama untuk tree yang sama DIGANTI, bukan ditambah. Tujuannya supaya
    # satu tree-hash selalu memetakan ke tepat satu referensi — yang paling baru.
    # Kalau dibiarkan menumpuk, `lookup` bisa mengembalikan lebih dari satu baris
    # dan produksi akan menarik image yang salah.
    if [ -f "$LEDGER" ]; then
      grep -v "^$TREE " "$LEDGER" > "$TMP" || true
    else
      : > "$TMP"
    fi

    printf '%s %s\n' "$TREE" "$REF" >> "$TMP"
    mv "$TMP" "$LEDGER"
    ;;

  lookup)
    TREE="${2:?lookup butuh tree-hash}"

    [ -f "$LEDGER" ] || exit 1

    FOUND="$(awk -v t="$TREE" '$1 == t { print $2; exit }' "$LEDGER")"
    [ -n "$FOUND" ] || exit 1

    printf '%s\n' "$FOUND"
    ;;

  *)
    echo "Pakai: $0 {record <tree-hash> <ref>|lookup <tree-hash>}" >&2
    exit 2
    ;;
esac
