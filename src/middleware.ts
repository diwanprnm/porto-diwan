import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { looksLikeFile, localePrefix } from "@/lib/pure.mjs";

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
 *
 * WHICH locale a bare path goes to is a stored preference the operator sets at
 * `/admin` (see src/lib/settings.ts). This middleware cannot read that table —
 * it runs on the Edge runtime, where the `pg` driver is not available — so it
 * asks the Node-runtime route that can, at `/api/settings/default-locale`. If
 * that answer cannot be had, the site falls back to `DEFAULT_LOCALE` and stays
 * up; a redirect target that is merely the wrong language beats an outage.
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
 * This list also keeps the lookup below from recursing: the lookup fetches
 * `/api/settings/default-locale`, and that request re-enters this middleware.
 * It stops at the first line of `isPassthrough`. Adding a locale-prefixed path
 * to that route, or removing `/api` from this list, would make the middleware
 * fetch itself until the platform kills the request.
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

// `localePrefix` — the "does this path already carry a locale?" rule — is
// imported from pure.mjs rather than written here, because its boundary case is
// the one that decides whether a page renders or 404s: `/english-notes` must
// not read as "en" followed by "/glish-notes". There it is covered by
// `npm test` instead of by hoping. See the note there.

// ── The stored default, as seen from the Edge ───────────────────────────────

/**
 * How long an answer is reused before asking again.
 *
 * This has to be a time-based refresh, not an invalidation on write: the write
 * happens in /admin, in a different process than this middleware, and there may
 * be several of each. A short TTL is what makes the setting converge everywhere
 * without pub/sub. Ten seconds is short enough that an operator who changes it
 * and reloads sees the change, and long enough that the redirect path costs one
 * lookup per process per window rather than one per request.
 */
const LOCALE_CACHE_TTL_MS = 10_000;

/**
 * The lookup must not be able to hold a redirect hostage.
 *
 * `/api/settings/default-locale` reads Postgres. A database that is unreachable
 * can make that query hang for a long time, and this middleware runs on the
 * path of EVERY request that has no locale — so without a deadline, a database
 * outage would turn into a site that hangs on every bare URL instead of a site
 * that redirects to the wrong language. On timeout the answer is
 * `DEFAULT_LOCALE`, which is cached like any other, so the cost is paid once
 * per window rather than per request.
 */
const LOCALE_LOOKUP_TIMEOUT_MS = 1_500;

let localeCache: { value: Locale; at: number } | null = null;

/**
 * Where the lookup is sent: this same server, on its own listening port.
 *
 * Deliberately NOT built from `request.nextUrl.origin`, which is the obvious
 * choice and the wrong one. That origin is whatever the browser asked for — the
 * public hostname, behind whatever proxy and TLS terminator sits in front. The
 * request would leave the container and come back through that edge, and any
 * failure along the way (DNS, certificate, proxy routing, a firewall that
 * blocks hairpin traffic) would be silent: the middleware falls back to
 * `DEFAULT_LOCALE`, so the symptom is "the setting doesn't work" with nothing
 * in the logs. Loopback inside the container has none of those failure modes.
 *
 * The port matches what the server listens on. Compose maps `APP_PORT:3000`
 * (docker-compose.prod.yml), so the container is always 3000; `next dev`
 * defaults to 3000 as well. `PORT` is honoured first in case the app is ever
 * run on something else.
 */
function internalOrigin(): string {
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

async function storedDefaultLocale(): Promise<Locale> {
  const now = Date.now();
  if (localeCache && now - localeCache.at < LOCALE_CACHE_TTL_MS) {
    return localeCache.value;
  }

  let value = DEFAULT_LOCALE;
  try {
    const res = await fetch(`${internalOrigin()}/api/settings/default-locale`, {
      cache: "no-store",
      signal: AbortSignal.timeout(LOCALE_LOOKUP_TIMEOUT_MS),
    });
    if (res.ok) {
      const body = (await res.json()) as { locale?: unknown };
      const raw = typeof body.locale === "string" ? body.locale : "";
      if (isLocale(raw)) value = raw;
    }
  } catch {
    // Network failure or the timeout above. `DEFAULT_LOCALE` is the answer, and
    // it is cached, so a broken lookup does not slow every request.
  }

  localeCache = { value, at: now };
  return value;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPassthrough(pathname)) return NextResponse.next();

  const prefixed = localePrefix(pathname, LOCALES);
  if (prefixed) {
    // Already localized. Tag the request so the layout can read the language,
    // and leave the URL alone.
    const headers = new Headers(request.headers);
    headers.set("x-locale", prefixed);
    return NextResponse.next({ request: { headers } });
  }

  // No locale in the URL. Send it to the configured default, preserving the
  // rest of the path and the query string.
  //
  // This also covers `/projects/<slug>`, the shape every project URL had before
  // this change — those links are already out in the world (the admin, old
  // shares), and a 404 on all of them would be a self-inflicted outage. One
  // rule handles both, because both are just "a path with no locale".
  const locale = await storedDefaultLocale();
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
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
