import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "change-me-to-a-long-random-string"
);

const TOKEN_NAME = "admin_token";
const TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

// bcrypt hanya menerima hash 60 karakter ($2a$/$2b$/$2y$ + cost + salt + digest).
// Nilai yang DIISI tetapi tidak berbentuk itu membuat setiap percobaan login
// ditolak dengan 401 biasa — tanpa petunjuk apa pun di UI maupun di log, jadi
// tampak seperti "password salah" padahal password-nya tidak pernah dibandingkan.
// Diperiksa sekali di sini supaya penyebabnya muncul eksplisit saat container
// start, bukan jadi teka-teki berjam-jam.
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;
if (ADMIN_HASH && !/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(ADMIN_HASH)) {
  console.error(
    "[auth] ADMIN_PASSWORD_HASH di-set tetapi bukan hash bcrypt yang sah " +
      `(${ADMIN_HASH.length} karakter; harus tepat 60). Semua login admin akan ditolak. ` +
      "Buat hash baru dengan: node -e \"console.log(require('bcryptjs').hashSync('passwordBaru', 10))\""
  );
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function validateAdminPassword(password: string): Promise<boolean> {
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminHash) {
    // On first run without hash set, accept default "admin123"
    const defaultHash = await bcrypt.hash("admin123", 10);
    return bcrypt.compare(password, defaultHash);
  }
  return bcrypt.compare(password, adminHash);
}

export async function getAdminFromCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function setAdminCookie(response: NextResponse) {
  const token = await createToken();
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
  return response;
}

export async function removeAdminCookie(response: NextResponse) {
  response.cookies.set(TOKEN_NAME, "", { maxAge: 0, path: "/" });
  return response;
}