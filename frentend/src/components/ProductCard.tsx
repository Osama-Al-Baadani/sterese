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

  const brandOrCat = product.brands?.[0]
    ? localizedName(product.brands[0], locale)
    : product.categories?.[0]
      ? localizedName(product.categories[0], locale)
      : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-navy-900/8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:ring-brand-500/45 hover:shadow-2xl hover:shadow-navy-900/10">
      <div className="p-2 pb-0">
        <Link
          href={`/product/${product.id}`}
          className="relative block aspect-square overflow-hidden rounded-2xl bg-gradient-to-b from-navy-900/[0.02] to-navy-900/[0.05]"
        >
          <ProductCardImageSlider images={product.images} name={name} />

          <div className="absolute top-2 end-2 z-10 flex flex-col items-end gap-1.5">
            {bundle && (
              <span className="rounded-lg bg-gradient-to-l from-emerald-600 to-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                {bundle}
              </span>
            )}
            {product.on_sale && (
              <span className="rounded-full bg-rose-600/95 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm backdrop-blur-xs">
                {discountPct > 0 ? `-${discountPct}%` : tCommon("sale")}
              </span>
            )}
          </div>

          {lowStockQty && (
            <span className="absolute bottom-2.5 start-2 z-10 rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-xs">
              {locale === "ar" ? `باقي ${lowStockQty} فقط` : `Only ${lowStockQty} left`}
            </span>
          )}

          <div className="absolute top-2 start-2 z-10">
            <FavoriteButton productId={product.id} size="sm" />
          </div>

          {outOfStock && (
            <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm font-extrabold text-navy-700 backdrop-blur-[2px]">
              {tCommon("outOfStock")}
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 pt-3">
        <div className="flex items-center justify-between gap-2 min-h-4">
          {brandOrCat ? (
            <span className="truncate text-[11px] font-bold text-brand-700/90">
              {brandOrCat}
            </span>
          ) : (
            <span />
          )}
          {rating > 0 && (
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-800">
              <Star className="h-3 w-3 fill-gold-500 text-gold-500" aria-hidden />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <Link
          href={`/product/${product.id}`}
          className="line-clamp-2 min-h-10 text-sm font-bold leading-snug text-navy-900 transition-colors hover:text-brand-700"
        >
          {name}
        </Link>

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-navy-900/6 pt-2.5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-lg font-black tracking-tight text-navy-900">
              <SarPrice amount={product.price} />
            </span>
            {product.on_sale && (
              <span className="text-xs font-medium text-navy-300 line-through">
                <SarPrice amount={product.regular_price} />
              </span>
            )}
          </div>
        </div>

        <div className="pt-0.5">
          <AddToCartButton product={product} disabled={outOfStock} compact />
        </div>
      </div>
    </div>
  );
}
