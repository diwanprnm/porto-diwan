import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "change-me-to-a-long-random-string"
);

const TOKEN_NAME = "admin_token";
const TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

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