"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Minus, PackageX, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCart, useCartSync } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import { localizedName } from "@/lib/i18n-helpers";
import SarPrice from "./SarPrice";

export default function CartView() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const {
    items,
    subtotal,
    storeSettings,
    setQuantity,
    removeItem,
    maxQtyFor,
    syncing,
    changes,
    unavailableIds,
    removeUnavailable,
    dismissChanges,
  } = useCart();
  const { isLoggedIn } = useAuth();

  useCartSync();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy-900/10 py-24 text-center">
        <ShoppingBag className="h-14 w-14 text-navy-300" aria-hidden />
        <p className="text-lg font-bold text-navy-900">{t("empty")}</p>
        <p className="text-sm text-navy-500">{t("emptyHint")}</p>
        <Link
          href="/browse"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {tCommon("browseProducts")}
        </Link>
      </div>
    );
  }

  const freeThreshold = storeSettings.free_shipping_threshold;
  const freeRemaining = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;
  const freeProgress = freeThreshold > 0 ? Math.min(100, (subtotal / freeThreshold) * 100) : 0;

  const minOrder = storeSettings.min_order_value;
  const belowMin = minOrder > 0 && subtotal < minOrder;
  const minRemaining = belowMin ? minOrder - subtotal : 0;

  const hasUnavailable = unavailableIds.length > 0;
  const hasChanges = Object.keys(changes).length > 0;
  const blocked = hasUnavailable || belowMin;

  return (
    <div className="space-y-4">
      {syncing && (
        <div className="flex items-center gap-2 rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-4 py-2.5 text-xs font-medium text-navy-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          {t("syncing")}
        </div>
      )}

      {hasUnavailable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
            <span>{t("unavailableBlock")}</span>
          </div>
          <button
            type="button"
            onClick={removeUnavailable}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            {t("removeUnavailable")}
          </button>
        </div>
      )}

      {hasChanges && !hasUnavailable && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span>{t("syncChanged")}</span>
          </div>
          <button
            type="button"
            onClick={dismissChanges}
            aria-label={tCommon("close")}
            className="rounded-full p-1 text-amber-700 hover:bg-amber-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {items.map(({ product, quantity }) => {
            const image = product.images[0]?.src;
            const name = localizedName(product, locale);
            const change = changes[product.id];
            const isUnavailable = change?.unavailable;
            return (
              <div
                key={product.id}
                className={`flex items-center gap-4 rounded-2xl border p-3 ${
                  isUnavailable ? "border-rose-200 bg-rose-50/40" : "border-navy-900/8"
                }`}
              >
                <Link href={`/product/${product.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-900/[0.03]">
                  {image ? (
                    <Image src={image} alt={name} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-navy-300">
                      <PackageX className="h-6 w-6" aria-hidden />
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-brand-700">
                    {name}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-brand-700"><SarPrice amount={product.price} /></p>
                  {change?.oldPrice && (
                    <p className="mt-0.5 text-xs font-medium text-amber-700">
                      {t("priceUpdated", { old: formatPrice(change.oldPrice, locale) })}
                    </p>
                  )}
                  {isUnavailable && (
                    <p className="mt-0.5 text-xs font-bold text-rose-600">{t("unavailableItem")}</p>
                  )}
                  {change?.quantityAdjusted && !isUnavailable && (
                    <p className="mt-0.5 text-xs font-medium text-amber-700">{t("quantityAdjusted")}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-full border border-navy-900/10 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-navy-700 hover:bg-navy-900/5"
                    aria-label={tCommon("decreaseQty")}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    disabled={isUnavailable || quantity >= maxQtyFor(product)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-navy-700 hover:bg-navy-900/5 disabled:opacity-40"
                    aria-label={tCommon("increaseQty")}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(product.id)}
                  className="shrink-0 rounded-full p-2 text-navy-300 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label={tCommon("removeFromCart")}
                >
                  <Trash2 className="h-4.5 w-4.5" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-navy-900/8 p-5">
          {freeThreshold > 0 && (
            <div className="rounded-xl bg-brand-50/70 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-navy-900">
                {freeRemaining === 0 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Truck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                )}
                <span>
                  {freeRemaining > 0
                    ? t("freeShipRemaining", { amount: formatPrice(freeRemaining, locale) })
                    : t("freeShipUnlocked")}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-navy-900/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    freeRemaining === 0 ? "bg-emerald-500" : "bg-brand-600"
                  }`}
                  style={{ width: `${freeProgress}%` }}
                />
              </div>
            </div>
          )}

          {belowMin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
              {t("minOrderRemaining", {
                amount: formatPrice(minRemaining, locale),
                min: formatPrice(minOrder, locale),
              })}
            </div>
          )}

          <div>
            <h2 className="mb-4 text-base font-bold text-navy-900">{t("orderSummary")}</h2>
            <div className="flex items-center justify-between text-sm text-navy-700">
              <span>{t("subtotal")}</span>
              <span className="font-semibold"><SarPrice amount={subtotal} /></span>
            </div>
            <p className="mt-1 text-xs text-navy-500">{t("deliveryNote")}</p>
          </div>

          {blocked ? (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center rounded-full bg-navy-900/10 py-3.5 text-base font-bold text-navy-300"
            >
              {t("checkoutBtn")}
            </button>
          ) : (
            <Link
              href={isLoggedIn ? "/checkout" : "/login?redirect=/checkout"}
              className="flex w-full items-center justify-center rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
            >
              {t("checkoutBtn")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
