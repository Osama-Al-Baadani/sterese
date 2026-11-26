import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig, getBrands, getCategories, getProducts } from "@/lib/api";
import { childrenOf, descendantIds, hasProducts } from "@/lib/category-tree";
import { localizedAlternates, localizedName, localizedPath } from "@/lib/i18n-helpers";
import Breadcrumbs from "@/components/Breadcrumbs";
import BrowseInteractive from "@/components/BrowseInteractive";
import CategorySections from "@/components/CategorySections";
import CategoryTabs from "@/components/CategoryTabs";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { safeJsonLd } from "@/lib/format";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Sort/price/stock filters shouldn't fragment indexing into near-duplicate
// pages — canonical collapses to just the category (or the bare listing),
// which is the only distinction worth Google treating as a separate page.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ locale }, sp, t] = await Promise.all([
    params,
    searchParams,
    params.then(({ locale: l }) => getTranslations({ locale: l, namespace: "browse" })),
  ]);
  const category = one(sp.category);
  const canonical = category ? `/browse?category=${category}` : "/browse";

  const catObj = category
    ? (await getCategories()).find((c) => c.id === Number(category))
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
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "browse" }),
    getTranslations({ locale, namespace: "nav" }),
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

  const categories = await getCategories();

  // Picking a parent category shows everything under it, not just products
  // tagged directly on that parent — so the filter sent to the backend is
  // the selected category plus every one of its descendants.
  const selectedId = category ? Number(category) : null;
  const categoryFilter =
    selectedId !== null ? descendantIds(categories, selectedId).join(",") : undefined;

  // A selected category with its own subcategories groups results into one
  // section per subcategory (see CategorySections) instead of one flat grid
  // mixing every descendant together — matches how the app's browse tab
  // presents a parent category. Only when the visit is a plain category
  // browse though: an active search or brand filter means the customer
  // wants a single filtered list, not a grouped overview.
  const directChildren = selectedId !== null
    ? childrenOf(categories, selectedId).filter((c) => hasProducts(categories, c.id))
    : [];
  const showGrouped = directChildren.length > 0 && !search && !brand;

  // The backend doesn't return a total count, so "is there a next page" is
  // inferred by asking for one extra item — if it comes back, there's more.
  const [fetched, brands, config] = await Promise.all([
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
    getBrands(),
    getAppConfig(),
  ]);
  const hasMore = fetched.length > PAGE_SIZE;
  const products = fetched.slice(0, PAGE_SIZE);

  const activeCategory = selectedId ? categories.find((c) => c.id === selectedId) : null;
  const activeCategoryName = activeCategory ? localizedName(activeCategory, locale) : null;
  const pageTitle = search ? t("searchResults", { query: search }) : activeCategoryName || t("title");

  // Lets Google understand this is a product-listing page (not just a page
  // that happens to contain products) and can surface individual items —
  // only for the flat grid; the grouped-by-subcategory view mixes several
  // distinct lists and isn't a single meaningful ItemList.
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
          <Breadcrumbs
            items={[
              { label: tNav("home"), href: "/" },
              { label: activeCategoryName || t("title") },
            ]}
          />

          {showGrouped ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-navy-900">{pageTitle}</h1>
              </div>
              <CategoryTabs
                categories={categories}
                selectedId={selectedId}
                base={{ brand, sort, in_stock: inStock ? "1" : undefined }}
              />
              <CategorySections subcategories={directChildren} categories={categories} />
            </>
          ) : (
            <BrowseInteractive
              key={[search, category, brand, tag, sort, minPrice, maxPrice, inStock, page].join("|")}
              title={pageTitle}
              initialProducts={products}
              initialHasMore={hasMore}
              brands={brands}
              categories={categories}
              selectedId={selectedId}
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
          )}
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
