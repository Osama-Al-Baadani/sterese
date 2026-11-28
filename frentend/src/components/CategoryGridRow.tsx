"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryStyle } from "@/lib/category-style";
import { Link } from "@/i18n/navigation";
import type { DeptItem } from "./CategoryGrid";

const CARD_THEMES = [
  {
    dome: "from-amber-100/95 via-amber-50/80 to-orange-50/40",
    ring: "border-amber-200/75 group-hover:border-amber-400",
    glow: "hover:shadow-amber-500/15",
    badge: "bg-amber-100 text-amber-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-amber-300/30",
  },
  {
    dome: "from-sky-100/95 via-sky-50/80 to-cyan-50/40",
    ring: "border-sky-200/75 group-hover:border-sky-400",
    glow: "hover:shadow-sky-500/15",
    badge: "bg-sky-100 text-sky-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-sky-300/30",
  },
  {
    dome: "from-rose-100/90 via-pink-50/80 to-rose-50/35",
    ring: "border-rose-200/75 group-hover:border-rose-400",
    glow: "hover:shadow-rose-500/15",
    badge: "bg-rose-100 text-rose-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-rose-300/30",
  },
  {
    dome: "from-emerald-100/90 via-teal-50/80 to-emerald-50/35",
    ring: "border-emerald-200/75 group-hover:border-emerald-400",
    glow: "hover:shadow-emerald-500/15",
    badge: "bg-emerald-100 text-emerald-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-emerald-300/30",
  },
  {
    dome: "from-violet-100/90 via-purple-50/80 to-indigo-50/35",
    ring: "border-violet-200/75 group-hover:border-violet-400",
    glow: "hover:shadow-violet-500/15",
    badge: "bg-violet-100 text-violet-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-violet-300/30",
  },
  {
    dome: "from-orange-100/90 via-amber-50/75 to-yellow-50/35",
    ring: "border-orange-200/75 group-hover:border-orange-400",
    glow: "hover:shadow-orange-500/15",
    badge: "bg-orange-100 text-orange-700 group-hover:bg-brand-700 group-hover:text-white",
    orb: "bg-orange-300/30",
  },
];

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
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white/95 text-navy-700 shadow-md shadow-navy-900/5 backdrop-blur-xs transition-all duration-300 hover:scale-105 hover:border-brand-500 hover:bg-brand-600 hover:text-navy-900 sm:flex"
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
          className={`flex min-w-0 flex-1 flex-nowrap items-stretch gap-3.5 overflow-x-auto scroll-smooth px-1 pt-2 pb-3 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 ${
            !hasOverflow ? "sm:justify-center" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          {items.map((item, i) => {
            const { fg, Icon } = categoryStyle(item.label, i);
            const theme = CARD_THEMES[i % CARD_THEMES.length];
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
                className={`group flex w-[132px] shrink-0 flex-col rounded-t-[999px] rounded-b-[26px] border border-navy-900/[0.08] bg-white p-2 shadow-[0_8px_22px_-12px_rgba(26,39,66,0.14)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-brand-500/60 hover:shadow-xl sm:w-[164px] sm:rounded-b-[30px] sm:p-2.5 lg:w-[174px] ${theme.glow}`}
              >
                {/* Sculpted Arch Dome */}
                <span
                  className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-[999px] rounded-b-[20px] border bg-gradient-to-b p-[18px] transition-all duration-300 sm:rounded-b-[22px] sm:p-5 ${theme.dome} ${theme.ring}`}
                >
                  {/* Soft crown highlight & inner hairline frame */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3 top-1.5 h-1/2 rounded-t-full bg-gradient-to-b from-white/80 to-transparent"
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute h-[70%] w-[70%] rounded-full blur-md transition-transform duration-500 group-hover:scale-125 ${theme.orb}`}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-2 rounded-t-[999px] rounded-b-[14px] border border-white/75"
                  />

                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      width={160}
                      height={160}
                      draggable={false}
                      className="relative z-10 h-full w-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110"
                    />
                  ) : item.emoji ? (
                    <span className="relative z-10 text-4xl transition-transform duration-300 group-hover:scale-110 sm:text-5xl">
                      {item.emoji}
                    </span>
                  ) : (
                    <Icon
                      className={`relative z-10 h-10 w-10 transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 ${fg}`}
                      aria-hidden
                    />
                  )}
                </span>

                {/* Floating category icon jewel on the arch seam */}
                <span
                  aria-hidden
                  className={`relative z-20 mx-auto -mt-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-xs transition-all duration-300 group-hover:scale-110 ${theme.badge}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                {/* Pedestal Label */}
                <span className="mt-1.5 flex min-h-[2.4rem] items-center justify-center px-1.5 pb-1 text-center text-xs font-extrabold leading-snug text-navy-900 transition-colors duration-300 group-hover:text-brand-700 sm:mt-2 sm:text-[13.5px]">
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
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white/95 text-navy-700 shadow-md shadow-navy-900/5 backdrop-blur-xs transition-all duration-300 hover:scale-105 hover:border-brand-500 hover:bg-brand-600 hover:text-navy-900 sm:flex"
          >
            <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden />
          </button>
        )}
      </div>

      {hasOverflow && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`صفحة ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activePage
                  ? "w-7 bg-gradient-to-r from-brand-600 to-gold-400 shadow-2xs"
                  : "w-2 bg-navy-900/15 hover:bg-navy-900/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
