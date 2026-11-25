"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "popularity-desc", label: "الأكثر مبيعاً" },
  { value: "date-desc", label: "الأحدث" },
  { value: "price-asc", label: "السعر: من الأقل" },
  { value: "price-desc", label: "السعر: من الأعلى" },
];

export default function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "popularity-desc") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page"); // changing sort starts back at page 1
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  }

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm">
      <span className="hidden font-semibold text-navy-500 sm:inline">الترتيب:</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm font-semibold text-navy-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
