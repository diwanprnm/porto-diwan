/**
 * Section registry for the document page.
 *
 * Single source of truth: the nav renders from this list and `page.tsx` puts
 * the matching `id` on each `<section>`. Keep the two in step — a section
 * missing from here is simply not reachable from the nav.
 *
 * Order matters. It is the reading order of the page, and the scroll-spy uses
 * it to break ties when two sections cross the detection band at once.
 *
 * The labels are NOT here. They are per-language, so they live in
 * src/lib/i18n.ts (`sectionLabels`) — a nav label is UI text, and UI text has
 * exactly one home. This file stays language-neutral: ids, order, nothing else.
 */
export const SECTIONS = [
  { id: "about" },
  { id: "skills" },
  { id: "experience" },
  { id: "projects" },
  { id: "certifications" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
