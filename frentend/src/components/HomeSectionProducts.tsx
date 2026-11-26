"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function HomeSectionProducts({ products }: { products: Product[] }) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // In RTL, modern browsers scroll into increasingly negative scrollLeft as
  // content moves left (further from the start) — so "reveal more" and
  // "back to start" are -240/+240 here, not the other way around. Same rule
  // already used for the category tabs scroller.
  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center gap-1 overflow-hidden">
      <button
        type="button"
        onClick={() => scrollBy(320)}
        aria-label={tCommon("showPrevious")}
        className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-1.5 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="w-40 shrink-0 sm:w-52">
            <ProductCard product={product} locale={locale} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-320)}
        aria-label={tCommon("showMore")}
        className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-1.5 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
