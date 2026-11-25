import { getProducts } from "@/lib/api";
import { stripHtml } from "@/lib/format";
import type { Product } from "@/lib/types";

export const revalidate = 3600; // Google re-fetches on its own schedule anyway

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Google requires EITHER a real GTIN OR a brand+MPN pair (or an explicit
// identifier_exists=no) — our internal `barcode` field isn't guaranteed to
// actually be a manufacturer GTIN (could be an internal SKU), so only treat
// it as one when it has a plausible GTIN length. Shipping a bogus GTIN gets
// the whole item (sometimes the whole feed) disapproved on review, which is
// worse than omitting it.
function looksLikeGtin(barcode: string | null): string | null {
  if (!barcode) return null;
  const digits = barcode.trim();
  return /^\d{8}$|^\d{12,14}$/.test(digits) ? digits : null;
}

function productItem(p: Product, siteUrl: string): string {
  const link = `${siteUrl}/product/${p.id}`;
  const images = p.images.map((i) => i.src).filter(Boolean);
  const [imageLink, ...extraImages] = images;
  if (!imageLink) return ""; // Google rejects items with no image at all

  const price = Number(p.regular_price || p.price || 0);
  const salePrice = p.on_sale && p.sale_price ? Number(p.sale_price) : null;
  const availability = p.stock_status === "instock" ? "in_stock" : "out_of_stock";
  const brand = p.brands[0]?.name;
  const gtin = looksLikeGtin(p.barcode);
  const description = stripHtml(p.short_description || p.description || p.name).slice(0, 5000);

  const identifiers = gtin
    ? `<g:gtin>${escapeXml(gtin)}</g:gtin>`
    : brand
      ? `<g:brand>${escapeXml(brand)}</g:brand><g:mpn>${escapeXml(p.sku || String(p.id))}</g:mpn>`
      : `<g:identifier_exists>no</g:identifier_exists>`;

  return `
  <item>
    <g:id>${p.id}</g:id>
    <title>${escapeXml(p.name)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <g:image_link>${escapeXml(imageLink)}</g:image_link>
    ${extraImages
      .slice(0, 10)
      .map((src) => `<g:additional_image_link>${escapeXml(src)}</g:additional_image_link>`)
      .join("")}
    <g:availability>${availability}</g:availability>
    <g:price>${price.toFixed(2)} SAR</g:price>
    ${salePrice ? `<g:sale_price>${salePrice.toFixed(2)} SAR</g:sale_price>` : ""}
    <g:condition>new</g:condition>
    ${brand ? `<g:brand>${escapeXml(brand)}</g:brand>` : ""}
    ${identifiers}
  </item>`;
}

// Same paging approach as sitemap.ts — pull the whole catalog in pages of
// 100 rather than requiring a "give me everything" endpoint.
async function allItems(siteUrl: string): Promise<string[]> {
  const items: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const products = await getProducts({ perPage: 100, page, inStockOnly: false });
    if (products.length === 0) break;
    for (const p of products) {
      const item = productItem(p, siteUrl);
      if (item) items.push(item);
    }
    if (products.length < 100) break;
  }
  return items;
}

export async function GET() {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const items = await allItems(siteUrl);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>المخازن الاقتصادية</title>
  <link>${escapeXml(siteUrl)}</link>
  <description>Product feed for Google Merchant Center</description>
  ${items.join("")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
