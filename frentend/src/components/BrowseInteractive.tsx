"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, PackageSearch, X } from "lucide-react";
import { localizedName, localizedPath } from "@/lib/i18n-helpers";
import type { Brand, Category, Product } from "@/lib/types";
import BrowseFilters from "./BrowseFilters";
import CategoryTabs from "./CategoryTabs";
import LoadMoreProducts from "./LoadMoreProducts";
import MobileFilterDrawer from "./MobileFilterDrawer";
import SortSelect from "./SortSelect";

const PAGE_SIZE = 24;

export interface BrowseState {
  search?: string;
  category?: string;
  categoryFilter?: string;
  brand?: string;
  tag?: string;
  sort: string;
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
  page: number;
}

export default function BrowseInteractive({
  title,
  initialProducts,
  initialHasMore,
  brands,
  categories,
  selectedId,
  initialState,
}: {
  title: string;
  initialProducts: Product[];
  initialHasMore: boolean;
  brands: Brand[];
  categories: Category[];
  selectedId: number | null;
  initialState: BrowseState;
}) {
  const locale = useLocale();
  const t = useTranslations("browse");

  const [state, setState] = useState<BrowseState>(initialState);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [fetching, setFetching] = useState(false);

  const [orderby, order] = state.sort.split("-") as [
    "popularity" | "date" | "price",
    "asc" | "desc",
  ];

  async function runFilterUpdate(next: BrowseState) {
    setState(next);
    setFetching(true);

    const [nextOrderby, nextOrder] = next.sort.split("-") as [string, string];
    const apiParams = new URLSearchParams();
    if (next.search) apiParams.set("search", next.search);
    if (next.categoryFilter) apiParams.set("category", next.categoryFilter);
    if (next.brand) apiParams.set("brand", next.brand);
    if (next.tag) apiParams.set("tag", next.tag);
    apiParams.set("orderby", nextOrderby || "popularity");
    apiParams.set("order", nextOrder || "desc");
    if (next.minPrice) apiParams.set("min_price", next.minPrice);
    if (next.maxPrice) apiParams.set("max_price", next.maxPrice);
    if (next.inStock) apiParams.set("in_stock", "1");
    apiParams.set("page", "1");
    apiParams.set("per_page", String(PAGE_SIZE + 1));

    const urlParams = new URLSearchParams();
    if (next.search) urlParams.set("search", next.search);
    if (next.category) urlParams.set("category", next.category);
    if (next.brand) urlParams.set("brand", next.brand);
    if (next.tag) urlParams.set("tag", next.tag);
    if (next.minPrice) urlParams.set("min_price", next.minPrice);
    if (next.maxPrice) urlParams.set("max_price", next.maxPrice);
    if (next.inStock) urlParams.set("in_stock", "1");
    if (next.sort !== "popularity-desc") urlParams.set("sort", next.sort);
    const qs = urlParams.toString();
    const browserPath = localizedPath(qs ? `/browse?${qs}` : "/browse", locale);
    window.history.replaceState(null, "", browserPath);

    try {
      const res = await fetch(`/api/products?${apiParams.toString()}`);
      if (res.ok) {
        const fetched: Product[] = await res.json();
        setHasMore(fetched.length > PAGE_SIZE);
        setProducts(fetched.slice(0, PAGE_SIZE));
      }
    } catch {
      // keep current list on transient failure
    } finally {
      setFetching(false);
    }
  }

  const activeFilterCount =
    (state.brand ? 1 : 0) +
    (state.minPrice || state.maxPrice ? 1 : 0) +
    (state.inStock ? 1 : 0);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (state.search) {
    chips.push({
      key: "search",
      label: `"${state.search}"`,
      onRemove: () => runFilterUpdate({ ...state, search: undefined, page: 1 }),
    });
  }
  if (state.brand) {
    const bObj = brands.find((b) => b.slug === state.brand);
    chips.push({
      key: "brand",
      label: bObj ? localizedName(bObj, locale) : state.brand,
      onRemove: () => runFilterUpdate({ ...state, brand: undefined, page: 1 }),
    });
  }
  if (state.minPrice || state.maxPrice) {
    chips.push({
      key: "price",
      label: `${state.minPrice || "0"} - ${state.maxPrice || "∞"}`,
      onRemove: () => runFilterUpdate({ ...state, minPrice: undefined, maxPrice: undefined, page: 1 }),
    });
  }
  if (state.inStock) {
    chips.push({
      key: "in_stock",
      label: t("inStockOnly"),
      onRemove: () => runFilterUpdate({ ...state, inStock: false, page: 1 }),
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-navy-500">
            <span>{t("productCount", { count: products.length })}</span>
            {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden />}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MobileFilterDrawer
            brands={brands}
            current={state}
            activeCount={activeFilterCount}
            onApply={(f) =>
              runFilterUpdate({
                ...state,
                brand: f.brand || undefined,
                minPrice: f.minPrice || undefined,
                maxPrice: f.maxPrice || undefined,
                inStock: f.inStock,
                page: 1,
              })
            }
            onReset={() =>
              runFilterUpdate({
                ...state,
                brand: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                inStock: false,
                sort: "popularity-desc",
                page: 1,
              })
            }
          />
          <SortSelect
            current={state.sort}
            onSortChange={(sort) => runFilterUpdate({ ...state, sort, page: 1 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-navy-900/8 bg-white p-5 shadow-xs lg:block lg:sticky lg:top-24 lg:h-fit">
          <BrowseFilters
            key={`${state.brand ?? ""}|${state.minPrice ?? ""}|${state.maxPrice ?? ""}|${state.inStock}`}
            brands={brands}
            current={state}
            onApply={(f) =>
              runFilterUpdate({
                ...state,
                brand: f.brand || undefined,
                minPrice: f.minPrice || undefined,
                maxPrice: f.maxPrice || undefined,
                inStock: f.inStock,
                page: 1,
              })
            }
            onReset={() =>
              runFilterUpdate({
                ...state,
                brand: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                inStock: false,
                sort: "popularity-desc",
                page: 1,
              })
            }
          />
        </aside>

        <div>
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                >
                  <span>{c.label}</span>
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
              {chips.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    runFilterUpdate({
                      ...state,
                      search: undefined,
                      brand: undefined,
                      minPrice: undefined,
                      maxPrice: undefined,
                      inStock: false,
                      sort: "popularity-desc",
                      page: 1,
                    })
                  }
                  className="px-2 py-1 text-xs font-bold text-navy-500 underline hover:text-rose-600"
                >
                  {t("clearFilters")}
                </button>
              )}
            </div>
          )}

          <CategoryTabs
            categories={categories}
            selectedId={selectedId}
            base={{
              brand: state.brand,
              sort: state.sort,
              in_stock: state.inStock ? "1" : undefined,
            }}
          />

          <div className={`transition-opacity duration-150 ${fetching ? "pointer-events-none opacity-55" : ""}`}>
            {products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-navy-900/10 py-20 text-center">
                <PackageSearch className="h-12 w-12 text-navy-300" aria-hidden />
                <p className="font-semibold text-navy-700">
                  {state.page > 1 ? t("noMore") : t("noMatches")}
                </p>
                <p className="text-sm text-navy-500">
                  {state.page > 1 ? t("lastPage") : t("tryChanging")}
                </p>
              </div>
            ) : (
              <LoadMoreProducts
                key={[
                  state.search,
                  state.categoryFilter,
                  state.brand,
                  state.tag,
                  orderby,
                  order,
                  state.minPrice,
                  state.maxPrice,
                  state.inStock,
                  products[0]?.id ?? "empty",
                ].join("|")}
                initialProducts={products}
                initialPage={state.page}
                initialHasMore={hasMore}
                filters={{
                  search: state.search,
                  category: state.categoryFilter,
                  brand: state.brand,
                  tag: state.tag,
                  orderby,
                  order,
                  minPrice: state.minPrice,
                  maxPrice: state.maxPrice,
                  inStock: state.inStock,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
