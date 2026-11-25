import { getTranslations } from "next-intl/server";
import type { HomeSection, Product } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import HomeSectionProducts from "./HomeSectionProducts";
import SectionBannerCarousel from "./SectionBannerCarousel";

export interface HomeSectionWithProducts {
  section: HomeSection;
  products: Product[];
}

export default async function HomeSections({ sections }: { sections: HomeSectionWithProducts[] }) {
  const visible = sections.filter((s) => s.products.length > 0);
  if (visible.length === 0) return null;
  const t = await getTranslations("home");

  return (
    <div className="bg-white">
      {visible.map(({ section, products }) => {
        const seeAllHref =
          section.source_type === "tag" && section.source_ids[0]
            ? `/browse?tag=${section.source_ids[0]}`
            : section.source_type === "category" && section.source_ids[0]
              ? `/browse?category=${section.source_ids[0]}`
              : "/browse";

        return (
          <section key={section.id} className="border-t border-navy-900/5 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionBannerCarousel banners={section.banners_web} title={section.title} />

              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy-900 sm:text-2xl">
                  {section.icon && <span aria-hidden>{section.icon}</span>}
                  {section.title}
                </h2>
                <Link href={seeAllHref} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
                  {t("seeAll")}
                </Link>
              </div>

              <HomeSectionProducts products={products} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
