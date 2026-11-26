import { getLocale, getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface FilterChip {
  key: string;
  label: string;
  href: string;
}

export default async function ActiveFilterChips({
  chips,
  clearAllHref,
}: {
  chips: FilterChip[];
  clearAllHref: string;
}) {
  if (chips.length === 0) return null;
  const [, t] = await Promise.all([getLocale(), getTranslations("browse")]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
        >
          <span>{c.label}</span>
          <X className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={clearAllHref}
          className="px-2 py-1 text-xs font-bold text-navy-500 underline hover:text-rose-600"
        >
          {t("clearFilters")}
        </Link>
      )}
    </div>
  );
}
