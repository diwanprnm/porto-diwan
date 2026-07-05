import { NextResponse } from "next/server";
import { removeAdminCookie } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  const response = NextResponse.json({ success: true });
  await removeAdminCookie(response);
  return response;
}