"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Product, ProductVariation, StoreSettings } from "@/lib/types";
import AddToCartControls from "./AddToCartControls";
import SarPrice from "./SarPrice";

function variationLabel(v: ProductVariation): string {
  if (v.attributes && v.attributes.length > 0) {
    return v.attributes.map((a) => `${a.value}`).join(" / ");
  }
  return v.sku || `#${v.id}`;
}

export default function ProductVariationsBox({
  product,
  storeSettings,
  productQtyLimits,
}: {
  product: Product;
  storeSettings: StoreSettings;
  productQtyLimits: Record<string, number>;
}) {
  const t = useTranslations("product");
  const variations = product.variations ?? [];
  const firstInStock = variations.find((v) => v.stock_status !== "outofstock") ?? variations[0];
  const [selectedId, setSelectedId] = useState<number | null>(firstInStock ? firstInStock.id : null);

  const selected = variations.find((v) => v.id === selectedId) ?? null;

  const activePrice = selected ? selected.price : product.price;
  const activeRegular = selected ? selected.regular_price : product.regular_price;
  const activeOnSale = selected
    ? Boolean(selected.sale_price && Number(selected.regular_price) > Number(selected.price))
    : product.on_sale;
  const activeOutOfStock = selected
    ? selected.stock_status === "outofstock"
    : product.stock_status === "outofstock";
  const activeStockQty = selected ? selected.stock_quantity : product.stock_quantity;
  const lowStock =
    !activeOutOfStock && activeStockQty !== null && activeStockQty > 0 && activeStockQty <= 5;

  const regularNum = Number(activeRegular);
  const priceNum = Number(activePrice);
  const discountPct =
    activeOnSale && regularNum > priceNum && regularNum > 0
      ? Math.round(((regularNum - priceNum) / regularNum) * 100)
      : 0;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-extrabold text-navy-900">
          <SarPrice amount={activePrice} />
        </span>
        {activeOnSale && regularNum > priceNum && (
          <>
            <span className="text-lg text-navy-300 line-through">
              <SarPrice amount={activeRegular} />
            </span>
            {discountPct > 0 && (
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
                -{discountPct}%
              </span>
            )}
          </>
        )}
      </div>

      <p className={`mt-2 text-sm font-semibold ${activeOutOfStock ? "text-rose-600" : "text-brand-700"}`}>
        {activeOutOfStock ? t("outOfStockNow") : t("inStock")}
      </p>
      {lowStock && (
        <p className="mt-1 text-sm font-bold text-amber-600">
          {t("onlyLeft", { count: activeStockQty! })}
        </p>
      )}

      {variations.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-navy-900">{t("selectOption")}</p>
          <div className="flex flex-wrap gap-2">
            {variations.map((v) => {
              const isSelected = v.id === selected?.id;
              const isOos = v.stock_status === "outofstock";
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-600/20"
                      : "border-navy-900/15 bg-white text-navy-800 hover:border-brand-400"
                  } ${isOos ? "opacity-50 line-through" : ""}`}
                >
                  {variationLabel(v)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 max-w-sm">
        <AddToCartControls
          product={product}
          disabled={activeOutOfStock}
          storeSettings={storeSettings}
          productQtyLimits={productQtyLimits}
          variation={
            selected
              ? {
                  id: selected.id,
                  label: variationLabel(selected),
                  price: selected.price,
                  image: selected.image,
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
