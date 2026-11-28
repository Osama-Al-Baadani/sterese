"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryStyle } from "@/lib/category-style";
import { Link } from "@/i18n/navigation";
import type { DeptItem } from "./CategoryGrid";

export default function CategoryGridRow({ items }: { items: DeptItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Mouse drag-to-scroll state for desktop
  const dragState = useRef({ active: false, moved: false, startX: 0, startScrollLeft: 0 });

  const pageCount = Math.max(1, Math.ceil(items.length / 5));
  const activePage = Math.min(page, pageCount - 1);

  const checkOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 6);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow, items]);

  function scrollStep(dir: "prev" | "next") {
    const el = scrollerRef.current;
    if (!el) return;
    const isRtl = getComputedStyle(el).direction === "rtl";
    const delta = dir === "next" ? (isRtl ? -360 : 360) : isRtl ? 360 : -360;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  function scrollToPage(targetPage: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const ratio = pageCount > 1 ? targetPage / (pageCount - 1) : 0;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({
      left: isRtl ? -ratio * maxScroll : ratio * maxScroll,
      behavior: "smooth",
    });
    setPage(targetPage);
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollWidth - el.clientWidth);
    const progressed = Math.abs(el.scrollLeft) / maxScroll;
    setPage(Math.min(pageCount - 1, Math.round(progressed * (pageCount - 1))));
  }

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      moved: false,
      startX: e.pageX,
      startScrollLeft: el.scrollLeft,
    };
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el || !dragState.current.active) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 5) {
      dragState.current.moved = true;
    }
    el.scrollLeft = dragState.current.startScrollLeft - dx;
  }

  function onMouseUpOrLeave() {
    dragState.current.active = false;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 sm:gap-3">
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollStep("prev")}
            aria-label="عرض السابق"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-700 shadow-md shadow-navy-900/5 transition-all duration-300 hover:scale-105 hover:border-brand-500 hover:bg-brand-600 hover:text-navy-900 sm:flex"
          >
            <ChevronRight className="h-5 w-5 ltr:rotate-180" aria-hidden />
          </button>
        )}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={onMouseUpOrLeave}
          className={`-mx-4 flex min-w-0 flex-1 flex-nowrap items-stretch gap-2.5 overflow-x-auto scroll-smooth px-4 pt-1 pb-2 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:gap-5 sm:px-1 sm:pt-2 sm:pb-3 ${
            !hasOverflow ? "sm:justify-center" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          {items.map((item, i) => {
            const { Icon } = categoryStyle(item.label, i);
            return (
              <Link
                key={`${item.isTag ? "tag" : "cat"}-${item.id}`}
                href={item.isTag ? `/browse?tag=${item.id}` : `/browse?category=${item.id}`}
                prefetch={true}
                draggable={false}
                onClick={(e) => {
                  if (dragState.current.moved) {
                    e.preventDefault();
                    dragState.current.moved = false;
                  }
                }}
                className="group flex w-[96px] shrink-0 flex-col rounded-t-[999px] rounded-b-[18px] border border-navy-900/[0.09] bg-white p-1.5 shadow-[0_4px_14px_-6px_rgba(26,39,66,0.12)] transition-all duration-300 ease-out active:scale-95 sm:w-[158px] sm:rounded-b-[30px] sm:p-2.5 sm:shadow-[0_6px_22px_-10px_rgba(26,39,66,0.13)] sm:hover:-translate-y-2 hover:border-brand-500/60 sm:hover:shadow-[0_14px_30px_-10px_rgba(26,39,66,0.16)] lg:w-[170px]"
              >
                {/* Pure White Sculpted Arch Window */}
                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-[999px] rounded-b-[13px] border border-navy-900/[0.07] bg-white p-2.5 transition-colors duration-300 group-hover:border-brand-500/35 sm:rounded-b-[22px] sm:p-5">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      width={160}
                      height={160}
                      draggable={false}
                      className="relative z-10 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110"
                    />
                  ) : item.emoji ? (
                    <span className="relative z-10 text-2xl transition-transform duration-300 group-hover:scale-110 sm:text-5xl">
                      {item.emoji}
                    </span>
                  ) : (
                    <Icon
                      className="relative z-10 h-7 w-7 text-navy-600 transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-700 sm:h-12 sm:w-12"
                      aria-hidden
                    />
                  )}
                </span>

                {/* Pure white icon badge on the arch seam */}
                <span
                  aria-hidden
                  className="relative z-20 mx-auto -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-2xs transition-all duration-300 group-hover:scale-110 group-hover:border-brand-700 group-hover:bg-brand-700 group-hover:text-white sm:-mt-3.5 sm:h-7 sm:w-7"
                >
                  <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                </span>

                {/* Pedestal Label */}
                <span className="mt-1 flex min-h-[1.9rem] items-center justify-center px-0.5 pb-0.5 text-center text-[11px] font-extrabold leading-[1.28] text-navy-900 transition-colors duration-300 group-hover:text-brand-700 sm:mt-2 sm:min-h-[2.4rem] sm:px-1.5 sm:pb-1 sm:text-[13.5px] sm:leading-snug">
                  <span className="line-clamp-2">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollStep("next")}
            aria-label="عرض المزيد"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-700 shadow-md shadow-navy-900/5 transition-all duration-300 hover:scale-105 hover:border-brand-500 hover:bg-brand-600 hover:text-navy-900 sm:flex"
          >
            <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden />
          </button>
        )}
      </div>

      {hasOverflow && pageCount > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 sm:mt-4 sm:gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`صفحة ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${
                i === activePage
                  ? "w-5 bg-brand-600 shadow-2xs sm:w-7"
                  : "w-1.5 bg-navy-900/15 hover:bg-navy-900/30 sm:w-2"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
