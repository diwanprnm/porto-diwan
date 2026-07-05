"use client";

import { useState, useEffect } from "react";

// Types (inline untuk singkat)
type ProfileData = {
  profile: {
    name: string;
    title: string;
    image: string;
    bio: string;
    about: string;
    contact: { location: string; email: string };
  };
  education: { school: string; degree: string; period: string };
  skills: string[];
  socials: { platform: string; url: string; icon: string }[];
  experience: {
    period: string;
    title: string;
    highlights: string[];
    skills: string[];
  }[];
  projects: {
    name: string;
    client: string;
    image: string;
    github_url: string;
    description: string | string[];
    skills: string[];
  }[];
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Failed to load.
      </div>
    );
  }

  // Helpers update
  const updateProfile = (k: string, v: string) =>
    setData({ ...data, profile: { ...data.profile, [k]: v } });
  const updateContact = (k: string, v: string) =>
    setData({ ...data, profile: { ...data.profile, contact: { ...data.profile.contact, [k]: v } } });
  const updateEducation = (k: string, v: string) =>
    setData({ ...data, education: { ...data.education, [k]: v } });

  // Skills (comma-separated input)
  const setSkills = (v: string) =>
    setData({ ...data, skills: v.split(",").map((s) => s.trim()).filter(Boolean) });

  // Socials
  const updateSocial = (i: number, k: string, v: string) => {
    const socials = [...data.socials];
    socials[i] = { ...socials[i], [k]: v };
    setData({ ...data, socials });
  };
  const addSocial = () =>
    setData({
      ...data,
      socials: [...data.socials, { platform: "", url: "", icon: "" }],
    });
  const removeSocial = (i: number) =>
    setData({ ...data, socials: data.socials.filter((_, idx) => idx !== i) });

  // Experience
  const updateExp = (i: number, k: string, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [k]: v };
    setData({ ...data, experience: exp });
  };
  const updateExpHighlights = (i: number, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], highlights: v.split("\\n").map((s) => s.trim()).filter(Boolean) };
    setData({ ...data, experience: exp });
  };
  const updateExpSkills = (i: number, v: string) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], skills: v.split(",").map((s) => s.trim()).filter(Boolean) };
    setData({ ...data, experience: exp });
  };
  const addExp = () =>
    setData({
      ...data,
      experience: [...data.experience, { period: "", title: "", highlights: [], skills: [] }],
    });
  const removeExp = (i: number) =>
    setData({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });

  // Projects
  const updateProj = (i: number, k: string, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], [k]: v };
    setData({ ...data, projects: proj });
  };
  const updateProjDesc = (i: number, v: string) => {
    const proj = [...data.projects];
    // Description bisa string atau array. Kita simpan sebagai array (split by newline)
    proj[i] = { ...proj[i], description: v.split("\\n").map((s) => s.trim()).filter(Boolean) };
    setData({ ...data, projects: proj });
  };
  const updateProjSkills = (i: number, v: string) => {
    const proj = [...data.projects];
    proj[i] = { ...proj[i], skills: v.split(",").map((s) => s.trim()).filter(Boolean) };
    setData({ ...data, projects: proj });
  };
  const addProj = () =>
    setData({
      ...data,
      projects: [...data.projects, { name: "", client: "", image: "", github_url: "", description: [], skills: [] }],
    });
  const removeProj = (i: number) =>
    setData({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });

  // Input style
  const input = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500";
  const label = "block text-xs text-gray-400 mb-1 mt-3";
  const card = "bg-slate-800/50 rounded-xl p-4 border border-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-teal-100">Admin Editor — CV</h1>
          <div className="flex gap-2">
            <a href="/" target="_blank" className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">View Site →</a>
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
            {saving ? "Saving..." : "Save & Revalidate"}
          </button>
          {msg && (
            <span className={msg.type === "ok" ? "text-teal-300 text-sm" : "text-red-300 text-sm"}>
              {msg.text}
            </span>
          )}
        </div>

        {/* Profile section */}
        <section className={card + " mb-4"}>
          <h2 className="text-lg font-semibold text-teal-200 mb-3">Profile</h2>
          <label className={label}>Name</label>
          <input className={input} value={data.profile.name} onChange={(e) => updateProfile("name", e.target.value)} />
          <label className={label}>Title</label>
          <input className={input} value={data.profile.title} onChange={(e) => updateProfile("title", e.target.value)} />
          <label className={label}>Image Path (e.g. /image/diwan2.png)</label>
          <input className={input} value={data.profile.image} onChange={(e) => updateProfile("image", e.target.value)} />
          <label className={label}>Bio (short tagline)</label>
          <textarea className={input} rows={2} value={data.profile.bio} onChange={(e) => updateProfile("bio", e.target.value)} />
          <label className={label}>About (longer description)</label>
          <textarea className={input} rows={5} value={data.profile.about} onChange={(e) => updateProfile("about", e.target.value)} />
          <label className={label}>Location</label>
          <input className={input} value={data.profile.contact.location} onChange={(e) => updateContact("location", e.target.value)} />
          <label className={label}>Email</label>
          <input className={input} value={data.profile.contact.email} onChange={(e) => updateContact("email", e.target.value)} />
        </section>

        {/* Education */}
        <section className={card + " mb-4"}>
          <h2 className="text-lg font-semibold text-teal-200 mb-3">Education</h2>
          <label className={label}>School</label>
          <input className={input} value={data.education.school} onChange={(e) => updateEducation("school", e.target.value)} />
          <label className={label}>Degree</label>
          <input className={input} value={data.education.degree} onChange={(e) => updateEducation("degree", e.target.value)} />
          <label className={label}>Period</label>
          <input className={input} value={data.education.period} onChange={(e) => updateEducation("period", e.target.value)} />
        </section>

        {/* Skills */}
        <section className={card + " mb-4"}>
          <h2 className="text-lg font-semibold text-teal-200 mb-3">Skills & Tools</h2>
          <label className={label}>Comma-separated</label>
          <input className={input} value={data.skills.join(", ")} onChange={(e) => setSkills(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">{data.skills.length} skills</p>
        </section>

        {/* Socials */}
        <section className={card + " mb-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-teal-200">Socials</h2>
            <button onClick={addSocial} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.socials.map((s, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className={input} placeholder="platform" value={s.platform} onChange={(e) => updateSocial(i, "platform", e.target.value)} />
              <input className={input} placeholder="url" value={s.url} onChange={(e) => updateSocial(i, "url", e.target.value)} />
              <input className={input} placeholder="/image/x.png" value={s.icon} onChange={(e) => updateSocial(i, "icon", e.target.value)} />
              <button onClick={() => removeSocial(i)} className="text-xs px-3 bg-red-900 hover:bg-red-800 rounded">✕</button>
            </div>
          ))}
        </section>

        {/* Experience */}
        <section className={card + " mb-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-teal-200">Experience</h2>
            <button onClick={addExp} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.experience.map((exp, i) => (
            <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <button onClick={() => removeExp(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
              <label className={label}>Period</label>
              <input className={input} value={exp.period} onChange={(e) => updateExp(i, "period", e.target.value)} />
              <label className={label}>Title</label>
              <input className={input} value={exp.title} onChange={(e) => updateExp(i, "title", e.target.value)} />
              <label className={label}>Highlights (gunakan \n untuk newline baru)</label>
              <textarea className={input} rows={4} value={exp.highlights.join("\\n")} onChange={(e) => updateExpHighlights(i, e.target.value)} />
              <label className={label}>Skills (comma-separated)</label>
              <input className={input} value={exp.skills.join(", ")} onChange={(e) => updateExpSkills(i, e.target.value)} />
            </div>
          ))}
        </section>

        {/* Projects */}
        <section className={card + " mb-4"}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-teal-200">Projects</h2>
            <button onClick={addProj} className="text-sm bg-teal-800 hover:bg-teal-700 px-3 py-1 rounded">+ Add</button>
          </div>
          {data.projects.map((proj, i) => {
            const descArr = Array.isArray(proj.description) ? proj.description.join("\\n") : proj.description;
            return (
              <div key={i} className="bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">#{i + 1}</span>
                  <button onClick={() => removeProj(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <label className={label}>Name</label>
                <input className={input} value={proj.name} onChange={(e) => updateProj(i, "name", e.target.value)} />
                <label className={label}>Client</label>
                <input className={input} value={proj.client} onChange={(e) => updateProj(i, "client", e.target.value)} />
                <label className={label}>Image path</label>
                <input className={input} value={proj.image} onChange={(e) => updateProj(i, "image", e.target.value)} />
                <label className={label}>GitHub URL</label>
                <input className={input} value={proj.github_url} onChange={(e) => updateProj(i, "github_url", e.target.value)} />
                <label className={label}>Description (gunakan \n untuk bullet baru)</label>
                <textarea className={input} rows={3} value={descArr} onChange={(e) => updateProjDesc(i, e.target.value)} />
                <label className={label}>Skills (comma-separated)</label>
                <input className={input} value={proj.skills.join(", ")} onChange={(e) => updateProjSkills(i, e.target.value)} />
              </div>
            );
          })}
        </section>

        {/* Footer save */}
        <div className="mt-6 pb-10 flex gap-3">
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Save & Revalidate"}
          </button>
          <span className="text-xs text-gray-500 self-center">v{data.__meta?.version || "?"} · {data.__meta?.updated_at || ""}</span>
        </div>
      </div>
    </div>
  );
}