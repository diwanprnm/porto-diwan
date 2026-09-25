FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TIDAK membutuhkan database. Halaman yang membaca data ditandai
# `force-dynamic`, jadi tidak ada query yang dijalankan saat build. Kalau nanti
# ISR dipakai lagi, stage ini perlu DATABASE_URL dan akses ke service db.
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/content ./content

# Generate admin secret on container start if not set
RUN if [ -z "$ADMIN_SECRET" ]; then \
      echo "ADMIN_SECRET=$(openssl rand -hex 32)" >> .env; \
    fi

# Dibutuhkan oleh `npm run db:migrate` di dalam container. Sebelumnya content/
# tidak ikut disalin, sehingga process.cwd()/content/profile.json tidak ada dan
# operasi baca/tulis data gagal di Docker.
COPY --from=builder /app/content ./content
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/db ./db

# scripts/db.mjs mengimpor projectSlug dari ../src/lib/pure.mjs, jadi file itu
# HARUS ada di dalam image dengan path yang sama.
#
# Tanpa baris ini, `npm run db:migrate` — yang dijalankan setiap deploy oleh
# scripts/deploy-remote.sh — gagal dengan ERR_MODULE_NOT_FOUND. Perlu diketahui:
# kegagalan itu TIDAK akan tertangkap smoke test, karena smoke test hanya
# menembak /healthz dan tidak menjalankan migrasi. Ia baru muncul saat deploy.
#
# Hanya file ini yang disalin, bukan seluruh src/: sisa kode aplikasi sudah
# terbundel ke dalam .next oleh `next build`, jadi menyalin src/ utuh hanya akan
# menambah ukuran image tanpa dipakai siapa pun.
COPY --from=builder /app/src/lib/pure.mjs ./src/lib/pure.mjs

EXPOSE 3000

CMD ["npm", "start"]
