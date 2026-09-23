#!/usr/bin/env bash
#
# Menerjemahkan ISI commit menjadi nama image.
#
# Dipakai oleh dua job — `build` (menentukan tag yang di-push) dan
# `preflight-production` (menentukan tag yang harus sudah ada) — supaya keduanya
# tidak mungkin berbeda pendapat soal image mana yang dimaksud.
#
# Kenapa TREE hash, bukan SHA commit:
#
#   Merge menghasilkan commit BARU dengan SHA berbeda walaupun isinya sama
#   persis. SHA commit karena itu tidak bisa dipakai untuk mencocokkan "yang
#   diuji di staging" dengan "yang di-deploy ke produksi" — dua commit itu
#   selalu punya SHA berbeda.
#
#   `git rev-parse HEAD^{tree}` menghasilkan hash yang hanya bergantung pada ISI
#   pohon file. Dua commit dengan isi sama menghasilkan tree hash yang sama, di
#   branch mana pun, dengan strategi merge apa pun (merge commit, squash,
#   rebase). Itulah yang membuat produksi bisa menarik image yang sama persis
#   dengan yang barusan diuji di staging.
#
# Efek sampingnya adalah gerbang yang nyata: kalau ada commit yang sampai ke
# `main` tanpa pernah lewat `staging`, tree hash-nya tidak akan cocok dengan
# image mana pun, dan preflight di produksi gagal — bukan diam-diam menjalankan
# kode yang belum diuji.
#
# Hash dipakai PENUH (40 karakter), bukan dipotong. Tag pendek menaikkan
# peluang dua isi berbeda jatuh ke tag yang sama, dan produksi akan menarik
# image yang salah tanpa ada yang tahu.
#
# Dipisah ke file sendiri, bukan ditulis inline di YAML, karena alasan yang sama
# dengan scripts/deploy-remote.sh: `^{tree}` mengandung `{` yang berisiko
# bersinggungan dengan sintaks `${{ }}` Actions, dan skrip ini bisa dites manual
# tanpa menjalankan pipeline.
#
# DOCKERHUB_USERNAME dibaca dari environment, bukan dari argumen, supaya
# pemanggilnya di YAML bisa memakai pola `env:` yang sama dengan langkah login,
# dan tidak ada nama akun yang perlu di-escape di dalam teks perintah.
set -euo pipefail

TREE=$(git rev-parse "HEAD^{tree}")

echo "${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME belum di-set}/porto:$TREE"
