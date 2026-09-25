import { NextRequest, NextResponse } from "next/server";
import { saveProfileData, type ProfileData } from "@/lib/data";
import { getAdminFromCookie } from "@/lib/auth";

// PUT /api/profile — admin update
export async function PUT(req: NextRequest) {
  // Auth check via cookie
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Omit<ProfileData, "__meta">;

    // saveProfileData menaikkan __meta.version sendiri (dibaca di dalam
    // transaksi) dan menulis semuanya dalam satu transaksi. Nilai __meta dari
    // body tidak dipakai, jadi diisi placeholder di sini.
    const version = await saveProfileData({
      ...body,
      __meta: { version: 0, updated_at: "" },
    });

    return NextResponse.json({ success: true, version });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}