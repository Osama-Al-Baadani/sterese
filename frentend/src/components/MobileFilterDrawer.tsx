"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import type { Brand } from "@/lib/types";
import BrowseFilters from "./BrowseFilters";

export default function MobileFilterDrawer({
  brands,
  current,
  activeCount,
  onApply,
  onReset,
}: {
  brands: Brand[];
  current: {
    search?: string;
    category?: string;
    brand?: string;
    sort: string;
    inStock: boolean;
    minPrice?: string;
    maxPrice?: string;
  };
  activeCount: number;
  onApply?: (next: { brand: string; minPrice: string; maxPrice: string; inStock: boolean }) => void;
  onReset?: () => void;
}) {
  const t = useTranslations("browse");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-navy-900/12 bg-white px-3.5 py-2 text-sm font-bold text-navy-900 shadow-xs transition active:scale-[0.98] hover:border-brand-500 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden />
        <span>{t("filters")}</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label={t("filters")}>
          <div
            className="fixed inset-0 bg-navy-900/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-900/8 px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-brand-600" aria-hidden />
                <h2 className="text-base font-extrabold text-navy-900">{t("filters")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-navy-500 hover:bg-navy-900/5"
                aria-label={tCommon("close")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto p-5 pb-8">
              <BrowseFilters
                brands={brands}
                current={current}
                onApplied={() => setOpen(false)}
                onApply={onApply}
                onReset={onReset}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
