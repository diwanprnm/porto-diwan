import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProfileData,
  descToArray,
  projectSlug,
  findProjectBySlug,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { projects } = await getProfileData();
  const proj = findProjectBySlug(projects, slug);
  if (!proj) return { title: "Project tidak ditemukan" };

  return {
    title: `${proj.name} — Diwan Purnama`,
    description: descToArray(proj.description)[0],
  };
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProfileData();
  const { projects, profile } = data;
  const proj = findProjectBySlug(projects, slug);

  if (!proj) notFound();

  // Project lain, untuk navigasi bawah. Dibuat sebagai tautan <Link> supaya
  // bisa diklik langsung, bukan cuma teks.
  const others = projects.filter((p) => projectSlug(p.name) !== slug);
  const description = descToArray(proj.description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-teal-300 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Semua project
        </Link>

        <header className="mt-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {proj.name}
          </h1>
          {proj.client && (
            <p className="mt-2 text-teal-400">{proj.client}</p>
          )}
        </header>

        {/* Screenshot besar. Rasio dikunci 16:9 supaya tidak ada layout shift,
            object-contain supaya tidak ada bagian yang terpotong. */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="relative aspect-video">
            <Image
              src={proj.image}
              alt={`${proj.name} interface`}
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        </div>

        {/* Aksi */}
        {(proj.live_url || proj.github_url) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {proj.live_url && (
              <a
                href={proj.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:translate-y-px text-white text-sm font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M9 5.25H6.75A1.5 1.5 0 005.25 6.75v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V15"
                  />
                </svg>
                Live demo
              </a>
            )}
            {proj.github_url && (
              <a
                href={proj.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:translate-y-px text-slate-200 text-sm font-medium border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1.1 1.5 1.1.9 1.6 2.4 1.1 3 .8.1-.6.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.2-2.6 5.1-5.1 5.4.4.4.7 1 .7 2v2.9c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                Repo
              </a>
            )}
          </div>
        )}

        {/* Deskripsi lengkap */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Tentang project
          </h2>
          <div className="space-y-4">
            {description.map((d, i) => (
              <p key={i} className="text-slate-300 leading-relaxed">
                {d}
              </p>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Tech stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {proj.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-teal-950/50 border border-teal-900/40 rounded-md text-teal-300 text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Project lain */}
        {others.length > 0 && (
          <section className="mt-16 pt-8 border-t border-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-5">
              Project lain
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {others.map((o) => (
                <Link
                  key={o.name}
                  href={`/projects/${projectSlug(o.name)}`}
                  className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-teal-500/40 transition-colors"
                >
                  <div className="relative h-12 w-20 shrink-0 rounded-md overflow-hidden bg-slate-950 border border-slate-800">
                    <Image
                      src={o.image}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover object-top"
                      sizes="80px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-teal-300 transition-colors truncate">
                      {o.name}
                    </p>
                    {o.client && (
                      <p className="text-xs text-slate-500 truncate">{o.client}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-800 text-xs text-slate-600">
          © {new Date().getFullYear()} {profile.name}
        </footer>
      </div>
    </div>
  );
}
