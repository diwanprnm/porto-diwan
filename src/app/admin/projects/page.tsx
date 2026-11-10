import { getAdminFromCookie } from "@/lib/auth";
import LoginGate from "../LoginGate";
import ProjectsEditor from "./ProjectsEditor";

// Selalu dirender per request: halaman ini membaca cookie sesi dan data project
// yang bisa berubah kapan saja dari editor lain.
export const dynamic = "force-dynamic";

/**
 * Halaman pengelolaan project.
 *
 * Dipisah dari /admin, bukan sekadar satu section lagi di sana: project punya
 * field yang jauh lebih banyak daripada entitas lain (gambar, dua teks, URL,
 * tech stack), dan form-nya akan menenggelamkan sisanya. /admin sekarang hanya
 * menautkan ke sini.
 *
 * Login-nya memakai LoginGate yang sama dengan /admin, jadi tidak ada halaman
 * login kedua yang bisa menyimpang.
 */
export default async function AdminProjectsPage() {
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    return <LoginGate />;
  }
  return <ProjectsEditor />;
}
