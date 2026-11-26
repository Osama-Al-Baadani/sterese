"use client";

import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
}: {
  items: Category[];
  activeId: number | null;
  base: Record<string, string | undefined>;
  locale: string;
  prevLabel: string;
  moreLabel: string;
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
        className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-1 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((c) => {
          const active = c.id === activeId;
          return (
            <Link
              key={c.id}
              href={hrefFor(base, c.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-navy-900/10 bg-white text-navy-700 hover:border-brand-300 hover:bg-brand-50"
              }`}
            >
              {localizedName(c, locale)}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-240)}
        aria-label={moreLabel}
        className="hidden shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white p-1 text-navy-500 shadow-sm transition hover:text-brand-700 sm:flex"
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
}: {
  categories: Category[];
  selectedId: number | null;
  base: Record<string, string | undefined>;
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
        <Link href={hrefFor(base, null)} className="inline-block text-xs font-semibold text-navy-500 underline hover:text-brand-700">
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
        />
      ))}
    </div>
  );
}
