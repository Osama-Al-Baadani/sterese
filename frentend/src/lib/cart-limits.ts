import type { Product, StoreSettings } from "./types";

/** Mirrors the app's CartNotifier.effectiveMax: the per-product admin limit
 * never exceeds the store-wide default, and neither ever exceeds what's
 * actually in stock. */
export function effectiveMaxQty(
  product: Product,
  storeSettings: StoreSettings,
  productQtyLimits: Record<string, number>,
): number {
  const globalMax = storeSettings.default_max_qty || 10;
  const perProduct = productQtyLimits[String(product.id)];
  const adminMax = perProduct != null ? Math.min(Math.max(perProduct, 1), globalMax) : globalMax;
  const stock = product.stock_quantity;
  return stock != null ? Math.min(Math.max(adminMax, 1), Math.max(stock, 1)) : adminMax;
}
