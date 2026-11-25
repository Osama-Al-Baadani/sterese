"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryStyle } from "@/lib/category-style";
import { Link } from "@/i18n/navigation";
import type { DeptItem } from "./CategoryGrid";

export default function CategoryGridRow({ items }: { items: DeptItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / 5));

  // In RTL, scrollLeft grows increasingly negative as content moves left —
  // same rule as the other scroll rows on this site (category tabs, home
  // section products).
  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const progressed = Math.abs(el.scrollLeft) / Math.max(1, el.scrollWidth - el.clientWidth);
    setPage(Math.min(pageCount - 1, Math.round(progressed * (pageCount - 1))));
  }

  useEffect(() => {
    setPage(0);
  }, [items]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 overflow-hidden">
        <button
          type="button"
          onClick={() => scrollBy(320)}
          aria-label="عرض السابق"
          className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-2 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6"
        >
          {items.map((item, i) => {
            const { fg, Icon } = categoryStyle(item.label, i);
            return (
              <Link
                key={`${item.isTag ? "tag" : "cat"}-${item.id}`}
                href={item.isTag ? `/browse?tag=${item.id}` : `/browse?category=${item.id}`}
                // Exactly 4 fit the row on mobile (no partial 5th item peeking
                // in) regardless of screen width — computed from the row's
                // actual available width minus the 3 gaps between them (12px
                // each on mobile, matching the scroller's gap-3 above), rather
                // than a fixed px width that only happened to fit ~3.3 items.
                // Back to a fixed, larger size from sm: up, where the row has
                // room to spare and a horizontal-scroll hint is fine.
                className="group flex w-[calc((100%-36px)/4)] shrink-0 flex-col items-center gap-2 text-center sm:w-36 sm:gap-3"
              >
                {item.imageUrl ? (
                  // No background circle — the source image already carries
                  // its own background/shape, same reasoning as the home
                  // sections' product images.
                  <span className="flex aspect-square w-full items-center justify-center transition group-hover:scale-105 sm:h-40 sm:w-40">
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      width={160}
                      height={160}
                      className="h-full w-full object-contain"
                    />
                  </span>
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center rounded-full border border-navy-900/8 bg-white shadow-sm transition group-hover:scale-105 group-hover:shadow-md sm:h-36 sm:w-36">
                    {item.emoji ? (
                      <span className="text-2xl sm:text-4xl">{item.emoji}</span>
                    ) : (
                      <Icon className={`h-6 w-6 sm:h-10 sm:w-10 ${fg}`} aria-hidden />
                    )}
                  </span>
                )}
                <span className="line-clamp-2 text-xs font-semibold text-navy-700 sm:text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(-320)}
          aria-label="عرض المزيد"
          className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-2 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-5 bg-brand-600" : "w-1.5 bg-navy-900/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
