"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildCategoryIndex } from "@/lib/category-tree";
import { localizedName } from "@/lib/i18n-helpers";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/types";

export default function CategoryNavBar({ categories, locale }: { categories: Category[]; locale: string }) {
  const t = useTranslations("nav");
  const [openId, setOpenId] = useState<number | null>(null);

  const tree = useMemo(() => buildCategoryIndex(categories), [categories]);
  const roots = tree.roots;

  if (roots.length === 0) return null;

  const openKids = openId !== null ? tree.getChildren(openId) : [];

  return (
    <nav
      className="relative z-30 hidden border-b border-navy-900/8 bg-white md:block"
      onMouseLeave={() => setOpenId(null)}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-2.5 text-sm font-semibold text-navy-700 sm:px-6 lg:px-8">
        <Link href="/" prefetch={true} className="whitespace-nowrap transition hover:text-brand-700">
          {t("home")}
        </Link>
        <Link href="/browse" prefetch={true} className="whitespace-nowrap transition hover:text-brand-700">
          {t("allDepartments")}
        </Link>

        {roots.map((root) => {
          const kids = tree.getChildren(root.id);
          return (
            <div key={root.id} className="shrink-0" onMouseEnter={() => setOpenId(root.id)}>
              <Link
                href={`/browse?category=${root.id}`}
                prefetch={true}
                className={`flex items-center gap-1 whitespace-nowrap py-1 transition hover:text-brand-700 ${openId === root.id ? "text-brand-700" : ""
                  }`}
              >
                {localizedName(root, locale)}
                {kids.length > 0 && (
                  <ChevronDown className={`h-3.5 w-3.5 transition ${openId === root.id ? "rotate-180" : ""}`} aria-hidden />
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {openId !== null && openKids.length > 0 && (
        <div
          className="absolute inset-x-0 top-full border-b border-navy-900/8 bg-white shadow-lg"
          onMouseEnter={() => setOpenId(openId)}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 sm:px-6 md:grid-cols-4 lg:grid-cols-6 lg:px-8">
            {openKids.map((kid) => {
              const grandkids = tree.getChildren(kid.id);
              return (
                <div key={kid.id}>
                  <Link
                    href={`/browse?category=${kid.id}`}
                    prefetch={true}
                    className="mb-2 block font-bold text-navy-900 transition hover:text-brand-700"
                  >
                    {localizedName(kid, locale)}
                  </Link>
                  <ul className="space-y-1.5 text-sm text-navy-500">
                    {grandkids.map((gk) => (
                      <li key={gk.id}>
                        <Link href={`/browse?category=${gk.id}`} prefetch={true} className="transition hover:text-brand-700">
                          {localizedName(gk, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}