"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { History } from "lucide-react";
import { getRecentlyViewedIds } from "@/lib/recently-viewed";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function RecentlyViewedSection({
  excludeId,
}: {
  excludeId?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("home");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentlyViewedIds().filter((id) => id !== excludeId).slice(0, 8);
    if (ids.length === 0) return;

    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => {
        if (!Array.isArray(data)) return;
        const byId = new Map(data.map((p) => [p.id, p]));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
        setProducts(ordered);
      })
      .catch(() => {
        // fail silently
      });
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-2">
        <History className="h-5 w-5 text-brand-600" aria-hidden />
        <h2 className="text-xl font-extrabold text-navy-900">{t("recentlyViewed")}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} />
        ))}
      </div>
    </section>
  );
}
