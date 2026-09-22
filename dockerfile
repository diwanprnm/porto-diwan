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

# Dibutuhkan oleh `npm run db:migrate` di dalam container. Sebelumnya content/
# tidak ikut disalin, sehingga process.cwd()/content/profile.json tidak ada dan
# operasi baca/tulis data gagal di Docker.
COPY --from=builder /app/content ./content
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/db ./db

EXPOSE 3000

CMD ["npm", "start"]
