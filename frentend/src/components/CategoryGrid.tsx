import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import { Link } from "@/i18n/navigation";
import CategoryGridRow from "./CategoryGridRow";

export interface DeptItem {
  id: number;
  label: string;
  imageUrl?: string | null;
  emoji?: string | null;
  isTag: boolean;
}

export default async function CategoryGrid({ items }: { items: DeptItem[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/55 via-brand-50/20 to-white py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-3 py-1 text-[11px] font-extrabold text-brand-700">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              {t("everythingInOnePlace")}
            </span>
            <h2 className="text-xl font-black tracking-tight text-navy-900 sm:text-2xl lg:text-3xl">
              {t("shopByDepartment")}
            </h2>
          </div>

          <Link
            href="/browse"
            prefetch={true}
            className="inline-flex items-center gap-1 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-extrabold text-navy-800 shadow-xs transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 sm:text-sm"
          >
            {t("seeAll")}
          </Link>
        </div>

        <CategoryGridRow items={items} />
      </div>
    </section>
  );
}
