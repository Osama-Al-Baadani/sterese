import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // Arabic (the current, only version) keeps clean URLs with no prefix —
  // only English gets a visible /en prefix. Avoids changing every existing
  // indexed Arabic URL during this rollout.
  localePrefix: "as-needed",
  // With this on (next-intl's default), the middleware 307-redirects a
  // bare /browse to /en/browse whenever the locale cookie says "en" — even
  // though /browse is already a perfectly valid (Arabic) URL. That redirect
  // response, when it lands on a Next.js prefetch request (?_rsc=...) for a
  // Link that still renders the unprefixed href, triggers a known Next.js
  // router bug (vercel/next.js#98345): the router treats the redirect as
  // "try again" and refires the same prefetch forever, which is exactly the
  // /browse <-> /en/browse infinite request loop hit on every /en page.
  // Turning off cookie/Accept-Language-based redirects removes the redirect
  // that triggers it — the explicit AR/EN switcher button is how visitors
  // actually change language here anyway, so nothing relies on this.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
