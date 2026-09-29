/**
 * Locale primitives + the UI dictionary.
 *
 * This is the single source of truth for two things:
 *   1. Which locales exist, and which one a URL prefix means.
 *   2. Every user-visible UI string on the public site.
 *
 * Why the strings live here and not inline in the pages: the same word has to
 * agree in two places (the nav rail and the section heading, the card and its
 * aria-label). Two copies drift, and a drifting copy is invisible — the page
 * still renders, just inconsistently. One copy cannot drift.
 *
 * Type-safety note: `Dict` is derived from the English object, and the
 * Indonesian object is annotated with it. That means a missing or misspelled
 * key in either language is a `tsc` error, not a blank label discovered in
 * production. Do not add `as const` to `en` — that would freeze each value to a
 * literal type and force the Indonesian side to be identical, which is the
 * opposite of the point.
 *
 * Note the deliberate split from `src/lib/pure.mjs`: the fallback rule
 * ("Indonesian falls back to English when empty") is a pure function with a
 * real boundary case, so it lives there and is covered by `npm test`. This file
 * is TypeScript because the dictionary's value is in the type checker, which
 * `node --test` cannot run — see the note at the top of pure.mjs for why that
 * boundary is drawn where it is.
 */

import type { SectionId } from "./sections";

export type Locale = "en" | "id";

/**
 * The locales the site serves. Typed `Locale[]`, so a typo here is a compile
 * error — the array is checked against the type, and the type is the truth.
 */
export const LOCALES: readonly Locale[] = ["en", "id"];

/**
 * Where a bare `/` sends the visitor. English, so an international visitor
 * lands on something readable without choosing.
 */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Narrow an arbitrary string (a URL segment, a header) to a Locale.
 *
 * A type guard rather than a boolean: callers need the narrowed value, e.g.
 * `const locale = isLocale(raw) ? raw : DEFAULT_LOCALE`. Without the guard,
 * `raw` stays `string | null` and every use site needs a cast.
 */
export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "id";
}

// ── The dictionary ─────────────────────────────────────────────────────────

const en = {
  // Section navigation. `sec*` are the short nav labels; `heading*` are the
  // larger headings in the content column. They mostly coincide, but they are
  // separate slots on purpose — "Skills" fits a nav rail where "Skills & Tools"
  // does not, and translating one should not silently change the other.
  navAria: "Sections",
  navSections: "Sections",
  secAbout: "About",
  secSkills: "Skills",
  secExperience: "Experience",
  secProjects: "Projects",
  secCerts: "Certifications",

  headingAbout: "About",
  headingSkills: "Skills & Tools",
  headingExperience: "Experience",
  headingProjects: "Projects",
  headingCerts: "Certifications",

  // Detail cards beside the About text.
  detailsAria: "Details",
  cardEducation: "Education",
  cardLanguages: "Languages",
  cardConnect: "Connect",
  cardContact: "Contact",

  // Skill categories. Keys match the `category` values in the stored data;
  // see CATEGORY_KEYS below.
  catLanguage: "Languages",
  catFramework: "Frameworks & Libraries",
  catDatabase: "Databases",
  catDevops: "DevOps & Tools",
  catConcept: "Concepts",

  // Counts and actions. `{n}` / `{name}` / `{year}` are filled by format().
  skillsTotal: "{n} total",
  projectsShipped: "{n} shipped",
  certsTotal: "{n} total",
  liveDemo: "Live demo",
  repo: "Repo",
  verifyCredential: "Verify credential",

  // Accessible names. These are read aloud, never seen, so they carry a full
  // sentence where the visible label is two words.
  ariaOpenDemo: "Open {name} demo",
  ariaOpenCode: "Open {name} source on GitHub",
  ariaVerify: "Verify {name}",

  // Project detail page.
  backToProjects: "All projects",
  aboutProject: "About this project",
  techStack: "Tech stack",
  otherProjects: "Other projects",

  // Document metadata and the not-found case.
  metaTitle: "Diwan Purnama — Fullstack Developer",
  metaDescription:
    "Portfolio & CV of Diwan Purnama, a Fullstack Developer specializing in Next.js, Laravel, and .NET.",
  projectNotFound: "Project not found",
  languageSwitchAria: "Language",

  footer: "© {year} {name}. Built with Next.js & Tailwind CSS.",
  projectImageAlt: "{name} interface",
};

export type Dict = typeof en;

const id: Dict = {
  navAria: "Bagian",
  navSections: "Bagian",
  secAbout: "Tentang",
  secSkills: "Keahlian",
  secExperience: "Pengalaman",
  secProjects: "Proyek",
  secCerts: "Sertifikasi",

  headingAbout: "Tentang",
  headingSkills: "Keahlian & Tools",
  headingExperience: "Pengalaman",
  headingProjects: "Proyek",
  headingCerts: "Sertifikasi",

  detailsAria: "Detail",
  cardEducation: "Pendidikan",
  cardLanguages: "Bahasa",
  cardConnect: "Terhubung",
  cardContact: "Kontak",

  catLanguage: "Bahasa Pemrograman",
  catFramework: "Framework & Library",
  catDatabase: "Basis Data",
  catDevops: "DevOps & Tools",
  catConcept: "Konsep",

  skillsTotal: "{n} total",
  projectsShipped: "{n} proyek",
  certsTotal: "{n} total",
  liveDemo: "Demo langsung",
  repo: "Repo",
  verifyCredential: "Verifikasi kredensial",

  ariaOpenDemo: "Buka demo {name}",
  ariaOpenCode: "Buka kode {name} di GitHub",
  ariaVerify: "Verifikasi {name}",

  backToProjects: "Semua proyek",
  aboutProject: "Tentang proyek ini",
  techStack: "Tech stack",
  otherProjects: "Proyek lain",

  metaTitle: "Diwan Purnama — Fullstack Developer",
  metaDescription:
    "Portofolio & CV Diwan Purnama, Fullstack Developer yang berfokus pada Next.js, Laravel, dan .NET.",
  projectNotFound: "Proyek tidak ditemukan",
  languageSwitchAria: "Bahasa",

  footer: "© {year} {name}. Dibuat dengan Next.js & Tailwind CSS.",
  projectImageAlt: "Antarmuka {name}",
};

export const DICT: Record<Locale, Dict> = { en, id };

/**
 * Fill `{placeholder}` slots in a dictionary string.
 *
 * Unknown keys become an empty string rather than throwing or leaking the
 * literal `{n}` into the page. A missing variable is a bug, but it should not
 * be a crash on a public page, and an empty slot is easier to spot than a
 * template marker nobody recognises.
 */
export function format(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? "")
  );
}

/**
 * Section id → the dictionary key holding its nav label.
 *
 * Both sides are typed (`SectionId` and `keyof Dict`), so adding a section to
 * `SECTIONS` without a label is a compile error rather than a nav item that
 * renders blank.
 */
const SECTION_KEYS: Record<SectionId, keyof Dict> = {
  about: "secAbout",
  skills: "secSkills",
  experience: "secExperience",
  projects: "secProjects",
  certifications: "secCerts",
};

/**
 * The nav labels for one locale, keyed by section id.
 *
 * Written out longhand rather than built with a loop and a cast: the explicit
 * object is what makes a missing section a type error, and five lines is not
 * worth losing that for.
 */
export function sectionLabels(lang: Locale): Record<SectionId, string> {
  const d = DICT[lang];
  return {
    about: d[SECTION_KEYS.about],
    skills: d[SECTION_KEYS.skills],
    experience: d[SECTION_KEYS.experience],
    projects: d[SECTION_KEYS.projects],
    certifications: d[SECTION_KEYS.certifications],
  };
}

/**
 * Skill category → dictionary key. Keys match the `category` values stored in
 * the data (`language`, `framework`, …).
 */
const CATEGORY_KEYS: Record<string, keyof Dict> = {
  language: "catLanguage",
  framework: "catFramework",
  database: "catDatabase",
  devops: "catDevops",
  concept: "catConcept",
};

/**
 * Label for a skill category tile.
 *
 * An unrecognised category falls back to its raw value instead of a blank
 * tile: the admin editor lets a category be typed freely, so a new one shows up
 * as itself (readable, if untranslated) rather than as nothing.
 */
export function categoryLabel(lang: Locale, category: string): string {
  const key = CATEGORY_KEYS[category];
  return key ? DICT[lang][key] : category;
}
