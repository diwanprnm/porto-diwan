import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/data";

// GET /api/profile — public read
export async function GET() {
  try {
    const data = await getProfileData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}