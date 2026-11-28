"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ancestorChain, buildCategoryIndex } from "@/lib/category-tree";
import { categoryStyle } from "@/lib/category-style";
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

function isPlainClick(e: React.MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function TabRow({
  items,
  activeId,
  base,
  locale,
  prevLabel,
  moreLabel,
  onSelectCategory,
  onHoverCategory,
  compact = false,
}: {
  items: Category[];
  activeId: number | null;
  base: Record<string, string | undefined>;
  locale: string;
  prevLabel: string;
  moreLabel: string;
  onSelectCategory?: (categoryId: number | null) => void;
  onHoverCategory?: (categoryId: number | null) => void;
  compact?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center gap-1 overflow-hidden">
      <button
        type="button"
        onClick={() => scrollBy(240)}
        aria-label={prevLabel}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-sm transition hover:border-brand-500 hover:text-brand-700 sm:flex"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto scroll-smooth px-0.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((c, i) => {
          const active = c.id === activeId;
          const { Icon } = categoryStyle(c.name, i);
          const img = c.image?.src;
          return (
            <Link
              key={c.id}
              href={hrefFor(base, c.id)}
              prefetch={true}
              onMouseEnter={() => onHoverCategory?.(c.id)}
              onTouchStart={() => onHoverCategory?.(c.id)}
              onClick={(e) => {
                if (onSelectCategory && isPlainClick(e)) {
                  e.preventDefault();
                  onSelectCategory(c.id);
                }
              }}
              className={`group flex shrink-0 items-center rounded-full border transition-all duration-300 ${
                compact ? "gap-2 py-1 ps-1 pe-3.5" : "gap-2.5 py-1.5 ps-1.5 pe-4"
              } ${
                active
                  ? "border-brand-600 bg-brand-50 shadow-[0_6px_16px_-6px_rgba(240,178,31,0.55)] ring-1 ring-brand-600"
                  : "border-navy-900/10 bg-white shadow-[0_3px_10px_-6px_rgba(26,39,66,0.18)] hover:-translate-y-0.5 hover:border-brand-500/60 hover:shadow-[0_8px_18px_-8px_rgba(26,39,66,0.2)]"
              }`}
            >
              <span
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white ${
                  compact ? "h-8 w-8 p-1" : "h-11 w-11 p-1.5"
                } ${active ? "border-brand-500" : "border-navy-900/[0.08]"}`}
              >
                {img ? (
                  <Image
                    src={img}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <Icon
                    className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${active ? "text-brand-700" : "text-navy-500"}`}
                    aria-hidden
                  />
                )}
              </span>
              <span
                className={`whitespace-nowrap font-extrabold transition-colors ${
                  compact ? "text-xs" : "text-[13px]"
                } ${active ? "text-navy-900" : "text-navy-800 group-hover:text-brand-700"}`}
              >
                {localizedName(c, locale)}
              </span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-240)}
        aria-label={moreLabel}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-600 shadow-sm transition hover:border-brand-500 hover:text-brand-700 sm:flex"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default function CategoryTabs({
  categories,
  selectedId,
  base,
  onSelectCategory,
  onHoverCategory,
}: {
  categories: Category[];
  selectedId: number | null;
  base: Record<string, string | undefined>;
  onSelectCategory?: (categoryId: number | null) => void;
  onHoverCategory?: (categoryId: number | null) => void;
}) {
  const locale = useLocale();
  const tBrowse = useTranslations("browse");
  const tCommon = useTranslations("common");
  const tree = useMemo(() => buildCategoryIndex(categories), [categories]);
  const roots = tree.roots;

  const chain = useMemo(() => ancestorChain(categories, selectedId), [categories, selectedId]);

  if (roots.length === 0) return null;

  const rows: { items: Category[]; activeId: number | null }[] = [
    { items: roots, activeId: chain[0]?.id ?? null },
  ];

  if (chain[0]) {
    const kids = tree.getChildren(chain[0].id);
    if (kids.length > 0) {
      rows.push({ items: kids, activeId: chain[1]?.id ?? null });
    }
  }

  return (
    <div className="mb-6 space-y-2">
      {selectedId !== null && (
        <Link
          href={hrefFor(base, null)}
          prefetch={true}
          onMouseEnter={() => onHoverCategory?.(null)}
          onClick={(e) => {
            if (onSelectCategory && isPlainClick(e)) {
              e.preventDefault();
              onSelectCategory(null);
            }
          }}
          className="inline-block text-xs font-semibold text-navy-500 underline hover:text-brand-700"
        >
          {tBrowse("clearCategory")}
        </Link>
      )}
      {rows.map((row, i) => (
        <TabRow
          key={i}
          items={row.items}
          activeId={row.activeId}
          base={base}
          locale={locale}
          prevLabel={tCommon("showPrevious")}
          moreLabel={tCommon("showMore")}
          onSelectCategory={onSelectCategory}
          onHoverCategory={onHoverCategory}
          compact={i > 0}
        />
      ))}
    </div>
  );
}
