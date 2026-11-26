"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

const PAGE_SIZE = 24;

export interface BrowseFilterParams {
  search?: string;
  category?: string;
  brand?: string;
  tag?: string;
  orderby: string;
  order: string;
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
}

export default function LoadMoreProducts({
  initialProducts,
  initialPage,
  initialHasMore,
  filters,
}: {
  initialProducts: Product[];
  initialPage: number;
  initialHasMore: boolean;
  filters: BrowseFilterParams;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [maxKnownPage, setMaxKnownPage] = useState(initialHasMore ? initialPage + 1 : initialPage);
  const [pageCache, setPageCache] = useState<Record<number, { items: Product[]; hasMore: boolean }>>({
    [initialPage]: { items: initialProducts, hasMore: initialHasMore },
  });
  const [loading, setLoading] = useState(false);
  const [lockedMinHeight, setLockedMinHeight] = useState<number | undefined>(undefined);
  const gridRef = useRef<HTMLDivElement | null>(null);

  function buildParams(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.tag) params.set("tag", filters.tag);
    params.set("orderby", filters.orderby);
    params.set("order", filters.order);
    if (filters.minPrice) params.set("min_price", filters.minPrice);
    if (filters.maxPrice) params.set("max_price", filters.maxPrice);
    if (filters.inStock) params.set("in_stock", "1");
    params.set("page", String(targetPage));
    params.set("per_page", String(PAGE_SIZE + 1));
    return params;
  }

  // Silently prefetch the next page in the background so clicking "Next" is instant (0ms, no flash)
  useEffect(() => {
    const nextPage = page + 1;
    if (!hasMore || pageCache[nextPage]) return;
    const controller = new AbortController();
    fetch(`/api/products?${buildParams(nextPage).toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((fetched: Product[] | null) => {
        if (!Array.isArray(fetched)) return;
        const nextItems = fetched.slice(0, PAGE_SIZE);
        const nextHasMore = fetched.length > PAGE_SIZE;
        setPageCache((prev) => ({
          ...prev,
          [nextPage]: { items: nextItems, hasMore: nextHasMore },
        }));
      })
      .catch(() => {
        // ignore abort/network
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore]);

  async function goToPage(targetPage: number) {
    if (loading || targetPage < 1 || targetPage === page) return;

    // Lock the grid's current height before swapping items so the page never
    // shrinks or jumps when the next page has fewer products.
    if (gridRef.current) {
      const currentHeight = gridRef.current.getBoundingClientRect().height;
      setLockedMinHeight((prev) => Math.max(prev ?? 0, Math.round(currentHeight)));
    }

    // Instant switch from memory cache without any network call or page flash
    const cached = pageCache[targetPage];
    if (cached) {
      setProducts(cached.items);
      setPage(targetPage);
      setHasMore(cached.hasMore);
      setMaxKnownPage((prev) => Math.max(prev, cached.hasMore ? targetPage + 1 : targetPage));
      return;
    }

    setLoading(true);
    const params = buildParams(targetPage);

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) return;
      const fetched: Product[] = await res.json();
      const nextItems = fetched.slice(0, PAGE_SIZE);
      const nextHasMore = fetched.length > PAGE_SIZE;

      setPageCache((prev) => ({
        ...prev,
        [targetPage]: { items: nextItems, hasMore: nextHasMore },
      }));
      setProducts(nextItems);
      setPage(targetPage);
      setHasMore(nextHasMore);
      setMaxKnownPage((prev) => Math.max(prev, nextHasMore ? targetPage + 1 : targetPage));
    } catch {
      // keep current page on transient failure
    } finally {
      setLoading(false);
    }
  }

  // Build visible page numbers window around current page
  const totalPages = Math.max(maxKnownPage, hasMore ? page + 1 : page);
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, Math.max(startPage + 4, page + 2));
  const pageNumbers: number[] = [];
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  const showPagination = page > 1 || hasMore;

  return (
    <>
      <div
        ref={gridRef}
        style={lockedMinHeight ? { minHeight: `${lockedMinHeight}px` } : undefined}
        className={`relative min-h-[420px] transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}
      >
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="flex items-center gap-2 rounded-full bg-navy-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-xs">
              <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden />
              {isAr ? "جاري التحميل..." : "Loading..."}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </div>

      {showPagination && (
        <nav
          aria-label={isAr ? "التنقل بين الصفحات" : "Pagination"}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-navy-900/10 bg-white p-1.5 shadow-md shadow-navy-900/5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="flex h-9 items-center gap-1 rounded-full px-3.5 text-xs font-extrabold text-navy-800 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4 ltr:rotate-180" aria-hidden />
              <span>{isAr ? "السابق" : "Previous"}</span>
            </button>

            <span className="h-5 w-px bg-navy-900/10" aria-hidden />

            {startPage > 1 && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => goToPage(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-navy-600 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  1
                </button>
                {startPage > 2 && <span className="px-1 text-xs font-bold text-navy-300">…</span>}
              </>
            )}

            {pageNumbers.map((num) => {
              const active = num === page;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={loading}
                  onClick={() => goToPage(num)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold transition-all ${
                    active
                      ? "bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/30 scale-105"
                      : "text-navy-700 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {hasMore && endPage === page && (
              <span className="px-1 text-xs font-bold text-navy-300">…</span>
            )}

            <span className="h-5 w-px bg-navy-900/10" aria-hidden />

            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => goToPage(page + 1)}
              className="flex h-9 items-center gap-1 rounded-full px-3.5 text-xs font-extrabold text-navy-800 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span>{isAr ? "التالي" : "Next"}</span>
              <ChevronLeft className="h-4 w-4 ltr:rotate-180" aria-hidden />
            </button>
          </div>

          <p className="text-xs font-semibold text-navy-400">
            {isAr ? `صفحة ${page}` : `Page ${page}`}
          </p>
        </nav>
      )}
    </>
  );
}
