"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryStyle } from "@/lib/category-style";
import { Link } from "@/i18n/navigation";
import type { DeptItem } from "./CategoryGrid";

const CARD_TINTS = [
  "from-amber-50/90 to-orange-50/40 group-hover:from-amber-100/80 group-hover:to-orange-50/60",
  "from-sky-50/90 to-cyan-50/40 group-hover:from-sky-100/80 group-hover:to-cyan-50/60",
  "from-rose-50/90 to-pink-50/40 group-hover:from-rose-100/80 group-hover:to-pink-50/60",
  "from-emerald-50/90 to-teal-50/40 group-hover:from-emerald-100/80 group-hover:to-teal-50/60",
  "from-violet-50/90 to-indigo-50/40 group-hover:from-violet-100/80 group-hover:to-indigo-50/60",
  "from-lime-50/90 to-emerald-50/40 group-hover:from-lime-100/80 group-hover:to-emerald-50/60",
];

export default function CategoryGridRow({ items }: { items: DeptItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / 5));
  const activePage = Math.min(page, pageCount - 1);

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

  const showArrows = items.length > 5;
  const compactCount = items.length <= 6;

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
          className={`flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth px-0.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 ${
            compactCount ? "sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible" : ""
          }`}
        >
          {items.map((item, i) => {
            const { fg, Icon } = categoryStyle(item.label, i);
            const tint = CARD_TINTS[i % CARD_TINTS.length];
            return (
              <Link
                key={`${item.isTag ? "tag" : "cat"}-${item.id}`}
                href={item.isTag ? `/browse?tag=${item.id}` : `/browse?category=${item.id}`}
                className={`group flex shrink-0 flex-col overflow-hidden rounded-2xl border border-navy-900/[0.07] bg-white p-2.5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/50 hover:shadow-lg hover:shadow-navy-900/10 sm:rounded-3xl sm:p-3 ${
                  compactCount ? "w-32 sm:w-auto" : "w-32 sm:w-44"
                }`}
              >
                <span
                  className={`relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br p-3 transition-colors duration-300 sm:rounded-2xl sm:p-4 ${tint}`}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      width={160}
                      height={160}
                      className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(26,39,66,0.12)] transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : item.emoji ? (
                    <span className="text-4xl transition-transform duration-300 group-hover:scale-110 sm:text-5xl">
                      {item.emoji}
                    </span>
                  ) : (
                    <Icon
                      className={`h-10 w-10 transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 ${fg}`}
                      aria-hidden
                    />
                  )}
                </span>

                <span className="mt-2.5 flex min-h-[2.25rem] items-center justify-center px-1 text-center text-xs font-extrabold leading-snug text-navy-900 transition-colors group-hover:text-brand-700 sm:mt-3 sm:text-[13.5px]">
                  <span className="line-clamp-2">{item.label}</span>
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
                i === activePage ? "w-5 bg-brand-600" : "w-1.5 bg-navy-900/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
