import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";

const STATIC_PATHS = ["/", "/browse", "/faq", "/contact", "/policies/terms", "/policies/privacy", "/policies/return"];

// Products are paginated in from the backend rather than requested all at
// once — a growing catalog shouldn't require raising some arbitrary "give me
// everything" limit on the API side. Capped at 50 pages (5,000 products)
// as a sane runaway guard, not an expected ceiling.
async function allProductUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 50; page++) {
    const products = await getProducts({ perPage: 100, page });
    if (products.length === 0) break;
    for (const p of products) {
      urls.push({ url: `${siteUrl}/product/${p.id}`, changeFrequency: "daily", priority: 0.7 });
    }
    if (products.length < 100) break;
  }
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  const [categories, productUrls] = await Promise.all([getCategories(), allProductUrls(siteUrl)]);

  const staticUrls: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.5,
  }));

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/browse?category=${c.id}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticUrls, ...categoryUrls, ...productUrls];
}
