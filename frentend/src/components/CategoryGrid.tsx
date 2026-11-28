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
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-amber-50/20 to-white py-8 sm:py-12">
      {/* Ambient soft background accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 start-1/4 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 end-12 h-56 w-56 rounded-full bg-brand-700/[0.05] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-7">
          <h2 className="text-xl font-extrabold text-navy-900 sm:text-2xl">
            {t("shopByDepartment")}
          </h2>

          <Link
            href="/browse"
            prefetch={true}
            className="shrink-0 text-sm font-bold text-brand-700 hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>

        <CategoryGridRow items={items} />
      </div>
    </section>
  );
}
