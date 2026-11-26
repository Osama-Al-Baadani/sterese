import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { bundleLabel } from "@/lib/format";
import { localizedName } from "@/lib/i18n-helpers";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";
import FavoriteButton from "./FavoriteButton";
import ProductCardImageSlider from "./ProductCardImageSlider";
import SarPrice from "./SarPrice";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const tCommon = useTranslations("common");
  const outOfStock = product.stock_status === "outofstock";
  const rating = Number(product.average_rating);
  const bundle = bundleLabel(product.bundle_qty);
  const name = localizedName(product, locale);
  const regularPrice = Number(product.regular_price);
  const salePrice = Number(product.price);
  const discountPct =
    product.on_sale && regularPrice > salePrice && regularPrice > 0
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;
  const lowStockQty =
    !outOfStock && typeof product.stock_quantity === "number" && product.stock_quantity > 0 && product.stock_quantity <= 5
      ? product.stock_quantity
      : null;

  const savings =
    product.on_sale && regularPrice > salePrice
      ? Math.round((regularPrice - salePrice) * 100) / 100
      : 0;
  const brandOrCat = product.brands?.[0]
    ? localizedName(product.brands[0], locale)
    : product.categories?.[0]
      ? localizedName(product.categories[0], locale)
      : null;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-900/[0.07] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/45 hover:shadow-[0_10px_24px_-8px_rgba(26,39,66,0.14)]">
      {/* Image area */}
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-[#f7f8fa]"
      >
        <ProductCardImageSlider images={product.images} name={name} />

        {/* Discount & Bundle Badges */}
        <div className="absolute top-2 end-2 z-10 flex flex-col items-end gap-1">
          {product.on_sale && (
            <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white shadow-sm">
              {discountPct > 0 ? `-${discountPct}%` : tCommon("sale")}
            </span>
          )}
          {bundle && (
            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
              {bundle}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <div className="absolute top-2 start-2 z-10">
          <FavoriteButton productId={product.id} size="sm" />
        </div>

        {/* Low Stock Pill */}
        {lowStockQty && (
          <span className="absolute bottom-2 start-2 z-10 rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm backdrop-blur-xs">
            {locale === "ar" ? `باقي ${lowStockQty} فقط` : `Only ${lowStockQty} left`}
          </span>
        )}

        {/* Rating Pill floating cleanly at bottom-end of image */}
        {rating > 0 && (
          <span className="absolute bottom-2 end-2 z-10 flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-extrabold text-navy-900 shadow-sm backdrop-blur-xs">
            <Star className="h-2.5 w-2.5 fill-gold-500 text-gold-500" aria-hidden />
            {rating.toFixed(1)}
          </span>
        )}

        {outOfStock && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-xs font-extrabold text-navy-700 backdrop-blur-[2px]">
            {tCommon("outOfStock")}
          </span>
        )}
      </Link>

      {/* Details area */}
      <div className="flex flex-1 flex-col p-2.5">
        {brandOrCat && (
          <span className="mb-0.5 truncate text-[10px] font-bold tracking-wide text-navy-400">
            {brandOrCat}
          </span>
        )}

        <Link
          href={`/product/${product.id}`}
          className="line-clamp-2 min-h-[2.1rem] text-xs font-bold leading-snug text-navy-900 transition-colors group-hover:text-brand-700"
        >
          {name}
        </Link>

        {/* Price + Icon-only Cart Button */}
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-sm font-black tracking-tight text-navy-900">
                <SarPrice amount={product.price} />
              </span>
              {product.on_sale && (
                <span className="text-[10px] font-medium text-navy-300 line-through">
                  <SarPrice amount={product.regular_price} />
                </span>
              )}
            </div>
            {savings > 0 && (
              <p className="mt-0.5 truncate text-[10px] font-bold text-emerald-600">
                {locale === "ar" ? `وفر ${savings} ر.س` : `Save ${savings} SAR`}
              </p>
            )}
          </div>

          <AddToCartButton product={product} disabled={outOfStock} iconOnly />
        </div>
      </div>
    </div>
  );
}
