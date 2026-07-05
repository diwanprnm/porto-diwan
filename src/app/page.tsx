import Image from "next/image";
import { getProfileData, groupSkillsByCategory, descToArray } from "@/lib/data";

export const revalidate = 60;

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

        {/* Skills — grouped by category */}
        <section className="mb-16">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
            Skills & Tools
          </h3>
          <div className="space-y-5">
            {CAT_ORDER.map((cat) => {
              const items = skillGroups[cat];
              if (!items || items.length === 0) return null;
              return (
                <div key={cat}>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                    {CAT_LABELS[cat] || cat}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((s) => (
                                          <span
                                            key={s.name}
                                            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 text-sm hover:border-teal-500/50 hover:text-teal-200 transition-all"
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
                <div key={idx} className="mb-10 relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[41px] w-3 h-3 rounded-full border-2 border-slate-700 bg-slate-900 group-hover:bg-teal-500 group-hover:border-teal-500 transition-colors" />

                  <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 hover:border-teal-500/30 transition-all">
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

        {/* Projects */}
        <section className="mb-16">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-teal-500 rounded-full" />
            Projects
          </h3>
          <div className="grid gap-6">
            {projects.map((proj) => (
              <div key={proj.name} className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden hover:border-teal-500/30 transition-all group">
                <div className="flex flex-col md:flex-row">
                  {/* Project image */}
                  <div className="md:w-[280px] shrink-0 bg-slate-950 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800">
                    <Image
                      src={proj.image}
                      alt={proj.name}
                      width={300}
                      height={200}
                      className="rounded-lg object-contain group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    {proj.github_url && (
                      <a
                        href={proj.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-teal-900/60 text-teal-300 text-sm rounded-lg transition-colors border border-slate-700 hover:border-teal-500/50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1.1 1.5 1.1.9 1.6 2.4 1.1 3 .8.1-.6.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.2-2.6 5.1-5.1 5.4.4.4.7 1 .7 2v2.9c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
                        </svg>
                        <span>View Code</span>
                      </a>
                    )}
                  </div>

                  {/* Project details */}
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <h4 className="text-lg font-bold text-white">{proj.name}</h4>
                    {proj.client && (
                      <p className="text-xs text-teal-400 mt-0.5">{proj.client}</p>
                    )}

                    <ul className="mt-3 space-y-1">
                      {descToArray(proj.description).map((d, i) => (
                        <li key={i} className="text-sm text-slate-400 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-teal-500">
                          {d}
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {proj.skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-teal-950/50 border border-teal-900/30 rounded text-teal-300 text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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