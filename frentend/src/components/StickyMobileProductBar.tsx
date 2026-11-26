"use client";

import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";
import SarPrice from "./SarPrice";

export default function StickyMobileProductBar({
  product,
  outOfStock,
}: {
  product: Product;
  outOfStock: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] z-30 border-t border-navy-900/10 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(26,39,66,0.08)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-navy-900">
              <SarPrice amount={product.price} />
            </span>
            {product.on_sale && (
              <span className="text-xs text-navy-300 line-through">
                <SarPrice amount={product.regular_price} />
              </span>
            )}
          </div>
        </div>
        <div className="w-44 shrink-0">
          <AddToCartButton product={product} disabled={outOfStock} compact />
        </div>
      </div>
    </div>
  );
}
