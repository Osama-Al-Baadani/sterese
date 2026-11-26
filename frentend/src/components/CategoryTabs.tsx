"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ancestorChain, buildCategoryIndex } from "@/lib/category-tree";
import { localizedName } from "@/lib/i18n-helpers";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/types";

function hrefFor(base: Record<string, string | undefined>, categoryId: number | null) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) params.set(k, v);
  }
  if (categoryId !== null) params.set("category", String(categoryId));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function TabRow({
  items,
  activeId,
  base,
  locale,
  prevLabel,
  moreLabel,
  variant = "primary",
  allLabel,
  showAllChip = false,
}: {
  items: Category[];
  activeId: number | null;
  base: Record<string, string | undefined>;
  locale: string;
  prevLabel: string;
  moreLabel: string;
  variant?: "primary" | "sub";
  allLabel?: string;
  showAllChip?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow, items]);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  const isSub = variant === "sub";

  return (
    <div className="relative flex items-center gap-1.5">
      {hasOverflow && (
        <button
          type="button"
          onClick={() => scrollBy(240)}
          aria-label={prevLabel}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-xs transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 sm:flex"
        >
          <ChevronRight className="h-4 w-4 ltr:rotate-180" aria-hidden />
        </button>
      )}

      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {showAllChip && allLabel && (
          <Link
            href={hrefFor(base, null)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold whitespace-nowrap transition-all sm:text-sm ${
              activeId === null
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                : "bg-navy-900/[0.04] text-navy-700 hover:bg-brand-50 hover:text-brand-800"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            {allLabel}
          </Link>
        )}

        {items.map((c) => {
          const active = c.id === activeId;
          return (
            <Link
              key={c.id}
              href={hrefFor(base, c.id)}
              className={`shrink-0 rounded-full whitespace-nowrap transition-all ${
                isSub
                  ? active
                    ? "bg-navy-900 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm"
                    : "border border-navy-900/8 bg-navy-900/[0.02] px-3.5 py-1.5 text-xs font-semibold text-navy-600 hover:border-navy-900/20 hover:bg-navy-900/[0.06] hover:text-navy-900"
                  : active
                    ? "bg-brand-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm shadow-brand-600/25 sm:text-sm"
                    : "bg-navy-900/[0.04] px-4 py-1.5 text-xs font-bold text-navy-700 hover:bg-brand-50 hover:text-brand-800 sm:text-sm"
              }`}
            >
              {localizedName(c, locale)}
            </Link>
          );
        })}
      </div>

      {hasOverflow && (
        <button
          type="button"
          onClick={() => scrollBy(-240)}
          aria-label={moreLabel}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-xs transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 sm:flex"
        >
          <ChevronLeft className="h-4 w-4 ltr:rotate-180" aria-hidden />
        </button>
      )}
    </div>
  );
}

export default function CategoryTabs({
  categories,
  selectedId,
  base,
}: {
  categories: Category[];
  selectedId: number | null;
  base: Record<string, string | undefined>;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tCommon = useTranslations("common");
  const tree = useMemo(() => buildCategoryIndex(categories), [categories]);
  const roots = tree.roots;

  const chain = useMemo(() => ancestorChain(categories, selectedId), [categories, selectedId]);

  if (roots.length === 0) return null;

  const kids = chain[0] ? tree.getChildren(chain[0].id) : [];

  return (
    <div className="mb-6 rounded-2xl border border-navy-900/8 bg-white p-3 shadow-xs sm:p-3.5">
      <TabRow
        items={roots}
        activeId={chain[0]?.id ?? null}
        base={base}
        locale={locale}
        prevLabel={tCommon("prev")}
        moreLabel={tCommon("more")}
        variant="primary"
        showAllChip
        allLabel={isAr ? "جميع الأقسام" : "All Categories"}
      />

      {kids.length > 0 && (
        <div className="mt-2.5 border-t border-navy-900/6 pt-2.5">
          <TabRow
            items={kids}
            activeId={chain[1]?.id ?? null}
            base={base}
            locale={locale}
            prevLabel={tCommon("prev")}
            moreLabel={tCommon("more")}
            variant="sub"
          />
        </div>
      )}
    </div>
  );
}
