"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { effectiveMaxQty } from "@/lib/cart-limits";
import { useToast } from "@/lib/toast-context";
import type { Product, StoreSettings } from "@/lib/types";

export default function AddToCartControls({
  product,
  disabled,
  storeSettings,
  productQtyLimits,
  variation,
}: {
  product: Product;
  disabled: boolean;
  storeSettings: StoreSettings;
  productQtyLimits: Record<string, number>;
  variation?: { id: number; label: string; price?: string; image?: string | null };
}) {
  const tCommon = useTranslations("common");
  const { items, addItem, setQuantity } = useCart();
  const { showToast } = useToast();
  const inCart = items.find(
    (i) => i.product.id === product.id && (i.variationId ?? null) === (variation?.id ?? null),
  );
  const maxQty = effectiveMaxQty(product, storeSettings, productQtyLimits);

  return (
    <div className="space-y-3">
      {inCart ? (
        <div className="flex items-center justify-between rounded-full border border-brand-600 bg-brand-50 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setQuantity(product.id, inCart.quantity - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
            aria-label={tCommon("decreaseQty")}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="font-bold text-navy-900">{inCart.quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(product.id, inCart.quantity + 1)}
            disabled={inCart.quantity >= maxQty}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100 disabled:opacity-40"
            aria-label={tCommon("increaseQty")}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            addItem(product, 1, variation);
            showToast(tCommon("addedToCartToast"), "success");
          }}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-navy-900/10 disabled:text-navy-300 disabled:shadow-none"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {disabled ? tCommon("unavailable") : tCommon("addToCart")}
        </button>
      )}

      {/* Quick checkout path — skips the cart page once this product is in it. */}
      {inCart && (
        <Link
          href="/checkout"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 py-3.5 text-base font-bold text-white transition hover:bg-navy-800"
        >
          {tCommon("checkout")}
        </Link>
      )}
    </div>
  );
}
