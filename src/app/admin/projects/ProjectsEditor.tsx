"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ProfileDataStored } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import {
  cleanTextArray,
  DESC_SEP,
  fields,
  makeLocalizers,
} from "../editor-shared";
import ImageField from "../ImageField";
import { descToArray } from "@/lib/pure.mjs";

/**
 * Editor daftar project.
 *
 * Bekerja pada SELURUH dokumen, bukan hanya `projects`: GET /api/profile
 * mengembalikan bentuk tersimpan yang utuh (dua bahasa), dan Save mengirimkannya
 * kembali apa adanya. Itu bukan keborosan — saveProfileData menulis dokumen dan
 * tabel projects dalam satu transaksi, jadi mengirim hanya `projects` akan
 * mengosongkan seluruh isi CV. Yang tidak disentuh halaman ini tetap ikut
 * terkirim persis seperti diterima.
 *
 * Dua teks per project, dan bedanya menentukan di mana tiap teks muncul:
 *
 *   description      → kartu di section Projects. Satu kalimat ringkas, tampil
 *                      utuh tanpa dipotong.
 *   long_description → halaman /projects/<slug>. Cerita lengkapnya.
 *
 * Keduanya punya cadangan dua arah (lihat splitProjectTexts di pure.mjs), jadi
 * project lama yang baru punya satu teks tetap tampil di kedua tempat.
 */
export default function ProjectsEditor() {
  const [data, setData] = useState<ProfileDataStored | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Kolom mana yang sedang diisi (bukan bahasa tampilan situs). Sama seperti
  // /admin: situs selalu menampilkan kedua bahasa sekaligus, satu per URL.
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setMsg({ type: "err", text: "Gagal memuat data" }); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Gagal memuat data.</div>;

  // Aturan pelokalan yang sama dengan /admin, dari satu sumber.
  const { locKey, loc, ph, locArr, phArr } = makeLocalizers(lang);

  // ── Setters ──
  // Prosa ditulis ke `k`/`k_id` sesuai bahasa; gambar dan URL netral bahasa.
  const updateProj = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [locKey(k)]: v };
    setData({ ...data, projects: proj });
  };
  const updateProjNeutral = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [k]: v };
    setData({ ...data, projects: proj });
  };

  // onChange hanya split(DESC_SEP); trim ada di handler *Trim lewat onBlur.
  // Lihat cleanTextArray di editor-shared.ts untuk alasannya.
  const updateProjDesc = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [locKey(k)]: v.split(DESC_SEP) };
    setData({ ...data, projects: proj });
  };
  const trimProjDesc = (i: number, k: string) => {
    const proj = [...data.projects];
    // `?? ""` bukan sekadar penjaga tipe: kolom ini boleh string tunggal, array,
    // atau belum ada sama sekali (project yang baru ditambah mulai dari array
    // kosong). descToArray tidak menerima undefined.
    const raw = fields(proj[i])[locKey(k)];
    proj[i] = {
      ...proj[i],
      [locKey(k)]: cleanTextArray(descToArray((raw as string | string[] | undefined) ?? "")),
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
      projects: [
        ...data.projects,
        {
          name: "",
          client: "",
          image: "",
          github_url: "",
          live_url: "",
          description: [],
          long_description: [],
          skills: [],
        },
      ],
    });
  const removeProj = (i: number) =>
    setData({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });

  async function save() {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    // Rapikan dulu sebelum dikirim: onBlur sudah menjalankannya untuk kolom yang
    // disentuh, tapi Save bisa ditekan tanpa pernah blur.
    const trimmed = {
      ...data,
      projects: data.projects.map((p) => ({
        ...p,
        description: cleanTextArray(descToArray(p.description ?? "")),
        long_description: cleanTextArray(descToArray(p.long_description ?? "")),
        skills: cleanTextArray(p.skills ?? []),
      })),
    };
    setData(trimmed);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed),
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

  // Styles — sama dengan /admin supaya dua halaman ini terasa satu aplikasi.
  const input = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500";
  const label = "block text-xs text-gray-400 mb-1 mt-3 font-medium";
  const card = "bg-slate-800/50 rounded-xl p-4 border border-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-teal-100">🚀 Kelola Proyek</h1>
            <Link href="/admin" className="text-xs text-slate-400 hover:text-teal-300 transition-colors">
              ← Kembali ke editor CV
            </Link>
          </div>
          <div className="flex gap-2">
            <Link href={`/${lang}`} target="_blank" className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">View Site →</Link>
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

        {/* Language picker. Memilih kolom isi mana yang sedang diisi — bukan
            bahasa tampilan situs. Kolom netral bahasa (nama file, URL, nama
            teknologi) tidak berubah saat pilihan ini diganti. */}
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

        {/* Projects */}
        <section className={card}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">
              Daftar Proyek ({data.projects.length})
            </h2>
            <button onClick={addProj} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>

          {data.projects.length === 0 && (
            <p className="text-sm text-gray-500">
              Belum ada project. Tekan &quot;+ Add&quot; untuk menambah.
            </p>
          )}

          {data.projects.map((proj, i) => {
            // Deskripsi boleh string tunggal atau array; locArr menyeragamkannya
            // supaya textarea tidak tampil kosong untuk bentuk string.
            const descArr = locArr(proj, "description").join(DESC_SEP);
            const longArr = locArr(proj, "long_description").join(DESC_SEP);
            return (
              <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                  <button onClick={() => removeProj(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>

                <label className={label}>Name</label>
                <input className={input} value={loc(proj, "name")} placeholder={ph(proj, "name")} onChange={(e) => updateProj(i, "name", e.target.value)} />
                {/* Slug URL dihitung dari nama INGGRIS, jadi mengubah nama di tab
                    ID tidak mengubah alamat halaman detail project. */}
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

                {/* Ringkasan: yang tampil di kartu halaman depan. Satu kalimat
                    per baris, tampil utuh tanpa dipotong. */}
                <label className={label}>Description — ringkasan untuk kartu (satu paragraf per baris)</label>
                <textarea
                  className={input}
                  rows={2}
                  value={descArr}
                  placeholder={phArr(proj, "description")}
                  onChange={(e) => updateProjDesc(i, "description", e.target.value)}
                  onBlur={() => trimProjDesc(i, "description")}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Tampil di kartu section Projects, tidak dipotong. Kosongkan untuk memakai paragraf pertama teks lengkap.
                </p>

                {/* Teks lengkap: yang tampil di halaman detail. */}
                <label className={label}>Long description — teks lengkap untuk halaman detail (satu paragraf per baris)</label>
                <textarea
                  className={input}
                  rows={5}
                  value={longArr}
                  placeholder={phArr(proj, "long_description")}
                  onChange={(e) => updateProjDesc(i, "long_description", e.target.value)}
                  onBlur={() => trimProjDesc(i, "long_description")}
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

        <p className="text-xs text-gray-500 mt-4">
          Perubahan baru tersimpan setelah menekan <strong className="text-gray-400">Save</strong>.
          URL halaman detail berubah kalau nama versi Inggris diubah.
        </p>
      </div>
    </div>
  );
}
