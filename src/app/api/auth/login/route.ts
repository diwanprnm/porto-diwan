import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword, setAdminCookie } from "@/lib/auth";

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const valid = await validateAdminPassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    await setAdminCookie(response);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}