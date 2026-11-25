import type { MetadataRoute } from "next";
import { isIndexable } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  // Blocked everywhere except the real production hostname — staging must
  // never get indexed as duplicate content, checked by host not just env var
  // since both deployments share the same ALLOW_INDEXING setting (see
  // lib/seo.ts).
  if (!(await isIndexable())) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/account/", "/checkout", "/cart", "/login", "/order-confirmation"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
