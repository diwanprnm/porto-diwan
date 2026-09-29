"use client";

import { useState, useEffect, useRef } from "react";
// Tipe diambil dari sumbernya, bukan disalin ulang. Sebelumnya file ini punya
// salinan tipe sendiri, dan salinan itu sudah menyimpang dari content/profile.json:
// `contact` ditaruh di dalam `profile` (padahal ada di root) dan `skills` dianggap
// string[] (padahal array {name, category}). Dua penyimpangan itu yang membuat
// halaman ini crash dan berpotensi merusak data saat disimpan.
// `import type` penting di sini: lib/data membaca file lewat "fs", yang tidak boleh
// ikut ke bundle client. Import tipe dihapus saat build, jadi aman.
import type { ProfileDataStored, Skill } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
// descToArray diimpor dari pure.mjs, bukan disalin seperti sebelumnya.
//
// Komentar lama di sini menyebut alasan menyalin: lib/data.ts memakai "fs",
// dan value import dari file itu akan menarik "fs" ke bundle browser. Alasan itu
// benar untuk data.ts — tapi tidak berlaku untuk pure.mjs, yang tidak
// mengimpor apa pun. Jadi sekarang salinannya tidak perlu ada, dan fungsinya
// ikut terjaga oleh tests/pure.test.mjs.
import { descToArray } from "@/lib/pure.mjs";

/**
 * Membersihkan array yang diedit sebagai teks: buang spasi ujung dan elemen
 * kosong.
 *
 * KAPAN dipanggil itu intinya, bukan apa yang dikerjakan. Fungsi ini hanya boleh
 * jalan saat mengetik SUDAH SELESAI (onBlur) — jangan pernah di onChange.
 *
 * Alasannya: pada onChange, karakter terakhir dari nilai selalu karakter yang
 * baru saja ditekan. Pembersihan pada saat itu menghapus karakter tersebut, jadi
 * ketikan berikutnya menempel ke teks sebelumnya. Itu penyebab satu keluarga bug
 * di empat kolom sekaligus:
 *
 *   - "Hello "  → spasi ujung di-trim   → "Hello"  → huruf berikutnya menempel
 *   - "React,"  → elemen kosong dibuang → "React"  → koma hilang, tidak bisa
 *                 mengetik item kedua
 *   - Enter     → baris kosong dibuang  → paragraf baru tidak pernah bisa dibuat
 *
 * Karena itu onChange hanya boleh `split(sep)`, dan render harus `join(sep)`
 * dengan pemisah yang sama persis, sehingga nilainya bolak-balik utuh dan apa
 * yang diketik itulah isi state. Pembersihannya menyusul di sini.
 *
 * Kalau hasil bersihnya kosong, disisakan satu elemen kosong: array kosong
 * membuat kotak teks tampak mengosongkan dirinya sendiri tanpa alasan yang
 * terlihat.
 */
function cleanTextArray(parts: string[]): string[] {
  const cleaned = parts.map((s) => s.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [""];
}

/**
 * Pemisah antar paragraf di kolom Description, dan karena itu juga pemisah antar
 * baris di textarea-nya. Dipakai untuk split saat mengetik dan join saat render,
 * jadi keduanya tidak mungkin berbeda tanpa ketahuan.
 */
const DESC_SEP = "\n";

/**
 * Baca satu field dengan kunci yang baru diketahui saat runtime.
 *
 * Kunci itu ditentukan bahasa aktif (`foo` atau `foo_id`), jadi tidak ada cara
 * menuliskannya secara statis. Helper ini mengurung satu-satunya `as` di file
 * ini, supaya pembacaan field di seluruh komponen tetap bebas cast.
 *
 * Parameternya `object` dan bukan `Record<string, unknown>` dengan sengaja:
 * `object` menerima semua bentuk data di sini, termasuk `ProjectStored` yang
 * berupa irisan dengan `Omit<…>` (mapped type). `Record<string, unknown>` tidak
 * dijamin menerima mapped type — index signature-nya tidak dibuat otomatis
 * untuk tipe hasil `Omit`, sehingga pemanggilnya bisa gagal typecheck.
 *
 * Nilai kembaliannya `unknown`, bukan `any`: pemanggil WAJIB mempersempitnya
 * (di sini selalu `as string | undefined`), jadi tidak ada `any` yang menyebar
 * diam-diam lewat helper ini.
 */
function fields(obj: object): Record<string, unknown> {
  return obj as unknown as Record<string, unknown>;
}

/**
 * Upload gambar.
 *
 * Menggantikan input teks path gambar yang lama ("/image/diwan2.png"), yang
 * mengharuskan file ditaruh manual di public/ lalu namanya diketik. Sekarang
 * file dikirim ke /api/upload, disimpan sebagai BLOB di database, dan nilai
 * yang disimpan di data adalah URL "/api/images/<id>".
 *
 * Nilai lama tetap ditampilkan sebagai preview: gambar yang belum di-upload
 * ulang masih memakai URL hasil migrasi, dan URL itu juga "/api/images/<id>",
 * jadi preview-nya langsung benar tanpa perlakuan khusus.
 */
function ImageField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error || "Upload gagal");
      } else {
        onChange(body.url);
      }
    } catch {
      setErr("Tidak bisa menghubungi server");
    }
    setBusy(false);
    // Reset input supaya memilih file yang sama dua kali berturut-turut tetap
    // memicu onChange (tanpa ini, event-nya tidak jalan karena nilainya sama).
    if (fileRef.current) fileRef.current.value = "";
  }

  const btn =
    "px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="mt-3">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-20 h-20 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- gambar dari
            // /api/images bersifat dinamis dan sudah immutable, jadi optimizer
            // Next tidak memberi manfaat di sini.
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-600 text-center px-1">
              belum ada gambar
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {/* Input file ditaruh DI DALAM <label> yang membungkusnya. Dua alasan:
                (1) mengklik label otomatis membuka dialog file tanpa perlu .click()
                dari JavaScript, dan (2) `has-[:focus-visible]` bisa menggambar ring
                fokus pada label — kalau input-nya di luar label, ring-nya tidak
                akan terlihat dan tombol ini tidak bisa dipakai dengan keyboard. */}
            <label
              className={`${btn} bg-teal-800 hover:bg-teal-700 border-teal-700 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-900 ${
                busy ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {busy ? "Mengunggah…" : value ? "Ganti gambar" : "Pilih gambar"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
            </label>
            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange("")}
                className={`${btn} bg-slate-800 hover:bg-slate-700 border-slate-600`}
              >
                Hapus
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-1.5">
            PNG, JPEG, WebP, GIF, atau SVG. Maks 5 MB.
            {hint ? ` ${hint}` : ""}
          </p>
          {value && (
            <p className="text-[11px] text-slate-600 mt-0.5 break-all">{value}</p>
          )}
          {err && <p className="text-[11px] text-red-400 mt-1">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminEditor() {
  const [data, setData] = useState<ProfileDataStored | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Bahasa yang sedang diedit. Ini BUKAN bahasa tampilan situs — ini pilihan
  // kolom mana yang sedang diisi. Situs selalu menampilkan keduanya sekaligus
  // (satu per URL), jadi editor harus bisa mengisi keduanya.
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setMsg({ type: "err", text: "Gagal memuat data" }); setLoading(false); });
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    // Rapikan dulu sebelum dikirim. onBlur sudah menjalankan ini untuk kolom
    // yang disentuh, tapi Save bisa ditekan tanpa pernah blur — misalnya diklik
    // langsung setelah mengetik. Tanpa ini, baris/spasi sisa ikut terkirim dan
    // ikut tersimpan ke database.
    trimSkills();
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const r = await res.json();
        setMsg({ type: "ok", text: `✓ Saved (v${r.version}). Halaman CV sudah di-update.` });
      } else {
        const r = await res.json();
        setMsg({ type: "err", text: r.error || "Gagal menyimpan" });
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    }
    setSaving(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Gagal memuat data.</div>;

  // ── Terjemahan: kunci kolom, baca, dan placeholder ──────────────────────
  //
  // Bahasa Indonesia disimpan sebagai kolom kembaran berakhiran `_id` di
  // sebelah nilai Inggris (lihat ProfileDataStored di lib/data.ts). Tiga helper
  // di bawah adalah SATU-SATUNYA tempat aturan itu ditulis di file ini.
  //
  // `locKey`  — kolom mana yang ditulis/dibaca untuk bahasa aktif.
  // `loc`     — nilai untuk bahasa aktif. Kosong kalau belum diterjemahkan.
  // `ph`      — nilai Inggris sebagai placeholder saat mengisi bahasa Indonesia.
  //
  // Placeholder itu penting untuk alur kerjanya, bukan hiasan: tanpa melihat
  // teks Inggrisnya, penerjemah tidak tahu apa yang harus diterjemahkan, dan
  // kolom kosong terlihat seperti data hilang alih-alih "belum diisi".
  //
  // Parameternya `object`, bukan `Record<string, unknown>`, dan itu bukan
  // kelonggaran: kuncinya baru diketahui saat runtime (ditentukan bahasa aktif),
  // jadi aksesnya memang dinamis. Yang penting, `object` menerima SEMUA tipe
  // data di sini termasuk `ProjectStored` yang berbentuk irisan dengan `Omit<…>`
  // (mapped type) — sedangkan `Record<string, unknown>` tidak dijamin menerima
  // mapped type. Pelebaran tipe sengaja dikurung di dalam helper ini saja:
  // pemanggil tetap menerima `string`, bukan `unknown`.
  const locKey = (k: string) => (lang === "id" ? `${k}_id` : k);

  const loc = (obj: object, k: string): string =>
    (fields(obj)[locKey(k)] as string | undefined) ?? "";

  const ph = (obj: object, k: string): string | undefined =>
    lang === "id" ? ((fields(obj)[k] as string | undefined) ?? "") : undefined;

  // Array teks untuk bahasa aktif.
  //
  // Lewat descToArray, bukan `Array.isArray(v) ? v : []`: `description` boleh
  // berbentuk STRING tunggal (project "Metagama Information System" di seed).
  // Dengan pemeriksaan Array saja, nilai string itu menghasilkan array kosong —
  // textarea Description tampil kosong padahal isinya ada, dan mengetik satu
  // huruf di situ menimpa seluruh deskripsi aslinya. Bentuk string adalah bentuk
  // yang sah di sini, bukan data yang rusak.
  const locArr = (obj: object, k: string): string[] =>
    descToArray((fields(obj)[locKey(k)] as string | string[] | undefined) ?? "");

  const phArr = (obj: object, k: string): string | undefined =>
    lang === "id"
      ? descToArray((fields(obj)[k] as string | string[] | undefined) ?? "").join(DESC_SEP)
      : undefined;

  // ── Setters ──
  //
  // Dua bentuk, dan bedanya penting:
  //
  //   updateX(...)         → field PROSA. Ditulis ke `k` atau `k_id` sesuai
  //                          bahasa yang sedang diedit (locKey).
  //   updateXNeutral(...)  → field NETRAL BAHASA (nama orang, email, URL, nama
  //                          teknologi). Selalu ditulis ke `k` apa adanya.
  //
  // Dipisah jadi dua fungsi, bukan satu fungsi ber-flag, supaya kekeliruannya
  // punya arah yang AMAN. Kalau field netral keliru memakai versi localized,
  // yang tersimpan adalah kunci `foo_id` yang tidak dikenal dan penyuntingan
  // tampak tidak berefek — kelihatan saat dicoba. Kalau dibalik (default
  // netral), field prosa yang lupa ditandai akan MENIMPA teks Inggris tanpa
  // error apa pun, dan itu kerusakan data yang baru ketahuan setelah lama.
  const updateProfile = (k: string, v: string) =>
    setData({ ...data, profile: { ...data.profile, [locKey(k)]: v } });
  const updateProfileNeutral = (k: string, v: string) =>
    setData({ ...data, profile: { ...data.profile, [k]: v } });

  // contact ada di root ProfileData, bukan di dalam profile. Netral bahasa —
  // alamat email dan lokasi tidak diterjemahkan, jadi tidak ada versi localized.
  const updateContact = (k: string, v: string) =>
    setData({ ...data, contact: { ...data.contact, [k]: v } });

  const updateEducation = (k: string, v: string) =>
    setData({ ...data, education: { ...data.education, [locKey(k)]: v } });
  const updateEducationNeutral = (k: string, v: string) =>
    setData({ ...data, education: { ...data.education, [k]: v } });

  // Skills: array {name, category}. Editor menampilkan "name (category)" per
  // baris supaya kategori tidak hilang. Sebelumnya field ini digabung jadi satu
  // input koma dan disimpan sebagai string[] — kalau ditekan Save, seluruh
  // kategori skill di profile.json ikut hilang dan section Skills di halaman
  // depan jadi kosong. Format "name (category)" dipertahankan agar kategori
  // tetap bisa diisi, tapi category tidak wajib: "Docker" saja tetap boleh.
  //
  // Perhatikan di sini array-nya BUKAN string[], jadi pemisahan baris tidak bisa
  // memakai cleanTextArray yang cuma trim + buang kosong: tiap baris masih perlu
  // dipecah jadi {name, category}. Jadi onChange memakai parse yang sama, tapi
  // TANPA trim dan TANPA filter(Boolean) — membersihkan di onChange menghapus
  // karakter yang sedang diketik, persis bug yang sama dengan kolom lain.
  // Pembersihannya ada di trimSkills, dipanggil dari onBlur.
  //
  // Nama teknologi netral bahasa, jadi daftar ini tidak punya versi Indonesia.
  const parseSkillLines = (v: string): Skill[] =>
    v.split("\n").map((line) => {
      const m = line.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      if (m) return { name: m[1], category: m[2] || "concept" };
      return { name: line, category: "concept" };
    });
  const skillsToText = () =>
    data.skills.map((s) => (s.category ? `${s.name} (${s.category})` : s.name)).join("\n");
  const setSkills = (v: string) =>
    setData({ ...data, skills: parseSkillLines(v) });
  const trimSkills = () =>
    setData({
      ...data,
      skills: parseSkillLines(skillsToText())
        .map((s) => ({ ...s, name: s.name.trim(), category: s.category.trim() || "concept" }))
        .filter((s) => s.name),
    });

  // Socials — netral bahasa.
  const updateSocial = (i: number, k: string, v: string) => {
    const socials = [...data.socials];
    socials[i] = { ...socials[i], [k]: v };
    setData({ ...data, socials });
  };

  // Experience
  const updateExp = (i: number, k: string, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [locKey(k)]: v };
    setData({ ...data, experience: exp });
  };
  // Nama perusahaan tidak diterjemahkan.
  const updateExpNeutral = (i: number, k: string, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [k]: v };
    setData({ ...data, experience: exp });
  };
  // Highlights dan skills experience.
  //
  // onChange cuma split("\n") / split(",") tanpa trim. Perhatikan pasangannya:
  // ExpHighlights split("\n") ↔ JSX join("\n"), ExpSkills split(",") ↔ JSX
  // join(", "). Pembersihan (trim + buang elemen kosong) ada di handler *Trim di
  // bawah, yang dipanggil dari onBlur. Lihat cleanTextArray untuk alasannya.
  //
  // Highlights diterjemahkan (satu baris per poin), skills tidak (nama
  // teknologi).
  const updateExpHighlights = (i: number, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [locKey("highlights")]: v.split("\n") };
    setData({ ...data, experience: exp });
  };
  const trimExpHighlights = (i: number) => {
    const exp = [...data.experience];
    exp[i] = {
      ...exp[i],
      [locKey("highlights")]: cleanTextArray(locArr(exp[i], "highlights")),
    };
    setData({ ...data, experience: exp });
  };
  const updateExpSkills = (i: number, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], skills: v.split(",") };
    setData({ ...data, experience: exp });
  };
  const trimExpSkills = (i: number) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], skills: cleanTextArray(exp[i].skills) };
    setData({ ...data, experience: exp });
  };
  const addExp = () =>
    setData({
      ...data,
      experience: [...data.experience, { period: "", title: "", company: "", highlights: [], skills: [] }],
    });
  const removeExp = (i: number) =>
    setData({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });

  // Projects
  const updateProj = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [locKey(k)]: v };
    setData({ ...data, projects: proj });
  };
  // Gambar dan URL repo/demo netral bahasa.
  const updateProjNeutral = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [k]: v };
    setData({ ...data, projects: proj });
  };
  // onChange hanya split(DESC_SEP); trim ada di trimProjDesc lewat onBlur. Lihat
  // cleanTextArray untuk alasannya — intinya, membersihkan di onChange ikut
  // menghapus karakter yang sedang diketik.
  const updateProjDesc = (i: number, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [locKey("description")]: v.split(DESC_SEP) };
    setData({ ...data, projects: proj });
  };
  const trimProjDesc = (i: number) => {
    const proj = [...data.projects];
    // `?? ""` bukan sekadar penjaga tipe: kolom description boleh string
    // tunggal, array, atau belum ada sama sekali (project yang baru ditambah
    // lewat tombol "+ Add" mulai dari array kosong). descToArray tidak menerima
    // undefined.
    const raw = fields(proj[i])[locKey("description")];
    proj[i] = {
      ...proj[i],
      [locKey("description")]: cleanTextArray(
        descToArray((raw as string | string[] | undefined) ?? "")
      ),
    };
    setData({ ...data, projects: proj });
  };
  const updateProjSkills = (i: number, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], skills: v.split(",") };
    setData({ ...data, projects: proj });
  };
  const trimProjSkills = (i: number) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], skills: cleanTextArray(proj[i].skills) };
    setData({ ...data, projects: proj });
  };
  const addProj = () =>
    setData({
      ...data,
      projects: [...data.projects, { name: "", client: "", image: "", github_url: "", live_url: "", description: [], skills: [] }],
    });
  const removeProj = (i: number) =>
    setData({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });

  const addSocial = () =>
    setData({ ...data, socials: [...data.socials, { platform: "", url: "", icon: "" }] });
  const removeSocial = (i: number) =>
    setData({ ...data, socials: data.socials.filter((_, idx) => idx !== i) });

  // Certifications.
  //
  // Semua akses array memakai `data.certifications ?? []`: dokumen lama di
  // profile_doc tidak punya kunci ini, jadi tanpa penjaga itu `.map`/spread akan
  // melempar error dan halaman admin gagal memuat.
  const updateCert = (i: number, k: string, v: string) => {
    const certifications = [...(data.certifications ?? [])];
    certifications[i] = { ...certifications[i], [locKey(k)]: v };
    setData({ ...data, certifications });
  };
  // URL sertifikat netral bahasa.
  const updateCertNeutral = (i: number, k: string, v: string) => {
    const certifications = [...(data.certifications ?? [])];
    certifications[i] = { ...certifications[i], [k]: v };
    setData({ ...data, certifications });
  };
  const addCert = () =>
    setData({
      ...data,
      certifications: [...(data.certifications ?? []), { name: "", issuer: "", date: "", url: "" }],
    });
  const removeCert = (i: number) =>
    setData({ ...data, certifications: (data.certifications ?? []).filter((_, idx) => idx !== i) });

  // Languages — diterjemahkan ("Indonesian"/"Native" punya padanan Indonesia).
  // Bagian ini sebelumnya tidak ada di editor, jadi nilainya hanya bisa diubah
  // lewat file JSON. Karena sekarang isinya per bahasa, harus bisa disunting.
  const updateLang = (i: number, k: string, v: string) => {
    const languages = [...(data.languages ?? [])];
    languages[i] = { ...languages[i], [locKey(k)]: v };
    setData({ ...data, languages });
  };
  const addLang = () =>
    setData({
      ...data,
      languages: [...(data.languages ?? []), { name: "", level: "" }],
    });
  const removeLang = (i: number) =>
    setData({ ...data, languages: (data.languages ?? []).filter((_, idx) => idx !== i) });

  // Styles
  const input = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500";
  const label = "block text-xs text-gray-400 mb-1 mt-3 font-medium";
  const card = "bg-slate-800/50 rounded-xl p-4 border border-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-teal-100">✏️ Admin Editor — CV</h1>
          <div className="flex gap-2">
            <a href={`/${lang}`} target="_blank" className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">View Site →</a>
            <button onClick={logout} className="px-3 py-1.5 text-sm bg-red-900 hover:bg-red-800 rounded-lg">Logout</button>
          </div>
        </div>

        {/* Save bar */}
        <div className="sticky top-0 bg-slate-950/90 backdrop-blur py-3 z-10 flex items-center gap-3 mb-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Save"}
          </button>
          {msg && <span className={`text-sm ${msg.type === "ok" ? "text-teal-300" : "text-red-300"}`}>{msg.text}</span>}
          <span className="ml-auto text-xs text-gray-500">v{data.__meta?.version || "?"} · {data.__meta?.updated_at ? new Date(data.__meta.updated_at).toLocaleString() : ""}</span>
        </div>

        {/* Language picker.
            Kedua bahasa disimpan bersamaan di satu dokumen, jadi ini memilih
            kolom mana yang sedang diisi — bukan bahasa tampilan situs. Kolom
            yang netral bahasa (nama, email, URL, nama teknologi) tidak berubah
            saat pilihan ini diganti; itu memang disengaja. */}
        <div className="sticky top-[60px] z-10 mb-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur p-3">
          <span className="text-xs font-medium text-gray-400">Bahasa isi:</span>
          <div className="flex gap-1">
            {(["en", "id"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                  lang === l
                    ? "bg-teal-600/25 text-teal-200 ring-1 ring-inset ring-teal-500/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {l === "en" ? "English" : "Indonesia"}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-gray-500">
            {lang === "id"
              ? "Kolom kosong memakai teks Inggris (terlihat abu-abu)."
              : "Mengisi versi Inggris. Versi Indonesia diisi di tab ID."}
          </span>
        </div>

        {/* Profile section */}
        <section className={card + " mb-4"}>
          <h2 className="text-lg font-semibold text-teal-200 mb-3">Profile</h2>
          <label className={label}>Name</label>
          <input className={input} value={data.profile.name} onChange={(e) => updateProfileNeutral("name", e.target.value)} />
          <label className={label}>Title</label>
          <input className={input} value={loc(data.profile, "title")} placeholder={ph(data.profile, "title")} onChange={(e) => updateProfile("title", e.target.value)} />
          <ImageField
            label="Foto profil"
            value={data.profile.image}
            onChange={(url) => updateProfileNeutral("image", url)}
          />
          <label className={label}>Bio (short tagline)</label>
          <textarea className={input} rows={2} value={loc(data.profile, "bio")} placeholder={ph(data.profile, "bio")} onChange={(e) => updateProfile("bio", e.target.value)} />
          <label className={label}>About (longer description)</label>
          <textarea className={input} rows={5} value={loc(data.profile, "about")} placeholder={ph(data.profile, "about")} onChange={(e) => updateProfile("about", e.target.value)} />
          <label className={label}>Location</label>
          <input className={input} value={data.contact.location} onChange={(e) => updateContact("location", e.target.value)} />
          <label className={label}>Email</label>
          <input className={input} value={data.contact.email} onChange={(e) => updateContact("email", e.target.value)} />
        </section>

        {/* Education */}
        <section className={card + " mt-4"}>
          <h2 className="text-base font-semibold text-teal-200 mb-3">🎓 Education</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>School</label>
              <input className={input} value={data.education.school} onChange={(e) => updateEducationNeutral("school", e.target.value)} />
            </div>
            <div>
              <label className={label}>Period</label>
              <input className={input} value={data.education.period} onChange={(e) => updateEducationNeutral("period", e.target.value)} />
            </div>
            <div>
              <label className={label}>Degree</label>
              <input className={input} value={loc(data.education, "degree")} placeholder={ph(data.education, "degree")} onChange={(e) => updateEducation("degree", e.target.value)} />
            </div>
            <div>
              <label className={label}>GPA (optional)</label>
              <input className={input} value={data.education.gpa} onChange={(e) => updateEducationNeutral("gpa", e.target.value)} placeholder="e.g. 3.85/4.00" />
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className={card + " mb-4"}>
          <h2 className="text-lg font-semibold text-teal-200 mb-3">Skills & Tools</h2>
          <label className={label}>Comma-separated</label>
          <textarea
            className={input}
            rows={8}
            value={skillsToText()}
            onChange={(e) => setSkills(e.target.value)}
            // Wajib: parseSkillLines di onChange sengaja meninggalkan spasi dan
            // baris kosong (kalau tidak, ketikan terakhir yang terhapus). Di sini
            // semuanya dirapikan, setelah tidak ada ketikan yang berjalan.
            onBlur={trimSkills}
          />
          <p className="text-xs text-gray-500 mt-1">
            {data.skills.length} skills. Satu per baris, format{" "}
            <code>Nama (kategori)</code> — kategori: language, framework, database,
            devops, concept. Kategori menentukan tile mana yang dipakai di halaman depan.
            Nama teknologi tidak diterjemahkan, jadi daftar ini sama di kedua bahasa.
          </p>
        </section>

        {/* Socials */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">🔗 Socials</h2>
            <button onClick={addSocial} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.socials.map((s, i) => (
            <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <button onClick={() => removeSocial(i)} className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </button>
              </div>
              <div className="flex gap-2">
                <input className={input} placeholder="platform" value={s.platform} onChange={(e) => updateSocial(i, "platform", e.target.value)} />
                <input className={input} placeholder="url" value={s.url} onChange={(e) => updateSocial(i, "url", e.target.value)} />
              </div>
              <ImageField
                label="Ikon"
                value={s.icon}
                onChange={(url) => updateSocial(i, "icon", url)}
                hint="Ikon kecil, sebaiknya persegi."
              />
            </div>
          ))}
        </section>

        {/* Experience */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">💼 Experience</h2>
            <button onClick={addExp} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.experience.map((exp, i) => (
            <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                <button onClick={() => removeExp(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
              <label className={label}>Period</label>
              <input className={input} value={loc(exp, "period")} placeholder={ph(exp, "period")} onChange={(e) => updateExp(i, "period", e.target.value)} />
              <label className={label}>Title</label>
              <input className={input} value={loc(exp, "title")} placeholder={ph(exp, "title")} onChange={(e) => updateExp(i, "title", e.target.value)} />
              <label className={label}>Company</label>
              <input className={input} value={exp.company} onChange={(e) => updateExpNeutral(i, "company", e.target.value)} />
              <label className={label}>Highlights (satu per baris)</label>
              <textarea
                className={input}
                rows={6}
                value={locArr(exp, "highlights").join("\n")}
                placeholder={phArr(exp, "highlights")}
                onChange={(e) => updateExpHighlights(i, e.target.value)}
                onBlur={() => trimExpHighlights(i)}
              />
              <label className={label}>Skills (comma-separated)</label>
              <input
                className={input}
                value={exp.skills.join(", ")}
                onChange={(e) => updateExpSkills(i, e.target.value)}
                onBlur={() => trimExpSkills(i)}
              />
            </div>
          ))}
        </section>

        {/* Projects */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">🚀 Projects</h2>
            <button onClick={addProj} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.projects.map((proj, i) => {
            // Deskripsi boleh string tunggal (Metagama) atau array (lainnya).
            // Tanpa descToArray, project berdeskripsi string jadi undefined dan
            // textarea-nya muncul kosong.
            const descArr = locArr(proj, "description").join(DESC_SEP);
            return (
              <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                  <button onClick={() => removeProj(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <label className={label}>Name</label>
                <input className={input} value={loc(proj, "name")} placeholder={ph(proj, "name")} onChange={(e) => updateProj(i, "name", e.target.value)} />
                {/* Slug URL dihitung dari nama INGGRIS, jadi mengubah nama di
                    tab ID tidak mengubah alamat halaman detail project. */}
                <p className="text-[11px] text-gray-500 mt-1">
                  Nama versi Inggris yang menentukan URL <code>/projects/&lt;slug&gt;</code>. Mengubahnya mengubah alamat halaman detail.
                </p>
                <label className={label}>Client</label>
                <input className={input} value={loc(proj, "client")} placeholder={ph(proj, "client")} onChange={(e) => updateProj(i, "client", e.target.value)} />
                <ImageField
                  label="Gambar project"
                  value={proj.image}
                  onChange={(url) => updateProjNeutral(i, "image", url)}
                  hint="Screenshot antarmuka. Rasio lebar lebih bagus."
                />
                <label className={label}>GitHub URL</label>
                <input className={input} value={proj.github_url} onChange={(e) => updateProjNeutral(i, "github_url", e.target.value)} />
                <label className={label}>Live URL (kosongkan kalau tidak ada demo)</label>
                <input className={input} value={proj.live_url ?? ""} onChange={(e) => updateProjNeutral(i, "live_url", e.target.value)} />
                <label className={label}>Description (satu paragraf per baris)</label>
                <textarea
                  className={input}
                  rows={5}
                  value={descArr}
                  placeholder={phArr(proj, "description")}
                  onChange={(e) => updateProjDesc(i, e.target.value)}
                  onBlur={() => trimProjDesc(i)}
                />
                <label className={label}>Skills (comma-separated)</label>
                <input
                  className={input}
                  value={proj.skills.join(", ")}
                  onChange={(e) => updateProjSkills(i, e.target.value)}
                  onBlur={() => trimProjSkills(i)}
                />
              </div>
            );
          })}
        </section>

        {/* Certifications */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">📜 Certifications</h2>
            <button onClick={addCert} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {(data.certifications ?? []).map((cert, i) => (
            <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                <button onClick={() => removeCert(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
              <label className={label}>Name</label>
              <input className={input} value={loc(cert, "name")} placeholder={ph(cert, "name")} onChange={(e) => updateCert(i, "name", e.target.value)} />
              <label className={label}>Issuer</label>
              <input className={input} value={loc(cert, "issuer")} placeholder={ph(cert, "issuer")} onChange={(e) => updateCert(i, "issuer", e.target.value)} />
              <label className={label}>Date</label>
              <input className={input} value={loc(cert, "date")} placeholder={ph(cert, "date") || "e.g. March 2024"} onChange={(e) => updateCert(i, "date", e.target.value)} />
              <label className={label}>Credential URL (kosongkan kalau tidak ada)</label>
              <input className={input} value={cert.url ?? ""} onChange={(e) => updateCertNeutral(i, "url", e.target.value)} />
            </div>
          ))}
        </section>

        {/* Languages */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">🗣️ Languages</h2>
            <button onClick={addLang} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {(data.languages ?? []).map((l, i) => (
            <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                <button onClick={() => removeLang(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Language</label>
                  <input className={input} value={loc(l, "name")} placeholder={ph(l, "name")} onChange={(e) => updateLang(i, "name", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Level</label>
                  <input className={input} value={loc(l, "level")} placeholder={ph(l, "level")} onChange={(e) => updateLang(i, "level", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Footer save */}
        <div className="mt-6 pb-10 flex gap-3">
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Menyimpan..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
