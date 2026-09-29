import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { DICT, isLocale } from "@/lib/i18n";
import { getDefaultLocale } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The language the middleware tagged this request with (see src/middleware.ts).
 *
 * Falls back to the stored default when the header is absent — which is the case
 * for `/admin`, `/api`, and `/healthz`. Those paths carry no locale, and they
 * still need a layout, so this has to answer rather than throw.
 *
 * The fallback is read from the database rather than taken from the
 * `DEFAULT_LOCALE` constant so that `<html lang>` on `/admin` agrees with the
 * language the public site is actually serving. Two sources would eventually
 * disagree, and the visible symptom — a screen reader announcing the wrong
 * language on the operator page — is the kind that never gets reported.
 *
 * `headers()` is async in Next 15, and reading it is what makes a route
 * dynamic. Every page here is already `force-dynamic`, so this costs nothing
 * that was not already spent; it is also why the header approach works at all
 * — a static page would have been rendered once, with whatever language the
 * build happened to see.
 */
async function requestLocale() {
  const raw = (await headers()).get("x-locale");
  if (isLocale(raw)) return raw;
  return getDefaultLocale();
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await requestLocale();
  const dict = DICT[lang];
  return {
    title: dict.metaTitle,
    description: dict.metaDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await requestLocale();

  return (
    <html lang={lang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
