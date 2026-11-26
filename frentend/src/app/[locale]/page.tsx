import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getAppConfig, getCategories, getHomeDepartments, getHomeSectionProducts, getHomeSections } from "@/lib/api";
import { hasProducts } from "@/lib/category-tree";
import { localizedAlternates, localizedName } from "@/lib/i18n-helpers";
import type { HomeSection } from "@/lib/types";
import AnnouncementBar from "@/components/AnnouncementBar";
import CategoryGrid, { type DeptItem } from "@/components/CategoryGrid";
import FeaturesRow from "@/components/FeaturesRow";
import Footer from "@/components/Footer";
import GridHero from "@/components/GridHero";
import Header from "@/components/Header";
import HomeSections from "@/components/HomeSections";
import PromoBanner from "@/components/PromoBanner";
import PromoCards from "@/components/PromoCards";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: localizedAlternates("/", locale),
  };
}

export default async function Home() {
  const [config, categories, departments, homeSections, locale, tHome] = await Promise.all([
    getAppConfig(),
    getCategories(),
    getHomeDepartments(),
    getHomeSections(),
    getLocale(),
    getTranslations("home"),
  ]);
  const { webCarouselBanners, gridTileBanners, gridStackBanners, promoCards, promoBottomCards, storeSettings } = config;

  let sectionsWithProducts = await Promise.all(
    homeSections.map(async (section) => {
      let localizedTitle = section.title;
      if (locale === "en" && /[\u0600-\u06FF]/.test(section.title)) {
        if (section.source_type === "category" && section.source_ids[0]) {
          const matchedCat = categories.find((c) => c.id === section.source_ids[0]);
          if (matchedCat) localizedTitle = localizedName(matchedCat, locale);
        } else if (section.source_type === "bestsellers") {
          localizedTitle = "Best Sellers";
        } else if (section.source_type === "featured") {
          localizedTitle = "Featured Products";
        }
      }
      return {
        section: localizedTitle !== section.title ? { ...section, title: localizedTitle } : section,
        products: await getHomeSectionProducts(section, categories),
      };
    }),
  );

  // Fallback when the admin hasn't added any "أقسام الرئيسية" yet: show one
  // product row per root category (with products anywhere in its subtree),
  // so imported departments appear on the home page automatically.
  if (sectionsWithProducts.every((s) => s.products.length === 0)) {
    const roots = categories.filter((c) => c.parent === 0 && hasProducts(categories, c.id));
    sectionsWithProducts = await Promise.all(
      roots.map(async (root) => {
        const section: HomeSection = {
          id: -root.id,
          title: localizedName(root, locale),
          icon: "",
          source_type: "category",
          source_id: root.id,
          source_ids: [root.id],
          product_ids: [],
          products_limit: 12,
          banner_url: "",
          banner_link: "",
          banner_url_web: "",
          banner_link_web: "",
          banners: [],
          banners_web: [],
        };
        return { section, products: await getHomeSectionProducts(section, categories) };
      }),
    );
  }

  // Same curated-with-fallback rule as the app's home screen: an admin pick
  // from "أيقونات الأقسام" (category or tag, any order) if one exists,
  // otherwise root categories only — never every category flattened
  // together regardless of level.
  const deptItems: DeptItem[] =
    departments.length > 0
      ? departments
        .map((d): DeptItem | null => {
          if (d.source_type === "tag") {
            return { id: d.id, label: d.title || tHome("tagFallback"), imageUrl: d.image_url, emoji: d.icon, isTag: true };
          }
          const cat = categories.find((c) => c.id === d.id);
          // A category picked here with nothing to show (no products
          // anywhere in its own subtree) would just be a dead end —
          // tags are left as-is since there's no product-count data for
          // them here to check against.
          if (!cat || !hasProducts(categories, cat.id)) return null;
          return { id: cat.id, label: localizedName(cat, locale), imageUrl: cat.image?.src, isTag: false };
        })
        .filter((item): item is DeptItem => item !== null)
      : categories
        .filter((c) => c.parent === 0 && hasProducts(categories, c.id))
        .map((c) => ({ id: c.id, label: localizedName(c, locale), imageUrl: c.image?.src, isTag: false }));

  return (
    <>
      <Header />
      {storeSettings.announcement_active && storeSettings.announcement_text && (
        <AnnouncementBar text={storeSettings.announcement_text} />
      )}
      <main className="flex-1">
        <h1 className="sr-only">
          {locale === "ar" ? "المخازن الاقتصادية - متجرك الإلكتروني الأول" : "Al Makhazen Al Eqtisadeya - Online Store"}
        </h1>
        <GridHero
          webCarouselBanners={webCarouselBanners}
          promoCards={promoCards}
          gridStackBanners={gridStackBanners}
          gridTileBanners={gridTileBanners}
        />
        <CategoryGrid items={deptItems} />
        <HomeSections sections={sectionsWithProducts} />
        <RecentlyViewedSection />
        <FeaturesRow badges={storeSettings.badges} />
        <PromoCards cards={promoBottomCards} />
        <PromoBanner />
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}