import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, Star } from "lucide-react";
import { getAppConfig, getProduct, getProducts } from "@/lib/api";
import AddToCartControls from "@/components/AddToCartControls";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HomeSectionProducts from "@/components/HomeSectionProducts";
import ProductGallery from "@/components/ProductGallery";
import SarPrice from "@/components/SarPrice";
import ShareButton from "@/components/ShareButton";
import { bundleLabel, safeJsonLd, stripHtml } from "@/lib/format";
import { hreflangAlternates, localizedDescription, localizedName } from "@/lib/i18n-helpers";
import type { Product } from "@/lib/types";

type Params = { id: string; locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const product = await getProduct(Number(id));
  if (!product) return {};
  const image = product.images[0]?.src;
  const name = localizedName(product, locale);
  const description = localizedDescription(product, locale) ?? undefined;
  return {
    title: name,
    description,
    alternates: {
      canonical: `/product/${id}`,
      languages: hreflangAlternates(`/product/${id}`),
    },
    openGraph: {
      title: name,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
  };
}

/** Falls back to other products in the same category when the admin hasn't
 * hand-picked related products for this one — a "related products" section
 * that only ever appears once someone remembers to configure it isn't
 * worth much on a growing catalog. */
async function getRelatedProducts(product: Product): Promise<Product[]> {
  if (product.related_product_ids.length > 0) {
    const all = await getProducts({ perPage: product.related_product_ids.length + 5 });
    const picked = all.filter((p) => product.related_product_ids.includes(p.id));
    if (picked.length > 0) return picked;
  }
  if (product.categories.length === 0) return [];
  const sameCategory = await getProducts({ category: String(product.categories[0].id), perPage: 9 });
  return sameCategory.filter((p) => p.id !== product.id).slice(0, 8);
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { id, locale } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  const [related, config] = await Promise.all([getRelatedProducts(product), getAppConfig()]);

  const outOfStock = product.stock_status === "outofstock";
  const rating = Number(product.average_rating);
  const category = product.categories[0];
  const lowStock =
    !outOfStock && product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const bundle = bundleLabel(product.bundle_qty);
  const name = localizedName(product, locale);
  const brandName = product.brands[0] ? localizedName(product.brands[0], locale) : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: product.images.map((i) => i.src),
    description: localizedDescription(product, locale) ?? undefined,
    sku: product.sku || undefined,
    brand: brandName ? { "@type": "Brand", name: brandName } : undefined,
    aggregateRating:
      product.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.average_rating,
            reviewCount: product.rating_count,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "SAR",
      price: product.price,
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              ...(category ? [{ label: localizedName(category, locale), href: `/browse?category=${category.id}` }] : []),
              { label: name },
            ]}
          />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <ProductGallery images={product.images} name={name} bundle={bundle} />

            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {brandName && <p className="mb-1 text-sm font-medium text-brand-600">{brandName}</p>}
                  <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{name}</h1>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ShareButton title={name} />
                  <FavoriteButton productId={product.id} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-navy-500">
                {rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-gold-500 text-gold-500" aria-hidden />
                    {rating.toFixed(1)} ({product.rating_count} تقييم)
                  </span>
                )}
                {product.sku && <span>SKU: {product.sku}</span>}
              </div>

              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-navy-900"><SarPrice amount={product.price} /></span>
                {product.on_sale && (
                  <span className="text-lg text-navy-300 line-through"><SarPrice amount={product.regular_price} /></span>
                )}
              </div>

              <p className={`mt-2 text-sm font-semibold ${outOfStock ? "text-rose-600" : "text-brand-700"}`}>
                {outOfStock ? "نفدت الكمية حالياً" : "متوفر بالمخزون"}
              </p>
              {lowStock && (
                <p className="mt-1 text-sm font-bold text-amber-600">
                  متبقي {product.stock_quantity} قطع فقط!
                </p>
              )}

              {bundle && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-3.5 py-2 text-white">
                  <Gift className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  <span className="text-sm font-bold">
                    عرض {bundle} — اشتري {product.bundle_qty! - 1 === 1 ? "واحد" : product.bundle_qty! - 1} وخذ{" "}
                    {product.bundle_qty} بسعر واحد
                  </span>
                </div>
              )}

              {product.short_description && (
                <p className="mt-4 leading-7 text-navy-700">
                  {stripHtml((locale === "en" && product.short_description_en) || product.short_description)}
                </p>
              )}

              <div className="mt-6 max-w-sm">
                <AddToCartControls
                  product={product}
                  disabled={outOfStock}
                  storeSettings={config.storeSettings}
                  productQtyLimits={config.productQtyLimits}
                />
              </div>

              {product.description && (
                <div className="mt-10 border-t border-navy-900/10 pt-6">
                  <h2 className="mb-3 text-lg font-bold text-navy-900">تفاصيل المنتج</h2>
                  <div className="leading-7 whitespace-pre-line text-navy-700">
                    {stripHtml((locale === "en" && product.description_en) || product.description)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-xl font-extrabold text-navy-900">منتجات ذات صلة</h2>
              <HomeSectionProducts products={related} />
            </section>
          )}
        </div>
      </main>
      <Footer settings={config.storeSettings} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </>
  );
}
