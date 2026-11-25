import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import legacyMap from "@/data/woo-redirect-map.json";
import { routing } from "@/i18n/routing";

// Prep for the eventual storeseco.com cutover from the old WordPress/
// WoodMart site — its URLs (slug-based, nested categories) don't share a
// shape with this site's (numeric ids, flat query params), so a stray old
// backlink or a page still in Google's index needs an explicit redirect
// instead of hitting a 404 and losing whatever ranking it had. Inert until
// that cutover: none of these path shapes exist as real routes here, so a
// request for one of them is always either a legacy link or a bot probe.

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function buildDecodedMap(raw: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [key, id] of Object.entries(raw)) {
    map.set(safeDecode(key).toLowerCase(), id);
  }
  return map;
}

const products = buildDecodedMap(legacyMap.products as Record<string, number>);
const categories = buildDecodedMap(legacyMap.categories as Record<string, number>);
const brands = buildDecodedMap(legacyMap.brands as Record<string, number>);

// "/cart" and "/checkout" need no entry — the old site's URLs for those
// (with a trailing slash) already collapse to the same path we serve here.
const STATIC_REDIRECTS: Record<string, string> = {
  "/shop": "/browse",
  "/my-account": "/account",
  "/contact-us": "/contact",
  // Old WordPress policy pages — /privacy-policy is also the privacy URL
  // registered in App Store Connect, so it must keep resolving.
  "/privacy-policy": "/policies/privacy",
  "/privacy": "/policies/privacy",
  "/refund_returns": "/policies/return",
  "/terms": "/policies/terms",
  "/about-us-3": "/about",
  "/compare": "/favorites",
};

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

const intlMiddleware = createIntlMiddleware(routing);

const APP_STORE_URL = "https://apps.apple.com/us/app/المخازن-الاقتصادية/id6778609957";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=sa.storeseco.app&pcampaignid=web_share";

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = stripTrailingSlash(nextUrl.pathname);

  // Single "download the app" link used everywhere (hero, footer, download
  // banner's QR code) instead of two separate buttons — sends iPhones to the
  // App Store and everything else to Google Play, so there's one URL to hand
  // out/print/scan rather than asking the visitor to pick for themselves.
  if (pathname === "/app") {
    const ua = req.headers.get("user-agent") ?? "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    return NextResponse.redirect(isIOS ? APP_STORE_URL : GOOGLE_PLAY_URL, 302);
  }

  // Standalone "link in bio" page (src/app/qr/route.ts) — lives outside the
  // [locale] tree and is already printed on physical materials as
  // storeseco.com/qr, so it must bypass next-intl entirely rather than get
  // rewritten toward /ar/qr (which doesn't exist).
  if (pathname === "/qr") {
    return NextResponse.next();
  }

  // Old brand filter — a query param on whatever page it appeared on, not
  // its own path (?product_brand=slug).
  const brandSlug = nextUrl.searchParams.get("product_brand");
  if (brandSlug) {
    const brandId = brands.get(safeDecode(brandSlug).toLowerCase());
    const target = new URL(brandId ? `/browse?brand=${brandId}` : "/browse", nextUrl);
    return NextResponse.redirect(target, 301);
  }

  if (pathname in STATIC_REDIRECTS) {
    return NextResponse.redirect(new URL(STATIC_REDIRECTS[pathname], nextUrl), 301);
  }
  if (pathname.startsWith("/my-account/")) {
    return NextResponse.redirect(new URL("/account", nextUrl), 301);
  }

  if (pathname.startsWith("/product-category/")) {
    const slugPath = safeDecode(pathname.slice("/product-category/".length)).toLowerCase();
    const categoryId = categories.get(slugPath);
    const target = categoryId ? `/browse?category=${categoryId}` : "/browse";
    return NextResponse.redirect(new URL(target, nextUrl), 301);
  }

  if (pathname.startsWith("/product/")) {
    const slug = pathname.slice("/product/".length);
    // A purely numeric segment is this site's OWN product route
    // (/product/123) — not a legacy slug. Must fall through untouched, or
    // every real product page redirects itself to /browse.
    if (!/^\d+$/.test(slug)) {
      const productId = products.get(safeDecode(slug).toLowerCase());
      const target = productId ? `/product/${productId}` : "/browse";
      return NextResponse.redirect(new URL(target, nextUrl), 301);
    }
  }

  // Nothing legacy matched — hand off to next-intl for locale detection/
  // routing (adds/strips the /en prefix as needed, sets the locale cookie).
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - _next/static, _next/image (build assets)
     * - api routes (never had legacy equivalents, and aren't localized)
     * - files with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|api/|.*\\..*).*)",
  ],
};
