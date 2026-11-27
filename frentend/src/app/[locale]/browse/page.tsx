import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig, getBrands, getCategories, getCategorySections, getProducts } from "@/lib/api";
import { childrenOf, descendantIds, hasProducts } from "@/lib/category-tree";
import { localizedAlternates, localizedName, localizedPath } from "@/lib/i18n-helpers";
import BrowseInteractive from "@/components/BrowseInteractive";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { safeJsonLd } from "@/lib/format";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ locale }, sp, t, categories] = await Promise.all([
    params,
    searchParams,
    params.then(({ locale: l }) => getTranslations({ locale: l, namespace: "browse" })),
    getCategories(),
  ]);
  const category = one(sp.category);
  const canonical = category ? `/browse?category=${category}` : "/browse";

  const catObj = category
    ? categories.find((c) => c.id === Number(category))
    : undefined;
  const categoryName = catObj ? localizedName(catObj, locale) : undefined;
  const keywords = [
    categoryName,
    one(sp.search),
    locale === "ar" ? "المخازن الاقتصادية" : "Al Makhazen Al Eqtisadeya",
    locale === "ar" ? "تصفح المنتجات" : "Browse Products",
    locale === "ar" ? "عروض السعودية" : "Saudi Arabia deals",
  ].filter((k): k is string => Boolean(k));

  return {
    title: categoryName ?? t("title"),
    description: categoryName
      ? t("metaCategoryDescription", { category: categoryName })
      : t("metaDescription"),
    keywords,
    alternates: localizedAlternates(canonical, locale),
  };
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // Fetch shared storefront bootstrap (categories, brands, config) in ONE call
  const [t, tNav, categories, brands, config] = await Promise.all([
    getTranslations({ locale, namespace: "browse" }),
    getTranslations({ locale, namespace: "nav" }),
    getCategories(),
    getBrands(),
    getAppConfig(),
  ]);

  const search = one(sp.search);
  const category = one(sp.category);
  const brand = one(sp.brand);
  const tag = one(sp.tag);
  const minPrice = one(sp.min_price);
  const maxPrice = one(sp.max_price);
  const minPriceNum = minPrice && !Number.isNaN(Number(minPrice)) ? Number(minPrice) : undefined;
  const maxPriceNum = maxPrice && !Number.isNaN(Number(maxPrice)) ? Number(maxPrice) : undefined;
  const sort = one(sp.sort) ?? "popularity-desc";
  const inStock = one(sp.in_stock) === "1";
  const page = Math.max(1, Number(one(sp.page) ?? "1") || 1);
  const [orderby, order] = sort.split("-") as [
    "popularity" | "date" | "price",
    "asc" | "desc",
  ];

  const selectedId = category ? Number(category) : null;
  const categoryFilter =
    selectedId !== null ? descendantIds(categories, selectedId).join(",") : undefined;

  const directChildren =
    selectedId !== null
      ? childrenOf(categories, selectedId).filter((c) => hasProducts(categories, c.id))
      : [];
  const showGrouped = directChildren.length > 0 && !search && !brand;

  const [fetched, groupedSections] = await Promise.all([
    showGrouped
      ? Promise.resolve([])
      : getProducts({
          search,
          category: categoryFilter,
          brand,
          tag,
          orderby,
          order,
          minPrice: minPriceNum,
          maxPrice: maxPriceNum,
          inStockOnly: inStock,
          page,
          perPage: PAGE_SIZE + 1,
        }),
    showGrouped && selectedId !== null
      ? getCategorySections(selectedId, 8)
      : Promise.resolve([]),
  ]);
  const hasMore = fetched.length > PAGE_SIZE;
  const products = fetched.slice(0, PAGE_SIZE);

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const itemListSchema =
    !showGrouped && products.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: products.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${siteUrl}${localizedPath(`/product/${p.id}`, locale)}`,
          })),
        }
      : null;

  return (
    <>
      <Header />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }}
        />
      )}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <BrowseInteractive
            key={[search, category, brand, tag, sort, minPrice, maxPrice, inStock, page].join("|")}
            homeLabel={tNav("home")}
            defaultTitle={t("title")}
            initialProducts={products}
            initialHasMore={hasMore}
            initialGroupedSections={groupedSections}
            brands={brands}
            categories={categories}
            initialSelectedId={selectedId}
            initialState={{
              search,
              category,
              categoryFilter,
              brand,
              tag,
              sort,
              minPrice,
              maxPrice,
              inStock,
              page,
            }}
          />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
