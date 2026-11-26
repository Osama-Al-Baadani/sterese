"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useFavorites } from "@/lib/favorites-context";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

export default function FavoritesView() {
  const locale = useLocale();
  const t = useTranslations("favorites");
  const tCommon = useTranslations("common");
  const { ids, hydrated } = useFavorites();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([]);
      return;
    }
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [ids, hydrated]);

  if (!hydrated || products === null) {
    return <div className="py-20 text-center text-navy-400">{t("loading")}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy-900/10 py-24 text-center">
        <Heart className="h-14 w-14 text-navy-300" aria-hidden />
        <p className="text-lg font-bold text-navy-900">{t("empty")}</p>
        <p className="text-sm text-navy-500">{t("emptyHint")}</p>
        <Link
          href="/browse"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {tCommon("browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {products.map((p) => (
        <div key={p.id} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]">
          <ProductCard product={p} locale={locale} />
        </div>
      ))}
    </div>
  );
}
