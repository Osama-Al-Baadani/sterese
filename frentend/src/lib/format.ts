export function formatSar(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  // numberingSystem: "latn" forces plain 0-9 digits — "ar-SA" on its own
  // renders Arabic-Indic numerals (٠١٢...), which the business wants prices
  // to never use, in either site language.
  return `${n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2, numberingSystem: "latn" })} ر.س`;
}

/** "1+1" for bundle_qty=2, "1+2" for bundle_qty=3, etc. — mirrors the app's
 * Product.bundleLabel. null when the product isn't a bundle deal at all. */
export function bundleLabel(bundleQty: number | null | undefined): string | null {
  if (!bundleQty || bundleQty <= 1) return null;
  return `1+${bundleQty - 1}`;
}

/** Mirrors the app's Product._strip — product descriptions are a plain
 * Textarea in the admin panel (not a rich-text editor), but a lot of the
 * catalog's descriptions were pasted in from elsewhere (ChatGPT's own page,
 * Word, etc.) carrying their source page's HTML along with them — div/
 * section wrappers, class names, data-* attributes, the works. Rendered as
 * plain text (the only thing a Textarea's content was ever meant to hold),
 * that markup shows up as ugly literal tags instead of the formatting it
 * was never actually meant to apply. Strips it down to just the readable
 * text — tags become a space (not nothing), so a stray missing space
 * between two tag-adjacent words doesn't glue them together. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** JSON.stringify() alone is not safe to drop into dangerouslySetInnerHTML
 * for a <script type="application/ld+json"> tag — it doesn't escape "<", so
 * a string value anywhere in the object (a product name/description, both
 * admin-editable free text — see stripHtml above for how messy that text
 * already gets) containing the literal "</script" closes the tag early and
 * lets whatever follows it in that string get parsed as real HTML. Escaping
 * every "<" to its unicode form is always safe inside a JSON string and
 * can never be reinterpreted as a tag. Use this instead of a bare
 * JSON.stringify() for every JSON-LD block. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
