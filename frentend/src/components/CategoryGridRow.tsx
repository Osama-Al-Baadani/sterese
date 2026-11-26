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

  const showArrows = items.length > 5;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-hidden">
        {showArrows && (
          <button
            type="button"
            onClick={() => scrollBy(320)}
            aria-label="عرض السابق"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-sm transition-all hover:scale-105 hover:border-brand-500 hover:bg-brand-500 hover:text-white sm:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        )}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className={`flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 ${
            items.length <= 6 ? "sm:justify-center" : ""
          }`}
        >
          {items.map((item, i) => {
            const { fg, Icon } = categoryStyle(item.label, i);
            return (
              <Link
                key={`${item.isTag ? "tag" : "cat"}-${item.id}`}
                href={item.isTag ? `/browse?tag=${item.id}` : `/browse?category=${item.id}`}
                className="group flex w-[calc((100%-36px)/4)] shrink-0 flex-col items-center gap-2.5 text-center sm:w-40 sm:gap-3"
              >
                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-white p-2.5 ring-1 ring-navy-900/8 shadow-xs transition-all duration-300 group-hover:-translate-y-1.5 group-hover:ring-brand-500/50 group-hover:shadow-xl group-hover:shadow-navy-900/10 sm:h-40 sm:w-40 sm:p-4">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      width={160}
                      height={160}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-108"
                    />
                  ) : item.emoji ? (
                    <span className="text-3xl transition-transform duration-300 group-hover:scale-110 sm:text-5xl">
                      {item.emoji}
                    </span>
                  ) : (
                    <Icon className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 ${fg}`} aria-hidden />
                  )}
                </span>
                <span className="line-clamp-2 text-xs font-bold text-navy-800 transition-colors group-hover:text-brand-700 sm:text-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {showArrows && (
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            aria-label="عرض المزيد"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-sm transition-all hover:scale-105 hover:border-brand-500 hover:bg-brand-500 hover:text-white sm:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        )}
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
