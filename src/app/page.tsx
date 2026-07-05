import Image from "next/image";
import { getProfileData, type ProfileData } from "@/lib/data";

// ISR — regenerate halaman tiap 60 detik untuk check perubahan content
// ID Query param ?secret=... juga bisa trigger on-demand revalidate dari admin
export const revalidate = 60;

// Normalize description ke array of strings (Metagama pakai string, lainnya pakai array)
function descToArray(desc: string | string[]): string[] {
  if (Array.isArray(desc)) return desc;
  return [desc];
}

export default async function Home() {
  const data: ProfileData = await getProfileData();
  const { profile, education, skills, socials, experience, projects } = data;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white max-w-screen-xl mx-auto">
      {/* LEFT SECTION */}
      <div className="lg:w-2/5 w-full lg:sticky lg:top-0 lg:self-start flex flex-col items-center justify-center bg-slate-950 p-10">
        <Image
          src={profile.image}
          alt="Profile"
          width={150}
          height={150}
          className="rounded-3xl shadow-2xl mb-4"
        />

        {/* Name & Title */}
        <h1 className="text-xl lg:text-2xl font-bold text-teal-100 mb-3">
          {profile.name}
        </h1>
        <h2 className="text-sm lg:text-md text-teal-400 font-medium mb-4">
          {profile.title}
        </h2>
        <p className="text-gray-400 text-base lg:text-xs leading-relaxed text-center">
          {profile.bio}
        </p>

        {/* Education */}
        <div className="mt-5 w-full">
          <h3 className="text-teal-300 font-semibold text-sm mb-3">Education</h3>
          <div className="text-gray-300 text-xs leading-relaxed">
            <p className="font-medium">{education.school}</p>
            <p>{education.degree}</p>
            <p className="text-gray-400">{education.period}</p>
          </div>
        </div>

        {/* Socials */}
        <div className="mt-5 w-full">
          <h3 className="text-teal-300 font-semibold text-sm mb-3">Socials</h3>
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image src={s.icon} alt={s.platform} width={10} height={10} />
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 w-full">
          <h3 className="text-teal-300 font-semibold text-sm mb-3">Contact</h3>
          <div className="text-gray-300 text-xs space-y-2">
            <p>
              📍 <span className="text-gray-400">{profile.contact.location}</span>
            </p>
            <p>
              ✉️{" "}
              <a
                href={`mailto:${profile.contact.email}`}
                className="hover:text-teal-400 transition"
              >
                {profile.contact.email}
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="w-full lg:w-3/5 lg:overflow-y-auto p-8 pb-20">
        {/* About */}
        <section className="mb-20 mt-10">
          <p className="text-gray-400 text-md leading-relaxed">{profile.about}</p>
        </section>

        {/* Skills & Tools */}
        <section className="mb-20">
          <div className="mt-10 w-full">
            <h3 className="text-3xl font-bold text-teal-200 mb-8 mt-8">
              Skills & Tools
            </h3>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-teal-900 rounded-xl text-teal-200 text-sm hover:bg-slate-700 transition"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="mb-30">
          <h3 className="text-3xl font-bold text-teal-200 my-8 mt-8">
            Experience
          </h3>
          <div className="space-y-6">
            <ol className="relative border-s border-gray-200 dark:border-gray-700">
              {experience.map((exp, idx) => (
                <li
                  key={idx}
                  className="mb-10 ms-4 hover:bg-slate-900 transition"
                >
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                  <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                    {exp.period}
                  </time>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-teal-100">
                    {exp.title}
                  </h3>
                  <div className="flex flex-wrap mx-4 mt-3">
                    <ul className="list-disc text-gray-300">
                      {exp.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {exp.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2 bg-teal-900 rounded-xl text-teal-200 text-sm hover:bg-slate-700 transition"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Projects */}
        <section>
          <h3 className="text-3xl font-bold text-teal-200 my-8">Projects</h3>
          <div className="grid gap-8">
            {projects.map((proj) => (
              <div
                key={proj.name}
                className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row">
                  {/* LEFT SIDE - IMAGE */}
                  <div className="md:w-1/3 w-full bg-slate-900 flex flex-col items-center justify-center p-6">
                    <Image
                      src={proj.image}
                      alt={proj.name}
                      width={400}
                      height={400}
                      className="rounded-xl object-contain hover:scale-105 transition-transform duration-300"
                    />
                    {proj.github_url && (
                      <a
                        href={proj.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-teal-800 text-teal-200 text-sm rounded-lg transition-colors duration-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1.1 1.5 1.1.9 1.6 2.4 1.1 3 .8.1-.6.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.2-2.6 5.1-5.1 5.4.4.4.7 1 .7 2v2.9c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
                        </svg>
                        <span>View on GitHub</span>
                      </a>
                    )}
                  </div>

                  {/* RIGHT SIDE - CONTENT */}
                  <div className="md:w-2/3 w-full p-6 flex flex-col justify-center">
                    {/* HEADER */}
                    <div className="mb-4">
                      <h4 className="text-2xl font-bold text-teal-100 tracking-wide">
                        {proj.name}
                      </h4>
                      <p className="text-gray-400 text-sm mt-1">{proj.client}</p>
                    </div>

                    {/* DESCRIPTION */}
                    <ul className="list-disc text-gray-300 pl-5 space-y-2 text-sm leading-relaxed">
                      {descToArray(proj.description).map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>

                    {/* SKILLS */}
                    <div className="flex flex-wrap gap-2 mt-6">
                      {proj.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 bg-teal-900/60 border border-teal-700 rounded-lg text-teal-200 text-xs font-medium hover:bg-teal-800/80 transition"
                        >
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
      </div>
    </div>
  );
}