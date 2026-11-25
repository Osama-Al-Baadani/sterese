import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PackageX, Star } from "lucide-react";
import { bundleLabel } from "@/lib/format";
import { localizedName } from "@/lib/i18n-helpers";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";
import FavoriteButton from "./FavoriteButton";
import SarPrice from "./SarPrice";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const outOfStock = product.stock_status === "outofstock";
  const image = product.images[0]?.src;
  const rating = Number(product.average_rating);
  const bundle = bundleLabel(product.bundle_qty);
  const name = localizedName(product, locale);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-navy-900/8 bg-white transition hover:shadow-lg hover:shadow-navy-900/5">
      <Link href={`/product/${product.id}`} className="relative block aspect-square bg-navy-900/[0.03]">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 20vw, 45vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-300">
            <PackageX className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {bundle && (
            <span className="rounded-md bg-gradient-to-l from-emerald-600 to-emerald-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
              {bundle}
            </span>
          )}
          {product.on_sale && (
            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">خصم</span>
          )}
        </div>
        <div className="absolute top-2 left-2">
          <FavoriteButton productId={product.id} size="sm" />
        </div>
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold text-navy-700">
            نفدت الكمية
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/product/${product.id}`} className="line-clamp-2 min-h-10 text-sm font-semibold text-navy-900 hover:text-brand-700">
          {name}
        </Link>

        {rating > 0 && (
          <div className="flex items-center gap-1 text-xs text-navy-500">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" aria-hidden />
            {rating.toFixed(1)}
            <span className="text-navy-300">({product.rating_count})</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-navy-900"><SarPrice amount={product.price} /></span>
            {product.on_sale && (
              <span className="text-xs text-navy-300 line-through"><SarPrice amount={product.regular_price} /></span>
            )}
          </div>
        </div>

        <AddToCartButton product={product} disabled={outOfStock} compact />
      </div>
    </div>
  );
}
