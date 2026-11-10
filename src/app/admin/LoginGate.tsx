/**
 * Gerbang login untuk halaman admin (/admin dan /admin/projects).
 *
 * Berkas ini sebelumnya berisi versi lain yang memakai token design system
 * (bg-paper, label-mono, field, btn--primary) yang tidak pernah dikompilasi ke
 * src/app/globals.css — jadi halaman loginnya tampil tanpa gaya sama sekali.
 * Versi yang benar-benar dipakai adalah yang dulu ditulis inline di
 * src/app/admin/page.tsx; itulah yang dipindah ke sini, dan sekarang kedua
 * halaman admin memakainya, sehingga tidak ada dua gerbang login yang bisa
 * menyimpang.
 *
 * Formnya tetap bekerja tanpa JavaScript: action/method mengirim POST ke
 * /api/auth/login. Script di bawah hanya memperbaikinya agar gagal login tidak
 * memuat ulang halaman dan bisa dilaporkan lewat alert.
 */
export default function LoginGate() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-teal-100 mb-2">Admin Login</h1>
        <p className="text-gray-400 text-sm mb-6">
          Masukkan password admin untuk mengedit content CV.
        </p>
        <form action="/api/auth/login" method="POST" className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter admin password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-600 text-white py-2 rounded-lg transition font-medium"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          Hint: default password adalah <code className="text-teal-300">admin123</code>.
          Ganti via env <code className="text-teal-300">ADMIN_PASSWORD_HASH</code>.
        </p>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: fd.get('password') }),
                });
                if (res.ok) { window.location.reload(); }
                else { alert('Password salah'); }
              });
            `,
          }}
        />
      </div>
    </div>
  );
}
