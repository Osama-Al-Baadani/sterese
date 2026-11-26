"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const SORT_VALUES = ["popularity-desc", "date-desc", "price-asc", "price-desc"] as const;

export default function SortSelect({
  current,
  onSortChange,
}: {
  current: string;
  onSortChange?: (value: string) => void;
}) {
  const t = useTranslations("browse");
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    if (onSortChange) {
      onSortChange(value);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (value === "popularity-desc") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  }

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm">
      <span className="hidden font-semibold text-navy-500 sm:inline">{t("sortBy")}</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm font-semibold text-navy-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      >
        {SORT_VALUES.map((val) => (
          <option key={val} value={val}>
            {t(`sort.${val}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
