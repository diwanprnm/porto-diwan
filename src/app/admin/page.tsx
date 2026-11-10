import { getAdminFromCookie } from "@/lib/auth";
import AdminEditor from "./AdminEditor";
import LoginGate from "./LoginGate";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthed = await getAdminFromCookie();
  if (!isAuthed) {
    // Render login form (client component handles the rest)
    return <LoginGate />;
  }
  return <AdminEditor />;
}
