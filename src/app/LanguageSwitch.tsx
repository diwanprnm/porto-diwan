"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n";
import { swapLocalePath } from "@/lib/pure.mjs";

/**
 * The EN ⇄ ID switch.
 *
 * Rendered as real <Link>s, not a button with a router call: they are
 * navigations between two URLs, so they should be openable in a new tab,
 * visible to crawlers as links between the translations, and working with no
 * JavaScript. The active language is marked `aria-current`, which is the
 * accessible way to say "you are here" in a set of alternatives.
 *
 * The path rewriting itself lives in pure.mjs (`swapLocalePath`), because its
 * two boundary cases are the kind that only show up when clicked — and there
 * they are covered by `npm test` instead of by hoping. See the note there.
 */
export default function LanguageSwitch({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname() || `/${current}`;

  return (
    <div
      className="mt-5 flex items-center justify-center gap-1"
      role="group"
      aria-label={label}
    >
      {LOCALES.map((locale) => {
        const on = locale === current;
        return (
          <Link
            key={locale}
            href={swapLocalePath(pathname, locale, LOCALES)}
            hrefLang={locale}
            aria-current={on ? "true" : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              on
                ? "bg-teal-600/20 text-teal-300 ring-1 ring-inset ring-teal-500/40"
                : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
