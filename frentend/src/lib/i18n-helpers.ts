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
    en: `/en${path}`,
    "x-default": path,
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
