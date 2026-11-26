"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw, Search } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { localizedName } from "@/lib/i18n-helpers";
import type { Brand } from "@/lib/types";

const PRICE_PRESETS = [
  { labelKey: "under20", min: "", max: "20" },
  { labelKey: "range20to50", min: "20", max: "50" },
  { labelKey: "range50to100", min: "50", max: "100" },
  { labelKey: "over100", min: "100", max: "" },
] as const;

export default function BrowseFilters({
  brands,
  current,
  onApplied,
  onApply,
  onReset,
}: {
  brands: Brand[];
  current: {
    search?: string;
    category?: string;
    brand?: string;
    sort: string;
    inStock: boolean;
    minPrice?: string;
    maxPrice?: string;
  };
  onApplied?: () => void;
  onApply?: (next: { brand: string; minPrice: string; maxPrice: string; inStock: boolean }) => void;
  onReset?: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("browse");
  const [brandQuery, setBrandQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(current.brand ?? "");
  const [minPrice, setMinPrice] = useState(current.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? "");
  const [inStock, setInStock] = useState(current.inStock);

  const availableBrands = useMemo(() => brands.filter((b) => b.count > 0), [brands]);
  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return availableBrands;
    return availableBrands.filter((b) => localizedName(b, locale).toLowerCase().includes(q));
  }, [availableBrands, brandQuery, locale]);

  const hasActiveFilters =
    Boolean(current.category) ||
    Boolean(current.brand) ||
    Boolean(current.minPrice) ||
    Boolean(current.maxPrice) ||
    current.inStock ||
    current.sort !== "popularity-desc";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onApply) {
      onApplied?.();
      onApply({
        brand: selectedBrand,
        minPrice: minPrice.trim(),
        maxPrice: maxPrice.trim(),
        inStock,
      });
      return;
    }
    const params = new URLSearchParams();
    if (current.search) params.set("search", current.search);
    if (current.category) params.set("category", current.category);
    if (current.sort !== "popularity-desc") params.set("sort", current.sort);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (minPrice.trim()) params.set("min_price", minPrice.trim());
    if (maxPrice.trim()) params.set("max_price", maxPrice.trim());
    if (inStock) params.set("in_stock", "1");
    const qs = params.toString();
    onApplied?.();
    router.push(qs ? `/browse?${qs}` : "/browse");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasActiveFilters && (
        <div className="flex items-center justify-between border-b border-navy-900/8 pb-3">
          <span className="text-xs font-bold text-navy-500">{t("filters")}</span>
          {onReset ? (
            <button
              type="button"
              onClick={() => {
                setSelectedBrand("");
                setMinPrice("");
                setMaxPrice("");
                setInStock(false);
                onApplied?.();
                onReset();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 transition hover:text-rose-700"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              {t("clearFilters")}
            </button>
          ) : (
            <Link
              href={current.search ? `/browse?search=${encodeURIComponent(current.search)}` : "/browse"}
              onClick={() => onApplied?.()}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 transition hover:text-rose-700"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              {t("clearFilters")}
            </Link>
          )}
        </div>
      )}

      {/* Price Range + Quick Presets */}
      <div>
        <h3 className="mb-2.5 text-sm font-extrabold text-navy-900">{t("priceRange")}</h3>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = minPrice === p.min && maxPrice === p.max;
            return (
              <button
                key={p.labelKey}
                type="button"
                onClick={() => {
                  setMinPrice(p.min);
                  setMaxPrice(p.max);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-navy-900/10 bg-navy-900/[0.02] text-navy-700 hover:border-brand-400"
                }`}
              >
                {t(`pricePresets.${p.labelKey}`)}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={t("minPrice")}
            className="w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            type="number"
            min="0"
            step="any"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={t("maxPrice")}
            className="w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Brands with quick search */}
      {availableBrands.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-sm font-extrabold text-navy-900">{t("brand")}</h3>
          {availableBrands.length > 5 && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute top-1/2 start-3 h-3.5 w-3.5 -translate-y-1/2 text-navy-400" aria-hidden />
              <input
                type="search"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder={t("searchBrand")}
                className="w-full rounded-xl border border-navy-900/10 bg-navy-900/[0.02] py-1.5 ps-8 pe-3 text-xs text-navy-900 outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto pe-1">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-700 hover:bg-navy-900/[0.03]">
              <input
                type="radio"
                name="brand"
                value=""
                checked={selectedBrand === ""}
                onChange={() => setSelectedBrand("")}
                className="accent-brand-600"
              />
              {t("all")}
            </label>
            {filteredBrands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-700 hover:bg-navy-900/[0.03]"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="brand"
                    value={b.slug}
                    checked={selectedBrand === b.slug}
                    onChange={() => setSelectedBrand(b.slug)}
                    className="accent-brand-600"
                  />
                  {localizedName(b, locale)}
                </span>
                <span className="text-xs text-navy-400">{b.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* In Stock Switch */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-3.5 py-2.5">
        <span className="text-sm font-semibold text-navy-800">{t("inStockOnly")}</span>
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition active:scale-[0.98] hover:bg-brand-700"
      >
        {t("applyFilters")}
      </button>
    </form>
  );
}
