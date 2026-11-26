"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Minus, PackageX, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart-context";
import { localizedName } from "@/lib/i18n-helpers";
import SarPrice from "./SarPrice";

export default function CartDrawer() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const {
    items,
    count,
    subtotal,
    storeSettings,
    drawerOpen,
    closeDrawer,
    setQuantity,
    removeItem,
    maxQtyFor,
    unavailableIds,
  } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const freeThreshold = storeSettings.free_shipping_threshold || 0;
  const freeRemaining = Math.max(0, freeThreshold - subtotal);
  const freeProgress = freeThreshold > 0 ? Math.min(100, Math.round((subtotal / freeThreshold) * 100)) : 100;
  const minOrder = storeSettings.min_order_value || 0;
  const belowMinOrder = minOrder > 0 && subtotal > 0 && subtotal < minOrder;
  const hasUnavailable = unavailableIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t("title")}>
      <div
        className="fixed inset-0 bg-navy-900/45 backdrop-blur-[2px] transition-opacity"
        onClick={closeDrawer}
        aria-hidden
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-900/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ShoppingBag className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-navy-900">{t("title")}</h2>
              {count > 0 && (
                <p className="text-xs text-navy-500">{t("itemsCount", { count })}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy-500 transition hover:bg-navy-900/5 hover:text-navy-900"
            aria-label={tCommon("close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Free shipping progress */}
        {items.length > 0 && freeThreshold > 0 && (
          <div className="border-b border-navy-900/8 bg-brand-50/60 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-800">
              <Truck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              {freeRemaining > 0 ? (
                <span>
                  {t.rich("freeShipRemaining", {
                    amount: () => <strong className="text-brand-700"><SarPrice amount={freeRemaining} /></strong>,
                  })}
                </span>
              ) : (
                <span className="text-emerald-700">{t("freeShipUnlocked")}</span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-900/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  freeRemaining === 0 ? "bg-emerald-500" : "bg-brand-600"
                }`}
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900/[0.04] text-navy-300">
                <ShoppingBag className="h-8 w-8" aria-hidden />
              </span>
              <p className="text-base font-bold text-navy-900">{t("empty")}</p>
              <p className="text-sm text-navy-500">{t("emptyHint")}</p>
              <Link
                href="/browse"
                onClick={closeDrawer}
                className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                {tCommon("browseProducts")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const { product, quantity, variationLabel } = item;
                const img = product.images[0]?.src;
                const name = localizedName(product, locale);
                const max = maxQtyFor(product);
                const isUnavailable = unavailableIds.includes(product.id);

                return (
                  <li
                    key={`${product.id}-${item.variationId ?? "base"}`}
                    className={`flex gap-3 rounded-2xl border p-3 transition ${
                      isUnavailable
                        ? "border-rose-200 bg-rose-50/50 opacity-75"
                        : "border-navy-900/8 bg-white"
                    }`}
                  >
                    <Link
                      href={`/product/${product.id}`}
                      onClick={closeDrawer}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-900/[0.03]"
                    >
                      {img ? (
                        <Image src={img} alt={name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-navy-300">
                          <PackageX className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${product.id}`}
                          onClick={closeDrawer}
                          className="line-clamp-2 text-sm font-bold text-navy-900 hover:text-brand-700"
                        >
                          {name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="shrink-0 rounded-lg p-1 text-navy-300 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={tCommon("removeFromCart")}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      {variationLabel && (
                        <span className="mt-0.5 text-xs font-medium text-navy-500">{variationLabel}</span>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-sm font-extrabold text-navy-900">
                          <SarPrice amount={Number(product.price) * quantity} />
                        </span>

                        {isUnavailable ? (
                          <span className="text-xs font-bold text-rose-600">{t("unavailableItem")}</span>
                        ) : (
                          <div className="flex items-center gap-1 rounded-full border border-navy-900/10 bg-navy-900/[0.02] px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => setQuantity(product.id, quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-navy-700 transition hover:bg-white"
                              aria-label={tCommon("decreaseQty")}
                            >
                              <Minus className="h-3 w-3" aria-hidden />
                            </button>
                            <span className="min-w-5 text-center text-xs font-bold text-navy-900">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(product.id, quantity + 1)}
                              disabled={quantity >= max}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-navy-700 transition hover:bg-white disabled:opacity-40"
                              aria-label={tCommon("increaseQty")}
                            >
                              <Plus className="h-3 w-3" aria-hidden />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-navy-900/8 bg-navy-900/[0.02] px-5 py-4 space-y-3">
            {belowMinOrder && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                {t.rich("minOrderRemaining", {
                  amount: () => <SarPrice amount={minOrder - subtotal} />,
                  min: () => <SarPrice amount={minOrder} />,
                })}
              </p>
            )}

            <div className="flex items-center justify-between text-base font-extrabold text-navy-900">
              <span>{t("subtotal")}</span>
              <span><SarPrice amount={subtotal} /></span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-full border border-navy-900/15 bg-white py-3 text-sm font-bold text-navy-900 transition hover:bg-navy-900/5"
              >
                {t("viewCart")}
              </Link>
              <Link
                href="/checkout"
                onClick={(e) => {
                  if (belowMinOrder || hasUnavailable) {
                    e.preventDefault();
                    return;
                  }
                  closeDrawer();
                }}
                aria-disabled={belowMinOrder || hasUnavailable}
                className={`flex items-center justify-center rounded-full py-3 text-sm font-bold text-white transition ${
                  belowMinOrder || hasUnavailable
                    ? "cursor-not-allowed bg-navy-900/30"
                    : "bg-brand-600 shadow-lg shadow-brand-600/20 hover:bg-brand-700"
                }`}
              >
                {t("checkoutBtn")}
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
