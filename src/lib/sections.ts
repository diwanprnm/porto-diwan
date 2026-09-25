/**
 * Section registry for the document page.
 *
 * Single source of truth: the nav renders from this list and `page.tsx` puts
 * the matching `id` on each `<section>`. Keep the two in step — a section
 * missing from here is simply not reachable from the nav.
 *
 * Order matters. It is the reading order of the page, and the scroll-spy uses
 * it to break ties when two sections cross the detection band at once.
 */
export const SECTIONS = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
