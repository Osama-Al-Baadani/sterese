import { distanceKm } from "./geo";
import type { DeliveryZone, NearBranchDelivery } from "./types";

// Same table as ecostore-panel's OrderController::canonicalCity — the map
// picker returns the city in the visitor's language ("Riyadh" on /en),
// while zones are configured in Arabic.
const CITY_ALIASES: Record<string, string> = {
  riyadh: "الرياض", "ar riyadh": "الرياض", "al riyadh": "الرياض",
  jeddah: "جدة", jiddah: "جدة", mecca: "مكة المكرمة", makkah: "مكة المكرمة",
  medina: "المدينة المنورة", madinah: "المدينة المنورة", "al madinah": "المدينة المنورة",
  dammam: "الدمام", khobar: "الخبر", "al khobar": "الخبر", dhahran: "الظهران",
  taif: "الطائف", tabuk: "تبوك", buraydah: "بريدة", abha: "أبها",
  hail: "حائل", jazan: "جازان", najran: "نجران", "al kharj": "الخرج",
  diriyah: "الدرعية", "ad diriyah": "الدرعية",
};

export function canonicalCity(city: string): string {
  const c = city.trim().replace(/\s+/g, " ").replace(/^(منطقة|محافظة|مدينة)\s+/, "");
  const key = c.replace(/-/g, " ").replace(/'/g, "").toLowerCase();
  return CITY_ALIASES[key] ?? c;
}

/** Finds the delivery zone whose `cities` list contains the given city name. */
export function findZoneForCity(zones: DeliveryZone[], city: string): DeliveryZone | null {
  const normalized = canonicalCity(city);
  return zones.find((z) => z.cities.some((c) => canonicalCity(c) === normalized)) ?? null;
}

/** Same rules the backend charges (OrderController::resolveDeliveryFee).
 * `promo_active` from app-config is already date-checked server-side. A
 * first-order promo is only shown as free when we know this is the
 * customer's first order — otherwise the normal fee is shown, and the
 * server may still waive it (never the other way round). */
export function deliveryFeeFor(
  zone: DeliveryZone | null,
  subtotal: number,
  fallbackFee: number,
  opts: { freeShippingThreshold?: number; isFirstOrder?: boolean; freeFirstOrders?: boolean } = {},
): number {
  // "أول N طلبات مجانية" (Order::qualifiesForFirstOrdersFreeDelivery) beats
  // every other delivery-fee rule, same priority as the server.
  if (opts.freeFirstOrders) return 0;
  if (!zone) {
    const threshold = opts.freeShippingThreshold ?? 0;
    return threshold > 0 && subtotal >= threshold ? 0 : fallbackFee;
  }
  if (zone.promo_active) {
    // Was checking for "free_delivery", a promo_type the panel never sets.
    if (zone.promo_type === "schedule") return 0;
    if (zone.promo_type === "first_order" && opts.isFirstOrder) return 0;
  }
  if (zone.free_threshold > 0 && subtotal >= zone.free_threshold) return 0;
  return zone.base_fee;
}

/**
 * The near-branch rate only applies when we actually know where the
 * customer is (they shared their location) and that point falls inside
 * the branch's radius — returns null otherwise, so callers fall back to
 * the normal city/zone-based fee.
 */
export function nearBranchFeeFor(
  settings: NearBranchDelivery,
  coords: { lat: number; lng: number } | null,
  subtotal: number,
): number | null {
  if (!settings.enabled || !coords) return null;
  const distance = distanceKm(coords.lat, coords.lng, settings.branch_lat, settings.branch_lng);
  if (distance > settings.radius_km) return null;
  if (settings.free_threshold !== null && subtotal >= settings.free_threshold) return 0;
  return settings.fee;
}
