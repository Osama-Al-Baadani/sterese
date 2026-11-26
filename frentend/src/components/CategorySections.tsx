import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProducts } from "@/lib/api";
import { descendantIds } from "@/lib/category-tree";
import { localizedName } from "@/lib/i18n-helpers";
import type { Category } from "@/lib/types";
import HomeSectionProducts from "./HomeSectionProducts";

const PREVIEW_COUNT = 8;

// Browsing a category that has subcategories shows one section per child
// (a small product preview + "عرض الكل" into that child) instead of a single
// flat grid mixing every descendant together — matches how the app's browse
// tab groups a parent category's children, rather than dumping everything
// mixed in one undifferentiated list.
export default async function CategorySections({
  subcategories,
  categories,
}: {
  subcategories: Category[];
  categories: Category[];
}) {
  const sections = await Promise.all(
    subcategories.map(async (c) => ({
      category: c,
      products: await getProducts({
        category: descendantIds(categories, c.id).join(","),
        orderby: "popularity",
        order: "desc",
        perPage: PREVIEW_COUNT,
      }),
    })),
  );

  const visible = sections.filter((s) => s.products.length > 0);
  if (visible.length === 0) return null;
  const [locale, tHome] = await Promise.all([getLocale(), getTranslations("home")]);

  return (
    <div className="space-y-8">
      {visible.map(({ category, products }) => (
        <div key={category.id}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-navy-900">{localizedName(category, locale)}</h2>
            <Link
              href={`/browse?category=${category.id}`}
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              {tHome("seeAll")}
            </Link>
          </div>
          <HomeSectionProducts products={products} />
        </div>
      ))}
    </div>
  );
}
