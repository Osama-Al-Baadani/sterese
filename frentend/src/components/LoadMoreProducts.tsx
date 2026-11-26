"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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

// Replaces page-number navigation with automatic loading as the customer
// scrolls near the bottom — a sentinel element below the grid triggers the
// next page once it enters the viewport, no button/click needed.
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
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      // Starts the fetch a bit before the sentinel is actually on-screen, so
      // the next page is usually ready by the time the customer scrolls to
      // the end of the current one — feels continuous rather than pausing.
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, page]);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    const nextPage = page + 1;
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
    params.set("page", String(nextPage));
    // One extra item, same trick as the initial server fetch — if it comes
    // back, there's a next page after this one.
    params.set("per_page", String(PAGE_SIZE + 1));

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      const fetched: Product[] = await res.json();
      setHasMore(fetched.length > PAGE_SIZE);
      setProducts((prev) => [...prev, ...fetched.slice(0, PAGE_SIZE)]);
      setPage(nextPage);
    } catch {
      // leave hasMore as-is — the button just stays put for a retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(20%-0.8rem)]"
          >
            <ProductCard product={p} locale={locale} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />}
        </div>
      )}
    </>
  );
}
