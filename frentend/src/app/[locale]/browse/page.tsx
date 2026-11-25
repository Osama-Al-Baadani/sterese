import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronDown, PackageSearch, SlidersHorizontal } from "lucide-react";
import { getAppConfig, getBrands, getCategories, getProducts } from "@/lib/api";
import { childrenOf, descendantIds, hasProducts } from "@/lib/category-tree";
import { hreflangAlternates } from "@/lib/i18n-helpers";
import Breadcrumbs from "@/components/Breadcrumbs";
import BrowseFilters from "@/components/BrowseFilters";
import CategorySections from "@/components/CategorySections";
import CategoryTabs from "@/components/CategoryTabs";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LoadMoreProducts from "@/components/LoadMoreProducts";
import SortSelect from "@/components/SortSelect";
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
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const category = one(sp.category);
  const canonical = category ? `/browse?category=${category}` : "/browse";

  const categoryName = category
    ? (await getCategories()).find((c) => c.id === Number(category))?.name
    : undefined;

  return {
    title: categoryName ?? "تصفح المنتجات",
    description: categoryName
      ? `تسوق ${categoryName} بأفضل الأسعار — عروض حصرية، جودة عالية، وتوصيل سريع من المخازن الاقتصادية.`
      : "تصفح كل تشكيلة منتجات المخازن الاقتصادية — عروض حصرية، جودة عالية، وتوصيل سريع.",
    alternates: {
      canonical,
      languages: hreflangAlternates(canonical),
    },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const search = one(sp.search);
  const category = one(sp.category);
  const brand = one(sp.brand);
  const tag = one(sp.tag);
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
          inStockOnly: inStock,
          page,
          perPage: PAGE_SIZE + 1,
        }),
    getBrands(),
    getAppConfig(),
  ]);
  const hasMore = fetched.length > PAGE_SIZE;
  const products = fetched.slice(0, PAGE_SIZE);

  const activeCategoryName = selectedId ? categories.find((c) => c.id === selectedId)?.name : null;

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
            url: `${siteUrl}/product/${p.id}`,
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
              { label: "الرئيسية", href: "/" },
              { label: activeCategoryName || "تصفح المنتجات" },
            ]}
          />

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-navy-900">
                {search ? `نتائج البحث عن "${search}"` : activeCategoryName || "تصفح المنتجات"}
              </h1>
              {!showGrouped && <p className="mt-1 text-sm text-navy-500">{products.length} منتج</p>}
            </div>
            {!showGrouped && (
              <Suspense fallback={null}>
                <SortSelect current={sort} />
              </Suspense>
            )}
          </div>

          <div className={showGrouped ? "" : "grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]"}>
            {!showGrouped && (
              <>
                <details className="rounded-2xl border border-navy-900/8 lg:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-bold text-navy-900">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden />
                      الفلاتر
                    </span>
                    <ChevronDown className="h-4 w-4 text-navy-400" aria-hidden />
                  </summary>
                  <div className="border-t border-navy-900/8 p-4">
                    <BrowseFilters
                      brands={brands}
                      current={{ search, category, brand, sort, inStock }}
                    />
                  </div>
                </details>

                <aside className="hidden lg:block lg:sticky lg:top-20 lg:h-fit">
                  <BrowseFilters
                    brands={brands}
                    current={{ search, category, brand, sort, inStock }}
                  />
                </aside>
              </>
            )}

            <div>
              <CategoryTabs
                categories={categories}
                selectedId={selectedId}
                // search deliberately excluded: picking a category tab means
                // "show me this category", not "this category AND my old
                // search text" — carrying the search term forward used to
                // filter the new category by an unrelated query and almost
                // always landed on an empty "لا توجد منتجات مطابقة" even
                // when the category clearly had products.
                base={{ brand, sort, in_stock: inStock ? "1" : undefined }}
              />

              {showGrouped ? (
                <CategorySections subcategories={directChildren} categories={categories} />
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-navy-900/10 py-20 text-center">
                  <PackageSearch className="h-12 w-12 text-navy-300" aria-hidden />
                  <p className="font-semibold text-navy-700">
                    {page > 1 ? "ما فيه منتجات أكثر" : "ما فيه منتجات مطابقة"}
                  </p>
                  <p className="text-sm text-navy-500">
                    {page > 1 ? "رجعت لآخر صفحة فيها منتجات" : "جرّب تغيير الفلاتر أو كلمة البحث"}
                  </p>
                </div>
              ) : (
                <LoadMoreProducts
                  // Without a key, switching category/brand/search/sort tabs
                  // only changes the URL's search params — the route segment
                  // itself doesn't change, so Next.js keeps this same client
                  // component mounted and its useState(initialProducts) never
                  // re-reads the new props. The grid (and "load more" state)
                  // stayed stuck on whatever was first loaded until a full
                  // navigation elsewhere remounted it. Keying on every filter
                  // but the page number forces a fresh mount on any real
                  // filter change while still letting "load more" (page only)
                  // append in place.
                  key={[search, categoryFilter, brand, tag, orderby, order, inStock].join("|")}
                  initialProducts={products}
                  initialPage={page}
                  initialHasMore={hasMore}
                  filters={{ search, category: categoryFilter, brand, tag, orderby, order, inStock }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
