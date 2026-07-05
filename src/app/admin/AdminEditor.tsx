"use client";

import { useState, useEffect } from "react";

type Contact = { location: string; email: string; phone: string; website: string };
type Education = { school: string; degree: string; period: string; gpa: string };
type Skill = { name: string; category: string };
type Social = { platform: string; url: string; icon: string };
type Experience = { period: string; title: string; company: string; highlights: string[]; skills: string[] };
type Project = { name: string; client: string; image: string; github_url: string; description: string | string[]; skills: string[] };
type Language = { name: string; level: string };

type ProfileData = {
  profile: { name: string; title: string; image: string; bio: string; about: string };
  contact: Contact;
  education: Education;
  skills: Skill[];
  socials: Social[];
  experience: Experience[];
  projects: Project[];
  languages?: Language[];
  __meta: { version: number; updated_at: string };
};

export default function AdminEditor() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const r = res.ok ? await res.json() : await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: `✓ Saved (v${r.version}). Halaman CV sudah di-update.` });
      } else {
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

  // ── Setters ──
  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) => setData({ ...data, [k]: v });
  const setProfile = (k: keyof ProfileData["profile"], v: string) =>
    setData({ ...data, profile: { ...data.profile, [k]: v } });
  const setContact = (k: keyof Contact, v: string) =>
    setData({ ...data, contact: { ...data.contact, [k]: v } });
  const setEdu = (k: keyof Education, v: string) =>
    setData({ ...data, education: { ...data.education, [k]: v } });

  // Skills: array of Skill → save as JSON string for display, parse on save
  const skillsStr = JSON.stringify(data.skills);
  const setSkillsRaw = (v: string) => {
    try {
      const parsed = JSON.parse(v) as Skill[];
      setData({ ...data, skills: parsed });
    } catch {
      // invalid JSON, ignore
    }
  };

  // Experience
  const setExp = (i: number, k: keyof Experience, v: string | string[]) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [k]: v };
    setData({ ...data, experience: exp });
  };
  const setExpHighlights = (i: number, v: string) =>
    setExp(i, "highlights", v.split("\\n").map((s) => s.trim()).filter(Boolean));
  const setExpSkills = (i: number, v: string) =>
    setExp(i, "skills", v.split(",").map((s) => s.trim()).filter(Boolean));
  const addExp = () =>
    setData({ ...data, experience: [...data.experience, { period: "", title: "", company: "", highlights: [], skills: [] }] });
  const removeExp = (i: number) =>
    setData({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });

  // Projects
  const setProj = (i: number, k: keyof Project, v: string | string[]) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [k]: v };
    setData({ ...data, projects: proj });
  };
  const setProjDesc = (i: number, v: string) =>
    setProj(i, "description", v.split("\\n").map((s) => s.trim()).filter(Boolean));
  const setProjSkills = (i: number, v: string) =>
    setProj(i, "skills", v.split(",").map((s) => s.trim()).filter(Boolean));
  const addProj = () =>
    setData({ ...data, projects: [...data.projects, { name: "", client: "", image: "", github_url: "", description: [], skills: [] }] });
  const removeProj = (i: number) =>
    setData({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });

  // Socials
  const setSocial = (i: number, k: keyof Social, v: string) => {
    const s = [...data.socials];
    s[i] = { ...s[i], [k]: v };
    setData({ ...data, socials: s });
  };
  const addSocial = () =>
    setData({ ...data, socials: [...data.socials, { platform: "", url: "", icon: "" }] });
  const removeSocial = (i: number) =>
    setData({ ...data, socials: data.socials.filter((_, idx) => idx !== i) });

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
            <a href="/" target="_blank" className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">View Site →</a>
            <button onClick={logout} className="px-3 py-1.5 text-sm bg-red-900 hover:bg-red-800 rounded-lg">Logout</button>
          </div>
        </div>

        {/* Save bar */}
        <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur py-3 mb-4 flex items-center gap-3 border-b border-slate-800">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm font-medium disabled:opacity-50 transition">
            {saving ? "Saving..." : "💾 Save & Revalidate"}
          </button>
          {msg && <span className={`text-sm ${msg.type === "ok" ? "text-teal-300" : "text-red-300"}`}>{msg.text}</span>}
          <span className="ml-auto text-xs text-gray-500">v{data.__meta?.version || "?"} · {data.__meta?.updated_at ? new Date(data.__meta.updated_at).toLocaleString() : ""}</span>
        </div>

        {/* Profile */}
        <section className={card}>
          <h2 className="text-base font-semibold text-teal-200 mb-3">👤 Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Name</label>
              <input className={input} value={data.profile.name} onChange={(e) => setProfile("name", e.target.value)} />
            </div>
            <div>
              <label className={label}>Title</label>
              <input className={input} value={data.profile.title} onChange={(e) => setProfile("title", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Image Path (e.g. /image/diwan2.png)</label>
              <input className={input} value={data.profile.image} onChange={(e) => setProfile("image", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Bio (short tagline)</label>
              <textarea className={input} rows={2} value={data.profile.bio} onChange={(e) => setProfile("bio", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>About (full description)</label>
              <textarea className={input} rows={4} value={data.profile.about} onChange={(e) => setProfile("about", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={card + " mt-4"}>
          <h2 className="text-base font-semibold text-teal-200 mb-3">📞 Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Location</label>
              <input className={input} value={data.contact.location} onChange={(e) => setContact("location", e.target.value)} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={data.contact.email} onChange={(e) => setContact("email", e.target.value)} />
            </div>
            <div>
              <label className={label}>Phone (optional)</label>
              <input className={input} value={data.contact.phone} onChange={(e) => setContact("phone", e.target.value)} />
            </div>
            <div>
              <label className={label}>Website (optional)</label>
              <input className={input} value={data.contact.website} onChange={(e) => setContact("website", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Education */}
        <section className={card + " mt-4"}>
          <h2 className="text-base font-semibold text-teal-200 mb-3">🎓 Education</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>School</label>
              <input className={input} value={data.education.school} onChange={(e) => setEdu("school", e.target.value)} />
            </div>
            <div>
              <label className={label}>Period</label>
              <input className={input} value={data.education.period} onChange={(e) => setEdu("period", e.target.value)} />
            </div>
            <div>
              <label className={label}>Degree</label>
              <input className={input} value={data.education.degree} onChange={(e) => setEdu("degree", e.target.value)} />
            </div>
            <div>
              <label className={label}>GPA (optional)</label>
              <input className={input} value={data.education.gpa} onChange={(e) => setEdu("gpa", e.target.value)} placeholder="e.g. 3.85/4.00" />
            </div>
          </div>
        </section>

        {/* Skills — JSON editor */}
        <section className={card + " mt-4"}>
          <h2 className="text-base font-semibold text-teal-200 mb-3">🛠️ Skills & Tools</h2>
          <p className="text-xs text-gray-500 mb-2">
            Edit skills sebagai JSON array. Gunakan format: name + category per skill.
          </p>
          <textarea
            className={input + " font-mono text-xs"}
            rows={6}
            value={JSON.stringify(data.skills, null, 2)}
            onChange={(e) => setSkillsRaw(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">{data.skills.length} skills · categories: {[...new Set(data.skills.map((s) => s.category))].join(", ")}</p>
        </section>

        {/* Socials */}
        <section className={card + " mt-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-teal-200">🔗 Socials</h2>
            <button onClick={addSocial} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.socials.map((s, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input className={input} placeholder="platform" value={s.platform} onChange={(e) => setSocial(i, "platform", e.target.value)} />
              <input className={input} placeholder="url" value={s.url} onChange={(e) => setSocial(i, "url", e.target.value)} />
              <input className={input} placeholder="/image/icon.png" value={s.icon} onChange={(e) => setSocial(i, "icon", e.target.value)} />
              <button onClick={() => removeSocial(i)} className="shrink-0 px-3 py-2 bg-red-900 hover:bg-red-800 rounded text-xs">✕</button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={label}>Period</label>
                  <input className={input} value={exp.period} onChange={(e) => setExp(i, "period", e.target.value)} placeholder="October 2024 — Present" />
                </div>
                <div>
                  <label className={label}>Company</label>
                  <input className={input} value={exp.company} onChange={(e) => setExp(i, "company", e.target.value)} placeholder="PT Company Name" />
                </div>
              </div>
              <div className="mt-2">
                <label className={label}>Title</label>
                <input className={input} value={exp.title} onChange={(e) => setExp(i, "title", e.target.value)} placeholder="Fullstack Developer" />
              </div>
              <div className="mt-2">
                <label className={label}>Highlights (\\n untuk baris baru)</label>
                <textarea className={input} rows={3} value={exp.highlights.join("\\n")} onChange={(e) => setExpHighlights(i, e.target.value)} />
              </div>
              <div className="mt-2">
                <label className={label}>Skills (comma-separated)</label>
                <input className={input} value={exp.skills.join(", ")} onChange={(e) => setExpSkills(i, e.target.value)} />
              </div>
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
            const descArr = Array.isArray(proj.description) ? proj.description.join("\\n") : proj.description;
            return (
              <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                  <button onClick={() => removeProj(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={label}>Name</label>
                    <input className={input} value={proj.name} onChange={(e) => setProj(i, "name", e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Client</label>
                    <input className={input} value={proj.client} onChange={(e) => setProj(i, "client", e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Image path</label>
                    <input className={input} value={proj.image} onChange={(e) => setProj(i, "image", e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>GitHub URL</label>
                    <input className={input} value={proj.github_url} onChange={(e) => setProj(i, "github_url", e.target.value)} />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={label}>Description (\\n untuk baris baru)</label>
                  <textarea className={input} rows={3} value={descArr} onChange={(e) => setProjDesc(i, e.target.value)} />
                </div>
                <div className="mt-2">
                  <label className={label}>Skills (comma-separated)</label>
                  <input className={input} value={proj.skills.join(", ")} onChange={(e) => setProjSkills(i, e.target.value)} />
                </div>
              </div>
            );
          })}
        </section>

        {/* Footer save */}
        <div className="mt-6 pb-10 flex gap-3">
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm font-medium disabled:opacity-50 transition">
            💾 {saving ? "Saving..." : "Save & Revalidate"}
          </button>
        </div>
      </div>
    </div>
  );
}