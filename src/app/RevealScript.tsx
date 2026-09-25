"use client";

import { useEffect } from "react";

/**
 * The whole motion engine. Adds `.is-in` to every `.reveal` as it enters the
 * viewport, once, then stops observing.
 *
 * Safety: the CSS that hides a `.reveal` is gated behind
 * `@media (scripting: enabled)`, so with no JS nothing is ever hidden. As a
 * second net, a timeout reveals everything if the observer misses a target
 * (layout shift, a print stylesheet, a browser quirk). Reveals are decoration;
 * content ships visible either way.
 */
export default function RevealScript() {
  useEffect(() => {
    const all = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));

    const targets = all();
    if (targets.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    targets.forEach((el) => observer.observe(el));

    // Net: nothing stays hidden for longer than 2s.
    const safety = window.setTimeout(() => {
      all().forEach((el) => el.classList.add("is-in"));
    }, 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return null;
}
