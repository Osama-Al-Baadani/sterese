import { stripHtml } from "./format";
import type { Category } from "./types";

/** Builds the `alternates.languages` map for a page's metadata — Arabic is
 * unprefixed (routing.ts's localePrefix: "as-needed"), English gets /en.
 * Without this, Google has no way to know a product/category page's ar and
 * en URLs are the same content in two languages, and won't pair them in
 * search results. `path` must already start with "/" and contain no locale
 * prefix (e.g. "/product/123", not "/ar/product/123"). */
export function hreflangAlternates(path: string): Record<string, string> {
  return {
    ar: path,
    en: localizedPath(path, "en"),
    "x-default": path,
  };
}

/** Prefixes a locale-less path with the English locale segment (Arabic stays
 * unprefixed, matching routing.ts's `localePrefix: "as-needed"`). "/" becomes
 * "/en" rather than "/en/", and query strings are preserved. */
export function localizedPath(path: string, locale: string): string {
  if (locale !== "en") return path;
  if (path === "/") return "/en";
  return `/en${path}`;
}

/** Complete `alternates` block for a page's metadata. The canonical URL MUST
 * point at the page's own locale: a canonical that always points at the
 * Arabic URL tells Google every /en page is a duplicate of its Arabic twin,
 * which de-indexes the English version and wastes crawl budget. Pairing it
 * with reciprocal hreflang links (ar / en / x-default) is what lets search
 * engines serve each language to the right audience instead of having the two
 * versions compete for the same keywords. */
export function localizedAlternates(path: string, locale: string) {
  return {
    canonical: localizedPath(path, locale),
    languages: hreflangAlternates(path),
  };
}

/** English name if this category has one and the viewer is in English,
 * otherwise the Arabic name — the only name every category is guaranteed
 * to have. */
export function localizedName(category: Pick<Category, "name" | "name_en">, locale: string): string {
  if (locale === "en" && category.name_en) return category.name_en;
  return category.name;
}

/** Same fallback-to-Arabic rule as localizedName, for a product's
 * description — prefers the short description (in whichever language
 * resolves), then the full one, same precedence the app uses. Returns null
 * when there's nothing to show in either language. */
export function localizedDescription(
  product: { description: string | null; description_en: string | null; short_description: string | null; short_description_en: string | null },
  locale: string,
): string | null {
  const raw =
    locale === "en"
      ? product.short_description_en || product.description_en || product.short_description || product.description
      : product.short_description || product.description;
  if (!raw) return null;
  const stripped = stripHtml(raw);
  return stripped || null;
}
