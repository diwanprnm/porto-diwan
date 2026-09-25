"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS } from "@/lib/sections";

type Variant = "rail" | "bar";

/**
 * Section navigation, in the two shapes the page needs.
 *
 * `rail` — the vertical list in the sidebar. The sidebar is sticky from `lg`
 * up, so this stays on screen the whole way down the page.
 * `bar` — a horizontal strip pinned to the top of the content column, shown
 * below `lg` only. On narrow screens the sidebar is a normal block that
 * scrolls away, so the rail nav would be gone by the time you needed it.
 *
 * Scroll-spy is enhancement, never a requirement: the anchors are plain
 * `href="#id"` links, so with no JS the nav still works. Without JS nothing is
 * highlighted, which is the honest state — the browser cannot tell us where
 * the reader is.
 */
export default function SectionNav({ variant = "rail" }: { variant?: Variant }) {
  const [active, setActive] = useState<string | null>(null);
  // Which sections currently cross the detection band. Kept across observer
  // callbacks because each callback only carries the entries that *changed*.
  const inBand = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (targets.length === 0) return;

    // A thin band across the upper viewport decides what is "being read":
    // whichever section crosses it wins. Sections are much taller than the
    // gaps between them, so mid-page the band is never empty.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inBand.current[entry.target.id] = entry.isIntersecting;
        }
        // First match in reading order = the topmost section in the band.
        const next = SECTIONS.find((s) => inBand.current[s.id]);
        if (next) setActive(next.id);
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (variant === "bar") {
    return (
      <nav
        aria-label="Sections"
        className="lg:hidden sticky top-0 z-20 -mx-6 md:-mx-10 mb-8 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 md:px-10 py-3"
      >
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  aria-current={on ? "location" : undefined}
                  onClick={() => setActive(s.id)}
                  className={`block rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    on
                      ? "border-teal-500/40 bg-teal-600/15 text-teal-300"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-teal-500/30 hover:text-teal-300"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Sections" className="mt-8 hidden lg:block">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Sections
      </h3>
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                onClick={() => setActive(s.id)}
                className={`group flex items-center gap-3 py-1.5 text-sm transition-colors ${
                  on ? "text-teal-400" : "text-slate-400 hover:text-teal-300"
                }`}
              >
                {/* The indicator rule grows on the active item — the same
                    hairline motif the section headings use. */}
                <span
                  aria-hidden="true"
                  className={`h-px shrink-0 transition-all duration-300 ${
                    on ? "w-6 bg-teal-500" : "w-3 bg-slate-700 group-hover:bg-teal-500/60"
                  }`}
                />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
