"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import type { Product } from "@/lib/types";

export default function AddToCartButton({
  product,
  disabled = false,
  compact = false,
  iconOnly = false,
}: {
  product: Product;
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const tCommon = useTranslations("common");
  const { items, addItem, setQuantity, maxQtyFor } = useCart();
  const { showToast } = useToast();
  const inCart = items.find((i) => i.product.id === product.id);
  const maxQty = maxQtyFor(product);

  if (disabled) {
    if (iconOnly) {
      return (
        <button
          type="button"
          disabled
          aria-label={tCommon("unavailable")}
          title={tCommon("unavailable")}
          className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-navy-900/10 text-navy-300"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled
        className={
          compact
            ? "w-full cursor-not-allowed rounded-xl bg-navy-900/10 py-2 text-xs font-bold text-navy-300"
            : "w-full cursor-not-allowed rounded-full bg-navy-900/10 py-3.5 text-base font-bold text-navy-300"
        }
      >
        {tCommon("unavailable")}
      </button>
    );
  }

  // Once the product is in the cart, the button becomes the quantity
  // stepper itself — it always reflects the real cart quantity rather than
  // a separate "how many to add" count that resets after adding.
  if (inCart) {
    if (iconOnly) {
      return (
        <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-xl border border-brand-600 bg-brand-50 px-1 shadow-xs">
          <button
            type="button"
            onClick={() => setQuantity(product.id, inCart.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100"
            aria-label={tCommon("decreaseQty")}
          >
            <Minus className="h-3 w-3" aria-hidden />
          </button>
          <span className="min-w-[1.1rem] text-center text-xs font-bold text-navy-900">
            {inCart.quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(product.id, inCart.quantity + 1)}
            disabled={inCart.quantity >= maxQty}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100 disabled:opacity-40"
            aria-label={tCommon("increaseQty")}
          >
            <Plus className="h-3 w-3" aria-hidden />
          </button>
        </div>
      );
    }
    return (
      <div
        className={
          compact
            ? "flex w-full items-center justify-between rounded-full border border-brand-600 bg-brand-50 px-1.5 py-1 shadow-xs"
            : "flex w-full items-center justify-between rounded-full border border-brand-600 bg-brand-50 px-2 py-1.5"
        }
      >
        <button
          type="button"
          onClick={() => setQuantity(product.id, inCart.quantity - 1)}
          className={
            compact
              ? "flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100"
              : "flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
          }
          aria-label={tCommon("decreaseQty")}
        >
          <Minus className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
        </button>
        <span className={compact ? "text-xs font-bold text-navy-900" : "font-bold text-navy-900"}>
          {inCart.quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity(product.id, inCart.quantity + 1)}
          disabled={inCart.quantity >= maxQty}
          className={
            compact
              ? "flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100 disabled:opacity-40"
              : "flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100 disabled:opacity-40"
          }
          aria-label={tCommon("increaseQty")}
        >
          <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
        </button>
      </div>
    );
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => {
          addItem(product, 1);
          showToast(tCommon("addedToCartToast"), "success");
        }}
        aria-label={tCommon("addToCart")}
        title={tCommon("addToCart")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white shadow-xs transition-all duration-200 active:scale-95 hover:bg-brand-600 hover:shadow-md hover:shadow-brand-600/20"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addItem(product, 1);
        showToast(tCommon("addedToCartToast"), "success");
      }}
      aria-label={tCommon("addToCart")}
      title={tCommon("addToCart")}
      className={
        compact
          ? "flex w-full items-center justify-center rounded-xl bg-navy-900 py-2.5 text-white shadow-xs transition-all duration-200 active:scale-[0.97] hover:bg-brand-600 hover:shadow-md hover:shadow-brand-600/20"
          : "flex w-full items-center justify-center rounded-full bg-brand-600 py-3.5 text-white shadow-lg shadow-brand-600/25 transition active:scale-[0.98] hover:bg-brand-700"
      }
    >
      <ShoppingCart className={compact ? "h-4 w-4" : "h-6 w-6"} aria-hidden />
    </button>
  );
}
