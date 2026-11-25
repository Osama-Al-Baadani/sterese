import { getTranslations } from "next-intl/server";
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
    <section className="bg-brand-50/40 py-6 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 text-center sm:mb-8">
          <h2 className="text-xl font-extrabold text-navy-900 sm:text-3xl">
            {t("shopByDepartment")}
          </h2>
          <p className="mt-1.5 text-sm text-navy-500 sm:mt-2 sm:text-base">{t("everythingInOnePlace")}</p>
        </div>

        <CategoryGridRow items={items} />
      </div>
    </section>
  );
}
