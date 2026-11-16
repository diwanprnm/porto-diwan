import { NextRequest, NextResponse } from "next/server";
import { saveProfileData, type ProfileDataStored } from "@/lib/data";
import { getAdminFromCookie } from "@/lib/auth";

// PUT /api/profile — admin update
export async function PUT(req: NextRequest) {
  // Auth check via cookie
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Bentuk tersimpan (dua bahasa), bukan hasil terjemahan — lihat catatan di
    // getProfileDataRaw. Body datang dari /admin dan /admin/projects, yang
    // menerimanya dari GET /api/profile dengan bentuk yang sama.
    //
    // `projects` OPSIONAL. /admin tidak mengirimnya (lihat save() di sana):
    // halaman itu tidak menampilkan daftar project, jadi daftar yang dibacanya
    // saat halaman dibuka sudah basi begitu ada project baru dari tab lain — dan
    // menyimpannya akan menghapus project tersebut. Tanpa field ini,
    // saveProfileData tidak menyentuh tabel projects.
    const body = (await req.json()) as Omit<ProfileDataStored, "__meta" | "projects"> & {
      projects?: ProfileDataStored["projects"];
    };

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