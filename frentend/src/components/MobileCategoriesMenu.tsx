"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildCategoryIndex } from "@/lib/category-tree";
import { localizedName } from "@/lib/i18n-helpers";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Category } from "@/lib/types";

export default function MobileCategoriesMenu({
  categories,
  locale,
}: {
  categories: Category[];
  locale: string;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const tree = useMemo(() => buildCategoryIndex(categories), [categories]);
  const roots = tree.roots;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="order-last flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white/40 text-navy-900 transition hover:bg-white/70 md:hidden"
        aria-label={t("categories")}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="relative me-0 ms-auto flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-navy-900/8 p-4">
                <span className="font-extrabold text-navy-900">{t("categories")}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-navy-500 hover:bg-navy-900/5"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              {/* Moved here from the header on mobile — freed up width for the
                  search box, which was the whole point of this move. */}
              <div className="flex items-center justify-between border-b border-navy-900/8 px-4 py-3">
                <span className="text-sm font-bold text-navy-900">{t("language")}</span>
                <LanguageSwitcher />
              </div>

              <div className="flex-1 p-2">
                {roots.map((root) => {
                  const kids = tree.getChildren(root.id);
                  if (kids.length === 0) {
                    return (
                      <Link
                        key={root.id}
                        href={`/browse?category=${root.id}`}
                        prefetch={true}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-3 text-sm font-bold text-navy-900 hover:bg-navy-900/5"
                      >
                        {localizedName(root, locale)}
                      </Link>
                    );
                  }
                  return (
                    <details key={root.id} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-navy-900 hover:bg-navy-900/5">
                        <Link href={`/browse?category=${root.id}`} prefetch={true} onClick={() => setOpen(false)}>
                          {localizedName(root, locale)}
                        </Link>
                        <ChevronDown className="h-4 w-4 shrink-0 text-navy-400 transition group-open:rotate-180" aria-hidden />
                      </summary>
                      <div className="mb-1 space-y-0.5 ps-5">
                        {kids.map((kid) => (
                          <Link
                            key={kid.id}
                            href={`/browse?category=${kid.id}`}
                            prefetch={true}
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm text-navy-600 hover:bg-navy-900/5"
                          >
                            {localizedName(kid, locale)}
                          </Link>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}