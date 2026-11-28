"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [catalog, setCatalog] = useState<Record<number, Product | null>>({});

  const missingKey = useMemo(
    () => ids.filter((id) => !(id in catalog)).join(","),
    [ids, catalog],
  );

  useEffect(() => {
    if (!hydrated || !missingKey) return;
    const controller = new AbortController();
    const requestedIds = missingKey.split(",").map(Number);

    fetch(`/api/products?ids=${missingKey}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        const list = Array.isArray(data) ? (data as Product[]) : [];
        const byId = new Map(list.map((p) => [p.id, p]));
        setCatalog((prev) => {
          const next = { ...prev };
          for (const id of requestedIds) {
            next[id] = byId.get(id) ?? null;
          }
          return next;
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCatalog((prev) => {
          const next = { ...prev };
          for (const id of requestedIds) {
            if (!(id in next)) next[id] = null;
          }
          return next;
        });
      });

    return () => controller.abort();
  }, [hydrated, missingKey]);

  const products = useMemo(
    () => ids.map((id) => catalog[id]).filter((p): p is Product => Boolean(p)),
    [ids, catalog],
  );

  if (!hydrated || (ids.length > 0 && products.length === 0 && Boolean(missingKey))) {
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} />
      ))}
    </div>
  );
}
