import { getTranslations } from "next-intl/server";
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
    <section className="bg-white py-5 sm:py-11">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3.5 flex items-center justify-between gap-3 sm:mb-7">
          <h2 className="text-base font-extrabold text-navy-900 sm:text-2xl">
            {t("shopByDepartment")}
          </h2>

          <Link
            href="/browse"
            prefetch={true}
            className="shrink-0 text-xs font-bold text-brand-700 hover:underline sm:text-sm"
          >
            {t("seeAll")}
          </Link>
        </div>

        <CategoryGridRow items={items} />
      </div>
    </section>
  );
}
