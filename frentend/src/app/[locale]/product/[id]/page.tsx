import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig, getProduct, getProducts } from "@/lib/api";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HomeSectionProducts from "@/components/HomeSectionProducts";
import ProductGallery from "@/components/ProductGallery";
import ProductVariationsBox from "@/components/ProductVariationsBox";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import ShareButton from "@/components/ShareButton";
import StickyMobileProductBar from "@/components/StickyMobileProductBar";
import TrackProductView from "@/components/TrackProductView";
import { bundleLabel, safeJsonLd, stripHtml } from "@/lib/format";
import { localizedAlternates, localizedDescription, localizedName } from "@/lib/i18n-helpers";
import type { Product } from "@/lib/types";

export const revalidate = 120;

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
  const keywords = Array.from(
    new Set([
      name,
      ...product.categories.map((c) => localizedName(c, locale)),
      ...product.brands.map((b) => localizedName(b, locale)),
      ...product.tags.map((tag) => localizedName(tag, locale)),
      ...(product.sku ? [product.sku] : []),
      locale === "ar" ? "المخازن الاقتصادية" : "Al Makhazen Al Eqtisadeya",
    ]),
  ).filter(Boolean);

  return {
    title: name,
    description,
    keywords,
    alternates: localizedAlternates(`/product/${id}`, locale),
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
    const picked = await getProducts({
      include: product.related_product_ids.join(","),
      perPage: product.related_product_ids.length,
    });
    if (picked.length > 0) return picked;
  }
  if (product.categories.length === 0) return [];
  const sameCategory = await getProducts({ category: String(product.categories[0].id), perPage: 9 });
  return sameCategory.filter((p) => p.id !== product.id).slice(0, 8);
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const product = await getProduct(Number(id));
  if (!product) notFound();

  const [related, config, t, tNav] = await Promise.all([
    getRelatedProducts(product),
    getAppConfig(),
    getTranslations({ locale, namespace: "product" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  const outOfStock = product.stock_status === "outofstock";
  const rating = Number(product.average_rating);
  const category = product.categories[0];
  const bundle = bundleLabel(product.bundle_qty);
  const name = localizedName(product, locale);
  const brandName = product.brands[0] ? localizedName(product.brands[0], locale) : null;
  const shortDesc = stripHtml(
    locale === "en"
      ? product.short_description_en || product.short_description
      : product.short_description || product.short_description_en,
  );
  const fullDesc = stripHtml(
    locale === "en"
      ? product.description_en || product.description
      : product.description || product.description_en,
  );

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
              { label: tNav("home"), href: "/" },
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
                    {rating.toFixed(1)} ({t("ratings", { count: product.rating_count })})
                  </span>
                )}
                {product.sku && <span>SKU: {product.sku}</span>}
              </div>

              <ProductVariationsBox
                product={product}
                storeSettings={config.storeSettings}
                productQtyLimits={config.productQtyLimits}
              />

              {bundle && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-3.5 py-2 text-white">
                  <Gift className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  <span className="text-sm font-bold">
                    {t("bundleOffer", {
                      bundle,
                      buy: product.bundle_qty! - 1 === 1 ? t("one") : String(product.bundle_qty! - 1),
                      total: product.bundle_qty!,
                    })}
                  </span>
                </div>
              )}

              {shortDesc && (
                <p className="mt-4 leading-7 text-navy-700">
                  {shortDesc}
                </p>
              )}

              {fullDesc && (
                <div className="mt-10 border-t border-navy-900/10 pt-6">
                  <h2 className="mb-3 text-lg font-bold text-navy-900">{t("details")}</h2>
                  <div className="leading-7 whitespace-pre-line text-navy-700">
                    {fullDesc}
                  </div>
                </div>
              )}
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-xl font-extrabold text-navy-900">{t("related")}</h2>
              <HomeSectionProducts products={related} />
            </section>
          )}
        </div>
        <RecentlyViewedSection excludeId={product.id} />
      </main>
      <TrackProductView productId={product.id} />
      <StickyMobileProductBar product={product} outOfStock={outOfStock} />
      <Footer settings={config.storeSettings} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </>
  );
}
