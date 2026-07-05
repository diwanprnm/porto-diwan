import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getProfileData, saveProfileData, type ProfileData } from "@/lib/data";
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
    
    // Fetch current to preserve meta version chain
    const current = await getProfileData();
    const updated: ProfileData = { ...body, __meta: current.__meta };
    
    await saveProfileData(updated);
    
    // Trigger ISR revalidation — regenerate static pages with new content
    revalidatePath("/", "layout");
    
    return NextResponse.json({ success: true, version: updated.__meta.version });
  } catch {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}