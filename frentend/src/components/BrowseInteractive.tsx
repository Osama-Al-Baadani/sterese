"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, PackageSearch, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { childrenOf, descendantIds, hasProducts } from "@/lib/category-tree";
import { localizedName, localizedPath } from "@/lib/i18n-helpers";
import type { Brand, Category, Product } from "@/lib/types";
import Breadcrumbs from "./Breadcrumbs";
import BrowseFilters from "./BrowseFilters";
import CategoryTabs from "./CategoryTabs";
import HomeSectionProducts from "./HomeSectionProducts";
import LoadMoreProducts from "./LoadMoreProducts";
import MobileFilterDrawer from "./MobileFilterDrawer";
import SortSelect from "./SortSelect";

const PAGE_SIZE = 24;

export interface GroupedCategorySection {
  category: Category;
  products: Product[];
}

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

// Persistent in-memory client caches across category switches & revisits so
// hovered or previously opened categories render in 0ms without any flash.
const flatCache = new Map<string, { products: Product[]; hasMore: boolean }>();
const groupedCache = new Map<number, GroupedCategorySection[]>();
const inflightFlat = new Map<string, Promise<{ products: Product[]; hasMore: boolean } | null>>();
const inflightGrouped = new Map<number, Promise<GroupedCategorySection[] | null>>();

function buildApiQuery(next: BrowseState): URLSearchParams {
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
  return apiParams;
}

function buildBrowserUrl(next: BrowseState, locale: string): string {
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
  return localizedPath(qs ? `/browse?${qs}` : "/browse", locale);
}

export default function BrowseInteractive({
  homeLabel,
  defaultTitle,
  initialProducts,
  initialHasMore,
  initialGroupedSections,
  brands,
  categories,
  initialSelectedId,
  initialState,
}: {
  homeLabel: string;
  defaultTitle: string;
  initialProducts: Product[];
  initialHasMore: boolean;
  initialGroupedSections?: GroupedCategorySection[];
  brands: Brand[];
  categories: Category[];
  initialSelectedId: number | null;
  initialState: BrowseState;
}) {
  const locale = useLocale();
  const t = useTranslations("browse");
  const tHome = useTranslations("home");

  const [state, setState] = useState<BrowseState>(initialState);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [groupedSections, setGroupedSections] = useState<GroupedCategorySection[]>(
    initialGroupedSections ?? [],
  );
  const [fetching, setFetching] = useState(false);
  const requestSeq = useRef(0);

  const shouldShowGrouped = useCallback(
    (catId: number | null, s: BrowseState) => {
      if (catId === null || s.search || s.brand) return false;
      return childrenOf(categories, catId).some((c) => hasProducts(categories, c.id));
    },
    [categories],
  );

  // Seed initial server-rendered payload into the client cache on mount
  useEffect(() => {
    if (shouldShowGrouped(initialSelectedId, initialState) && initialSelectedId !== null && initialGroupedSections) {
      groupedCache.set(initialSelectedId, initialGroupedSections);
    } else {
      const key = buildApiQuery(initialState).toString();
      flatCache.set(key, { products: initialProducts, hasMore: initialHasMore });
    }
  }, [initialGroupedSections, initialHasMore, initialProducts, initialSelectedId, initialState, shouldShowGrouped]);

  const fetchFlatCached = useCallback(async (next: BrowseState) => {
    const key = buildApiQuery(next).toString();
    const hit = flatCache.get(key);
    if (hit) return hit;

    let pending = inflightFlat.get(key);
    if (!pending) {
      pending = fetch(`/api/products?${key}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const fetched: Product[] = await res.json();
          const entry = {
            hasMore: fetched.length > PAGE_SIZE,
            products: fetched.slice(0, PAGE_SIZE),
          };
          flatCache.set(key, entry);
          return entry;
        })
        .catch(() => null)
        .finally(() => {
          inflightFlat.delete(key);
        });
      inflightFlat.set(key, pending);
    }
    return pending;
  }, []);

  const fetchGroupedCached = useCallback(async (catId: number) => {
    const hit = groupedCache.get(catId);
    if (hit) return hit;

    let pending = inflightGrouped.get(catId);
    if (!pending) {
      pending = fetch(`/api/category-sections?parent_id=${catId}&per_page=8`)
        .then(async (res) => {
          if (!res.ok) return null;
          const sections: GroupedCategorySection[] = await res.json();
          groupedCache.set(catId, sections);
          return sections;
        })
        .catch(() => null)
        .finally(() => {
          inflightGrouped.delete(catId);
        });
      inflightGrouped.set(catId, pending);
    }
    return pending;
  }, []);

  const stateForCategory = useCallback(
    (catId: number | null, baseState: BrowseState): BrowseState => ({
      ...baseState,
      category: catId !== null ? String(catId) : undefined,
      categoryFilter: catId !== null ? descendantIds(categories, catId).join(",") : undefined,
      page: 1,
    }),
    [categories],
  );

  // Prefetch on hover/touch so clicking feels 0ms instantaneous
  const handleHoverCategory = useCallback(
    (catId: number | null) => {
      const next = stateForCategory(catId, state);
      if (shouldShowGrouped(catId, next) && catId !== null) {
        void fetchGroupedCached(catId);
      } else {
        void fetchFlatCached(next);
      }
    },
    [fetchFlatCached, fetchGroupedCached, shouldShowGrouped, state, stateForCategory],
  );

  // Warm top root categories quietly during idle time after mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const roots = categories.filter((c) => c.parent === 0 && hasProducts(categories, c.id)).slice(0, 5);
      for (const r of roots) {
        if (r.id !== selectedId) {
          handleHoverCategory(r.id);
        }
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [categories, handleHoverCategory, selectedId]);

  const applyNavigationState = useCallback(
    async (nextCatId: number | null, next: BrowseState, historyMode: "push" | "replace" | "none") => {
      const seq = ++requestSeq.current;
      setSelectedId(nextCatId);
      setState(next);

      if (historyMode !== "none") {
        const browserPath = buildBrowserUrl(next, locale);
        if (historyMode === "push") {
          window.history.pushState(null, "", browserPath);
        } else {
          window.history.replaceState(null, "", browserPath);
        }
      }

      if (shouldShowGrouped(nextCatId, next) && nextCatId !== null) {
        const cached = groupedCache.get(nextCatId);
        if (cached) {
          setGroupedSections(cached);
          setFetching(false);
          return;
        }
        setFetching(true);
        const loaded = await fetchGroupedCached(nextCatId);
        if (seq !== requestSeq.current) return;
        if (loaded) setGroupedSections(loaded);
        setFetching(false);
        return;
      }

      const key = buildApiQuery(next).toString();
      const cached = flatCache.get(key);
      if (cached) {
        setProducts(cached.products);
        setHasMore(cached.hasMore);
        setFetching(false);
        return;
      }

      setFetching(true);
      const loaded = await fetchFlatCached(next);
      if (seq !== requestSeq.current) return;
      if (loaded) {
        setProducts(loaded.products);
        setHasMore(loaded.hasMore);
      }
      setFetching(false);
    },
    [fetchFlatCached, fetchGroupedCached, locale, shouldShowGrouped],
  );

  // Sync browser Back/Forward buttons cleanly without full reload
  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search);
      const catRaw = sp.get("category") ?? undefined;
      const catId = catRaw ? Number(catRaw) : null;
      const next: BrowseState = {
        search: sp.get("search") ?? undefined,
        category: catRaw,
        categoryFilter: catId !== null ? descendantIds(categories, catId).join(",") : undefined,
        brand: sp.get("brand") ?? undefined,
        tag: sp.get("tag") ?? undefined,
        sort: sp.get("sort") ?? "popularity-desc",
        minPrice: sp.get("min_price") ?? undefined,
        maxPrice: sp.get("max_price") ?? undefined,
        inStock: sp.get("in_stock") === "1",
        page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
      };
      void applyNavigationState(catId, next, "none");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyNavigationState, categories]);

  function runFilterUpdate(next: BrowseState) {
    void applyNavigationState(selectedId, next, "replace");
  }

  function handleSelectCategory(catId: number | null) {
    if (catId === selectedId) return;
    const next = stateForCategory(catId, state);
    void applyNavigationState(catId, next, "push");
  }

  const activeCategory = selectedId ? categories.find((c) => c.id === selectedId) : null;
  const activeCategoryName = activeCategory ? localizedName(activeCategory, locale) : null;
  const pageTitle = state.search
    ? t("searchResults", { query: state.search })
    : activeCategoryName || defaultTitle;

  const isGrouped = shouldShowGrouped(selectedId, state);

  const [orderby, order] = state.sort.split("-") as [
    "popularity" | "date" | "price",
    "asc" | "desc",
  ];

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

  if (isGrouped) {
    const visibleSections = groupedSections.filter((s) => s.products.length > 0);
    return (
      <>
        <Breadcrumbs
          items={[
            { label: homeLabel, href: "/" },
            { label: activeCategoryName || defaultTitle },
          ]}
        />

        <div className="mb-6 flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-navy-900">{pageTitle}</h1>
          {fetching && <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />}
        </div>

        <CategoryTabs
          categories={categories}
          selectedId={selectedId}
          base={{
            brand: state.brand,
            sort: state.sort !== "popularity-desc" ? state.sort : undefined,
            in_stock: state.inStock ? "1" : undefined,
          }}
          onSelectCategory={handleSelectCategory}
          onHoverCategory={handleHoverCategory}
        />

        <div className="space-y-8">
          {visibleSections.map(({ category, products: secProducts }) => (
            <div key={category.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-navy-900">
                  {localizedName(category, locale)}
                </h2>
                <Link
                  href={`/browse?category=${category.id}`}
                  prefetch={true}
                  onMouseEnter={() => handleHoverCategory(category.id)}
                  onTouchStart={() => handleHoverCategory(category.id)}
                  onClick={(e) => {
                    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      handleSelectCategory(category.id);
                    }
                  }}
                  className="text-xs font-bold text-brand-700 hover:underline"
                >
                  {tHome("seeAll")}
                </Link>
              </div>
              <HomeSectionProducts products={secProducts} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: homeLabel, href: "/" },
          { label: activeCategoryName || defaultTitle },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">{pageTitle}</h1>
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
        <aside className="hidden rounded-2xl border border-navy-900/8 bg-white p-5 shadow-xs lg:sticky lg:top-24 lg:block lg:h-fit">
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
              sort: state.sort !== "popularity-desc" ? state.sort : undefined,
              in_stock: state.inStock ? "1" : undefined,
            }}
            onSelectCategory={handleSelectCategory}
            onHoverCategory={handleHoverCategory}
          />

          <div>
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
