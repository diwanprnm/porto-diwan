import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      {/* LEFT SECTION */}
      <div className="w-2/5 flex flex-col items-center justify-start bg-slate-950 px-10 py-16 sticky top-0">
        {/* Profile Image */}
        <Image
          src="/image/diwan2.png"
          alt="Profile"
          width={200}
          height={200}
          className="rounded-3xl shadow-2xl mb-8"
        />

        {/* Name & Title */}
        <h1 className="text-5xl font-bold text-teal-100 mb-3">Diwan Purnama</h1>
        <h2 className="text-xl text-teal-400 font-medium mb-6">
          Fullstack Developer
        </h2>

        {/* Short Description */}
        <p className="text-gray-400 text-lg leading-relaxed text-center">
          I build scalable and modern web applications with clean architecture
          and strong focus on performance, usability, and maintainability.
        </p>

        {/* Education */}
        <div className="mt-10 w-full">
          <h3 className="text-teal-300 font-semibold text-lg mb-3">
            Education
          </h3>
          <div className="text-gray-300 text-sm leading-relaxed">
            <p className="font-medium">Politeknik Negeri Bandung (POLBAN)</p>
            <p>D3 Teknik Informatika</p>
            <p className="text-gray-400">2021 - 2024</p>
          </div>
        </div>

        {/* Skills & Tools */}

        {/* Socials */}
        <div className="mt-10 w-full">
          <h3 className="text-teal-300 font-semibold text-lg mb-3">Socials</h3>
          <div className="flex gap-4">
            <a
              href="https://github.com/diwanprnm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/image/github.png"
                alt="GitHub"
                width={30}
                height={30}
              />
            </a>
            <a
              href="https://www.instagram.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/image/instagram.png"
                alt="Instagram"
                width={30}
                height={30}
              />
            </a>
            <a
              href="https://www.linkedin.com/in/yourusername"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/image/linkedin.png"
                alt="LinkedIn"
                width={30}
                height={30}
              />
            </a>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 w-full">
          <h3 className="text-teal-300 font-semibold text-lg mb-3">Contact</h3>
          <div className="text-gray-300 text-sm space-y-2">
            <p>
              📍 <span className="text-gray-400">Bandung, Indonesia</span>
            </p>
            <p>
              ✉️{" "}
              <a
                href="mailto:diwanprnm77@gmail.com"
                className="hover:text-teal-400 transition"
              >
                diwanprnm77@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="w-3/5 overflow-y-scroll px-16 py-20 space-y-16">
        <section>
          <p className="text-gray-400 text-xl leading-relaxed">
            I am a software developer with over one year of experience and a
            strong interest in software development. I am proficient in using
            frameworks such as Next.js, Laravel, ASP.NET, .NET Core, and
            React.js to build efficient and scalable web applications. I am
            disciplined, work well in a team, and am accustomed to using Git for
            version control and collaboration. Over the past year, I have been
            involved in various web and software development projects, which
            have strengthened both my technical skills and soft skills.
          </p>
        </section>

        <div className="mt-10 w-full">
          <h3 className="text-3xl font-bold text-teal-200 mb-8 mt-8">
            Skills & Tools
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              "JavaScript",
              "TypeScript",
              "React",
              "Vue.js",
              "Next.js",
              "PHP",
              "Laravel",
              "CodeIgniter",
              "ASP.NET",
              ".NET Core",
              "Python",
              "Flask",
              "MySQL",
              "PostgreSQL",
              "TailwindCSS",
              "Bootstrap",
              "Git",
              "GitHub",
              "Gitlab",
              "Docker",
              "Scrum",
              "SonarQube",
              "Jira",
            ].map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 bg-slate-800 rounded-xl text-gray-300 text-sm hover:bg-slate-700 transition"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <section>
          <h3 className="text-3xl font-bold text-teal-200 mb-8 mt-8">
            Experience
          </h3>
          <div className="space-y-6">
            <ol className="relative border-s border-gray-200 dark:border-gray-700">
              <li className="mb-10 ms-4  hover:bg-slate-900 transition">
                <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border  border-white dark:border-gray-900 dark:bg-gray-700"></div>
                <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                  October 2024 - Present
                </time>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-teal-100">
                  Programmer — PT Nuansa Cerah Informasi
                </h3>
                <div className="flex flex-wrap mx-4 mt-3">
                  <ul className="list-disc text-gray-300 ">
                    <li>
                      Built and developed a Warehouse Management System (WMS)
                      web application based on RFID using Next.js.
                    </li>
                    <li>
                      Designed and implemented RFID-based WMS APIs with Next.js
                      to support warehouse system integration and automation.
                    </li>
                    <li>
                      Developed an Asset Management System website covering the
                      initial budgeting process using ASP.NET.
                    </li>
                    <li>
                      Created and optimized Asset Management System APIs using
                      .NET Core.
                    </li>
                    <li>
                      Conducted white-box testing and ensured code quality using
                      SonarQube and Cypress.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    "JavaScript",
                    "TypeScript",
                    "React",
                    "Next.js",
                    ".NET Core",
                    "Bootstrap",
                    "ASP.NET",
                    "SonarQube",
                    "Docker",
                    "Cypress",
                    "Jquery",
                    "Ajax",
                    "Github",
                    "PostgreSQL",
                    "TailwindCSS",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2  bg-teal-900 rounded-xl text-teal-200 text-sm hover:bg-slate-700 transition"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </li>

              <li className="mb-10 ms-4 hover:bg-slate-900 transition">
                <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                  October - December 2023
                </time>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-teal-100">
                  Backend Developer (Freelance) — PT AKSII
                </h3>
                <div className="flex flex-wrap mx-4 mt-3">
                  <ul className="list-disc text-gray-300">
                    <li>
                      Created API documentation to facilitate system integration
                      and development.
                    </li>
                    <li>
                      Fixed back-end issues for the Yayasan Sekar Telkom web
                      features.
                    </li>
                    <li>
                      Provided front-end support for the development of the
                      Yayasan Sekar Telkom website.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {["PHP", "Laravel", "Vue.js", "MySQL", "Git", "Gitlab"].map(
                    (skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2  bg-teal-900 rounded-xl text-teal-200 text-sm hover:bg-slate-700 transition"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </li>
              <li className="ms-4 hover:bg-slate-900 transition">
                <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                  July - October 2022
                </time>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-teal-100">
                  Frontend Developer (Internship) — PT AKSII
                </h3>
                <div className="flex flex-wrap mx-4">
                  <ul className="list-disc text-gray-300 mt-3">
                    <li>
                      Developed a web application to support the testing process
                      of telecommunications devices at PT Telkom using Laravel.
                    </li>
                    <li>
                      Created an OTP (One-Time Password) verification feature
                      via email to enhance system security.
                    </li>
                    <li>
                      Implemented device functionality testing features for
                      telecommunications equipment.
                    </li>
                    <li>
                      Developed a Pre-Function Test Technical Meeting feature to
                      support the testing process.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    "PHP",
                    "Laravel",
                    "MySQL",
                    "Git",
                    "Gitlab",
                    "Docker",
                    "Bootstrap",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2  bg-teal-900 rounded-xl text-teal-200 text-sm hover:bg-slate-700 transition"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </li>
            </ol>
          </div>
        </section>
        {/* Projects */}
        <section>
          <h3 className="text-3xl font-bold text-teal-200 mb-8">Projects</h3>
          <div className="grid  gap-8">
            <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                {/* LEFT SIDE - IMAGE */}
                <div className="md:w-1/3 w-full bg-slate-900 flex flex-col items-center justify-center p-6">
                  <Image
                    src="/image/webdiarvis.png"
                    alt="Project Web Diarvis"
                    width={400}
                    height={400}
                    className="rounded-xl object-contain hover:scale-105 transition-transform duration-300"
                  />

                  <a
                    href="https://github.com/diwanprnm/Diarvis/tree/diwan"
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
                </div>

                {/* RIGHT SIDE - CONTENT */}
                <div className="md:w-2/3 w-full p-6 flex flex-col justify-center">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h4 className="text-2xl font-bold text-teal-100 tracking-wide">
                      Project Web Diarvis
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Bandung Regency Government
                    </p>
                  </div>

                  {/* DESCRIPTION */}
                  <ul className="list-disc text-gray-300 pl-5 space-y-2 text-sm leading-relaxed">
                    <li>
                      Developed a regional asset management web application for
                      the Bandung Regency Government using the Laravel
                      framework.
                    </li>
                    <li>
                      Created the master data display for the regional asset
                      list.
                    </li>
                    <li>
                      Implemented Create, List, Delete, Update, and Detail
                      features for asset management.
                    </li>
                  </ul>

                  {/* SKILLS */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {[
                      "PHP",
                      "Laravel",
                      "PostgreSQL",
                      "Git",
                      "Gitlab",
                      "jQuery",
                      "Ajax",
                      "GitHub",
                    ].map((skill) => (
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

            <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                {/* LEFT SIDE - IMAGE */}
                <div className="md:w-1/3 w-full bg-slate-900 flex flex-col items-center justify-center p-6">
                  <Image
                    src="/image/tth.png"
                    alt="Project Web Diarvis"
                    width={400}
                    height={400}
                    className="rounded-xl object-contain hover:scale-105 transition-transform duration-300"
                  />

                  <a
                    href="https://github.com/diwanprnm/Telkom-Test-House"
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
                </div>

                {/* RIGHT SIDE - CONTENT */}
                <div className="md:w-2/3 w-full p-6 flex flex-col justify-center">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h4 className="text-2xl font-bold text-teal-100 tracking-wide">
                      Telkom Test House
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">PT Telkom</p>
                  </div>

                  {/* DESCRIPTION */}
                  <ul className="list-disc text-gray-300 pl-5 space-y-2 text-sm leading-relaxed">
                    <li>
                      A web application that supports the telecommunication
                      device testing process at PT. Telkom using Laravel.
                    </li>
                    <li>
                      Developed an email-based OTP (one-time password)
                      verification feature.
                    </li>
                    <li>Created a functional testing feature.</li>
                    <li>
                      Developed a Technical Meeting Pre-Functional Test feature.
                    </li>
                  </ul>

                  {/* SKILLS */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {[
                      "PHP",
                      "Laravel",
                      "MySQL",
                      "Git",
                      "Gitlab",
                      "Docker",
                      "Bootstrap",
                    ].map((skill) => (
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
            <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                {/* LEFT SIDE - IMAGE */}
                <div className="md:w-1/3 w-full bg-slate-900 flex flex-col items-center justify-center p-6">
                  <Image
                    src="/image/rankweb.png"
                    alt="Project Web Diarvis"
                    width={400}
                    height={400}
                    className="rounded-xl object-contain hover:scale-105 transition-transform duration-300"
                  />

                  <a
                    href="https://github.com/diwanprnm/PLN-Successor"
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
                </div>

                {/* RIGHT SIDE - CONTENT */}
                <div className="md:w-2/3 w-full p-6 flex flex-col justify-center">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h4 className="text-2xl font-bold text-teal-100 tracking-wide">
                      PLN Successor
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">PT PLN</p>
                  </div>

                  {/* DESCRIPTION */}
                  <ul className="list-disc text-gray-300 pl-5 space-y-2 text-sm leading-relaxed">
                    <li>
                      Developed a job promotion management web application at
                      PT. PLN using the Laravel framework.
                    </li>
                    <li>Designed the database structure.</li>
                    <li>Implemented the design using PostgreSQL.</li>
                    <li>Created API documentation.</li>
                  </ul>

                  {/* SKILLS */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {[
                      "React.js",
                      "PostgreSQL",
                      "Strapi",
                      "Git",
                      "Gitlab",
                      "GitHub",
                    ].map((skill) => (
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
            <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                {/* LEFT SIDE - IMAGE */}
                <div className="md:w-1/3 w-full bg-slate-900 flex flex-col items-center justify-center p-6">
                  <Image
                    src="/image/metagama.jpeg"
                    alt="Metagama Information System"
                    width={400}
                    height={400}
                    className="rounded-xl object-contain hover:scale-105 transition-transform duration-300"
                  />

                  <a
                    href=""
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
                </div>

                {/* RIGHT SIDE - CONTENT */}
                <div className="md:w-2/3 w-full p-6 flex flex-col justify-center">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h4 className="text-2xl font-bold text-teal-100 tracking-wide">
                      Metagama Information System
                    </h4>
                    <p className="text-gray-400 text-sm mt-1"></p>
                  </div>
                  <p className=" text-gray-300 space-y-2 text-sm leading-relaxed">
                    The Metagama Information System is a web-based application
                    designed to manage the administrative activities of Metagama
                    at POLBAN (Bandung State Polytechnic). The system was
                    developed to automate and computerize the data management
                    process, ensuring efficiency and accuracy in handling
                    administrative records. This application serves as a
                    platform to facilitate the management of participant and
                    group data for Metagama’s religious mentoring activities. It
                    includes features for managing participant data (adding,
                    updating, and deleting participant information) and group
                    data (adding, updating, and deleting group information).
                  </p>

                  {/* DESCRIPTION */}

                  {/* SKILLS */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {[
                      "PHP",
                      "Laravel",
                      "MySQL",
                      "Git",
                      "Gitlab",
                      "Docker",
                      "Bootstrap",
                    ].map((skill) => (
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
          </div>
        </section>
      </div>
    </div>
  );
}
