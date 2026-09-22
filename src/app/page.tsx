import Image from "next/image";
import Link from "next/link";
import {
  getProfileData,
  groupSkillsByCategory,
  descToArray,
  projectSlug,
} from "@/lib/data";

export const dynamic = "force-dynamic";

// Label mapping untuk kategori skill (lebih rapi)
const CAT_LABELS: Record<string, string> = {
  language: "Languages",
  framework: "Frameworks & Libraries",
  database: "Databases",
  devops: "DevOps & Tools",
  concept: "Concepts",
};

// Order kategori
const CAT_ORDER = ["language", "framework", "database", "devops", "concept"];

// Lebar tile per kategori. Peta tetap, disusun supaya kolomnya genap 12:
// 5+7 lalu 3+6+3. Kategori yang isinya lebih banyak dapat kolom lebih lebar.
// Kalau isi skill berubah lewat admin, tile-nya tetap aman, cuma bisa
// menyisakan kolom kosong di baris terakhir.
const CAT_SPAN: Record<string, string> = {
  language: "lg:col-span-5",
  framework: "lg:col-span-7",
  database: "lg:col-span-3",
  devops: "lg:col-span-6",
  concept: "lg:col-span-3",
};

export default async function Home() {
  const data = await getProfileData();
  const { profile, contact, education, skills, socials, experience, projects, languages } = data;
  const skillGroups = groupSkillsByCategory(skills);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white max-w-screen-2xl mx-auto">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="lg:w-[380px] w-full lg:sticky lg:top-0 lg:h-screen flex flex-col bg-slate-950/80 backdrop-blur border-r border-slate-800 p-8 lg:overflow-y-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Image
              src={profile.image}
              alt={profile.name}
              width={140}
              height={140}
              // Gambar disajikan dari /api/images/[id] dengan cache immutable.
              // Optimizer Next dilewati supaya isinya tidak diambil ulang tiap
              // request — lihat catatan di src/lib/db.ts dan api/images/[id].
              unoptimized
              className="rounded-2xl shadow-xl ring-2 ring-teal-500/20"
            />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-teal-500 rounded-full border-2 border-slate-950" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-white tracking-tight">
            {profile.name}
          </h1>
          <h2 className="text-sm text-teal-400 font-medium mt-1">
            {profile.title}
          </h2>
        </div>

        {/* Bio */}
        <p className="mt-5 text-slate-400 text-sm leading-relaxed text-center px-2">
          {profile.bio}
        </p>

        {/* Education */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Education
          </h3>
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <p className="text-sm font-medium text-slate-200">{education.school}</p>
            <p className="text-xs text-slate-400 mt-1">{education.degree}</p>
            <p className="text-xs text-teal-500 mt-1.5">{education.period}</p>
          </div>
        </div>

        {/* Languages */}
        {languages && languages.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Languages
            </h3>
            <div className="space-y-2">
              {languages.map((lang) => (
                <div key={lang.name} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">{lang.name}</span>
                  <span className="text-xs text-teal-400">{lang.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Socials */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Connect
          </h3>
          <div className="flex gap-3">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 rounded-lg hover:bg-teal-900/50 transition-colors group"
                title={s.platform}
              >
                <Image
                  src={s.icon}
                  alt={s.platform}
                  width={18}
                  height={18}
                  unoptimized
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-auto pt-8">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Contact
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                <span>{contact.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                <a href={`mailto:${contact.email}`} className="text-teal-400 hover:text-teal-300 transition-colors break-all">
                  {contact.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT CONTENT ── */}
      <main className="flex-1 lg:overflow-y-auto p-6 md:p-10 lg:p-12">
        {/* About */}
        <section className="mb-16">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
            About
          </h3>
          <p className="text-slate-400 leading-relaxed text-[15px] max-w-3xl">
            {profile.about}
          </p>
        </section>

        {/* Skills — bento grid, lebar tile mengikuti jumlah isi */}
        <section className="mb-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
              Skills & Tools
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {skills.length} total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {CAT_ORDER.map((cat, idx) => {
              const items = skillGroups[cat];
              if (!items || items.length === 0) return null;
              return (
                <div
                  key={cat}
                  className={`reveal reveal-d${(idx % 3) + 1} ${CAT_SPAN[cat]} h-full rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-teal-500/30`}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                      {CAT_LABELS[cat] || cat}
                    </h4>
                    <span className="text-xs text-slate-600 tabular-nums">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((s) => (
                      <span
                        key={s.name}
                        className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/70 rounded-md text-slate-300 text-sm transition-colors hover:border-teal-500/50 hover:text-teal-200"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Experience — Timeline */}
        <section className="mb-16">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
            Experience
          </h3>
          <div className="space-y-0">
            <div className="relative pl-8 border-l border-slate-700">
              {experience.map((exp, idx) => (
                <div key={idx} className="reveal tl-item mb-10 relative group">
                  {/* Timeline dot */}
                  <div className="tl-dot absolute -left-[41px] w-3 h-3 rounded-full border-2 border-slate-700 bg-slate-900" />

                  <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 hover:border-teal-500/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          {exp.title}
                        </h4>
                        <p className="text-sm text-teal-400">{exp.company}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap bg-slate-800 px-2 py-0.5 rounded-full">
                        {exp.period}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {exp.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-slate-400 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-teal-500">
                          {h}
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {exp.skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-teal-950/50 border border-teal-900/30 rounded text-teal-300 text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Projects — card ringkas: screenshot, nama, client, satu kalimat
            deskripsi, stack utama, plus tombol Live/Repo. Detail lengkap ada di
            /projects/[slug]. Seluruh bagian atas card menuju halaman detail. */}
        <section id="projects" className="mb-16 scroll-mt-6">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
              Projects
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {projects.length} shipped
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {projects.map((proj, idx) => {
              // Card cuma menampilkan 3 teknologi pertama; sisanya jadi "+N".
              const shown = proj.skills.slice(0, 3);
              const rest = proj.skills.length - shown.length;
              const href = `/projects/${projectSlug(proj.name)}`;
              const teaser = descToArray(proj.description)[0];
              // Ada baris tombol atau tidak menentukan padding bawah: tanpa
              // tombol, blok teks yang harus menutup kartu.
              const hasActions = Boolean(proj.live_url || proj.github_url);

              return (
                <article
                  key={proj.name}
                  className={`reveal reveal-d${(idx % 3) + 1} proj-card group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden`}
                >
                  {/* Bagian yang bisa diklik menuju halaman detail. Tombol
                      Live dan Repo sengaja DI LUAR <Link> ini: <a> tidak boleh
                      bersarang di dalam <a>. */}
                  <Link href={href} className="proj-link flex-1 flex flex-col">
                    {/* Screenshot. object-cover + object-top: tinggi kartu
                        seragam dan bagian atas screenshot (header/nav) ikut. */}
                    <div className="bg-slate-950 border-b border-slate-800 overflow-hidden">
                      <Image
                        src={proj.image}
                        alt={`${proj.name} interface`}
                        width={640}
                        height={360}
                        unoptimized
                        className="proj-shot h-[200px] w-full object-cover object-top"
                      />
                    </div>

                    <div className={`flex flex-1 flex-col p-5 ${hasActions ? "pb-0" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base font-bold text-white leading-snug group-hover:text-teal-300 transition-colors">
                          {proj.name}
                        </h4>
                        <svg
                          className="w-4 h-4 shrink-0 mt-1 text-slate-600 group-hover:text-teal-400 group-hover:translate-x-0.5 transition"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                      {proj.client && (
                        <p className="text-xs text-slate-500 mt-1">{proj.client}</p>
                      )}

                      {teaser && (
                        <p className="mt-3 text-[13px] text-slate-400 leading-relaxed line-clamp-2">
                          {teaser}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-teal-400">
                        {shown.map((skill, i) => (
                          <span key={skill} className="flex items-center gap-2">
                            {i > 0 && <span className="text-slate-700">·</span>}
                            {skill}
                          </span>
                        ))}
                        {rest > 0 && (
                          <span className="flex items-center gap-2">
                            <span className="text-slate-700">·</span>
                            <span className="text-slate-500">+{rest}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Aksi. Tombol Live hanya dirender kalau live_url terisi,
                      jadi tidak pernah ada tombol menuju link kosong. Project
                      tanpa link sama sekali tidak dapat baris aksi. */}
                  {(proj.live_url || proj.github_url) && (
                    <div className="mt-auto flex gap-2 p-5 pt-5">
                      {proj.live_url && (
                        <a
                          href={proj.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka demo ${proj.name}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 active:translate-y-px text-white text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M9 5.25H6.75A1.5 1.5 0 005.25 6.75v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V15" />
                          </svg>
                          Live demo
                        </a>
                      )}
                      {proj.github_url && (
                        <a
                          href={proj.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka kode ${proj.name} di GitHub`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:translate-y-px text-slate-200 text-sm font-medium border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1.1 1.5 1.1.9 1.6 2.4 1.1 3 .8.1-.6.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.2-2.6 5.1-5.1 5.4.4.4.7 1 .7 2v2.9c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
                          </svg>
                          Repo
                        </a>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-8 pb-4 border-t border-slate-800">
          © {new Date().getFullYear()} {profile.name}. Built with Next.js & Tailwind CSS.
        </footer>
      </main>
    </div>
  );
}