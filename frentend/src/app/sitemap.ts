import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { hreflangAlternates } from "@/lib/i18n-helpers";

const STATIC_PATHS = ["/", "/browse", "/track-order", "/about", "/faq", "/contact", "/policies/terms", "/policies/privacy", "/policies/return"];

function absoluteAlternates(siteUrl: string, path: string) {
  const alts = hreflangAlternates(path);
  return {
    languages: {
      ar: `${siteUrl}${alts.ar === "/" ? "" : alts.ar}`,
      en: `${siteUrl}${alts.en}`,
    },
  };
}

async function allProductUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 50; page++) {
    const products = await getProducts({ perPage: 100, page });
    if (products.length === 0) break;
    for (const p of products) {
      const path = `/product/${p.id}`;
      const alternates = absoluteAlternates(siteUrl, path);
      urls.push(
        { url: `${siteUrl}${path}`, changeFrequency: "daily", priority: 0.7, alternates },
        { url: `${siteUrl}/en${path}`, changeFrequency: "daily", priority: 0.7, alternates },
      );
    }
    if (products.length < 100) break;
  }
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const [categories, productUrls] = await Promise.all([getCategories(), allProductUrls(siteUrl)]);

  const staticUrls: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) => {
    const alternates = absoluteAlternates(siteUrl, path);
    const changeFrequency = path === "/" ? ("daily" as const) : ("weekly" as const);
    const priority = path === "/" ? 1 : 0.5;
    return [
      { url: `${siteUrl}${path === "/" ? "" : path}`, changeFrequency, priority, alternates },
      { url: `${siteUrl}/en${path === "/" ? "" : path}`, changeFrequency, priority, alternates },
    ];
  });

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) => c.count > 0)
    .flatMap((c) => {
      const path = `/browse?category=${c.id}`;
      const alternates = absoluteAlternates(siteUrl, path);
      return [
        { url: `${siteUrl}${path}`, changeFrequency: "daily", priority: 0.6, alternates },
        { url: `${siteUrl}/en${path}`, changeFrequency: "daily", priority: 0.6, alternates },
      ];
    });

  return [...staticUrls, ...categoryUrls, ...productUrls];
}
