import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { looksLikeFile } from "@/lib/pure.mjs";

/**
 * Locale routing.
 *
 * The site is served from `/[lang]/...`. This middleware does the two jobs that
 * have to happen before a page renders:
 *
 *   1. Send a bare path to a locale, so no URL is ever served without one.
 *   2. Tell the root layout which language it is rendering, via a request
 *      header, so `<html lang>` is right.
 *
 * What is deliberately NOT done here: rewriting. A rewrite would let `/` and
 * `/en` show the same page from one URL, but then the two languages are not
 * separately addressable — no bookmarkable Indonesian URL, no hreflang pair for
 * Google, and the CDN cannot tell the two apart. The whole point of the
 * `/en` + `/id` structure is that each language has its own address, so this
 * redirects instead.
 *
 * `x-locale` is set on the REQUEST, not the response. The layout reads it via
 * `headers()`; a response header would be for the browser, which does not need
 * it. It is overwritten unconditionally so a client cannot smuggle its own
 * value in and desynchronise `<html lang>` from the rendered text.
 */

/**
 * Paths that must never be locale-prefixed, either because they are application
 * routes with no locale (`/admin`, `/api`, `/healthz`) or because they are
 * static files served from `public/`.
 *
 * `/admin` is operator UI in one language; `/api` and `/healthz` are machine
 * endpoints. Next resolves static segments ahead of `[lang]`, so those would
 * work anyway — listing them here keeps them out of the redirect logic and
 * documents the boundary in one place.
 *
 * `looksLikeFile` handles the static-file half, and it lives in pure.mjs rather
 * than here so its boundary cases — "/" has no last segment to contain a dot —
 * are covered by `npm test` instead of by hoping. See the note there.
 */
const PASSTHROUGH = ["/api", "/admin", "/healthz", "/_next", "/favicon.ico"];

function isPassthrough(pathname: string): boolean {
  if (looksLikeFile(pathname)) return true;
  return PASSTHROUGH.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPassthrough(pathname)) return NextResponse.next();

  const segments = pathname.split("/");
  const first = segments[1];

  if (isLocale(first)) {
    // Already localized. Tag the request so the layout can read the language,
    // and leave the URL alone.
    const headers = new Headers(request.headers);
    headers.set("x-locale", first);
    return NextResponse.next({ request: { headers } });
  }

  // No locale in the URL. Send it to the default one, preserving the rest of
  // the path and the query string.
  //
  // This also covers `/projects/<slug>`, the shape every project URL had before
  // this change — those links are already out in the world (the admin, old
  // shares), and a 404 on all of them would be a self-inflicted outage. One
  // rule handles both, because both are just "a path with no locale".
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Run on everything except Next's own assets and the favicon. Requests for
   * `public/` files are also handled — see `looksLikeFile`, which is where that
   * rule lives, in plain JavaScript, on purpose.
   *
   * This matcher keeps the two hot asset prefixes from being inspected at all,
   * which is the cheap win; everything else goes through `isPassthrough`.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
