"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl"; // Read active locale to send to /api/checkout
import { Link, useRouter } from "@/i18n/navigation"; // Locale-aware router so COD confirmation keeps /en
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, Loader2, MapPin, Navigation, Tag } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { useCart, useCartSync } from "@/lib/cart-context";
import { deliveryFeeFor, findZoneForCity, nearBranchFeeFor } from "@/lib/delivery";
import type { CouponValidation, CustomerAddress, DeliveryZone, StoreSettings } from "@/lib/types";
import type { LocationPickResult } from "./LocationPickerModal";
import SarPrice from "./SarPrice";

const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), { ssr: false });
const HEADER_LOCATION_KEY = "storeseco_location_v1";

function toLocationResult(addr: CustomerAddress): LocationPickResult | null {
  if (addr.lat == null || addr.lng == null) return null;
  return {
    lat: Number(addr.lat),
    lng: Number(addr.lng),
    address: addr.address_text,
    city: addr.city ?? "",
    locationType: addr.label || "home",
  };
}

export default function CheckoutForm({
  deliveryZones,
  storeSettings,
}: {
  deliveryZones: DeliveryZone[];
  storeSettings: StoreSettings;
}) {
  const locale = useLocale(); // Active UI locale (ar or en)
  const t = useTranslations("checkout");
  const tAccount = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { items, subtotal, clear, changes, unavailableIds, removeUnavailable } = useCart();
  const { customer, hydrated } = useAuth();

  useCartSync();

  // Require login before checkout, same as the app — direct navigation to
  // /checkout (bookmark, back button, typed URL) bypasses the cart button's
  // own login-aware link, so the page has to enforce this itself too. Waits
  // for hydration first so a logged-in customer on a fresh page load isn't
  // bounced before AuthProvider has had a chance to read localStorage.
  useEffect(() => {
    if (hydrated && !customer) {
      router.replace("/login?redirect=/checkout");
    }
  }, [hydrated, customer, router]);

  // Fires once per visit to this page, not on every cart edit while here —
  // "reached checkout" is the funnel event, not "cart contents changed".
  const firedBeginCheckout = useRef(false);
  useEffect(() => {
    if (firedBeginCheckout.current || items.length === 0) return;
    firedBeginCheckout.current = true;
    trackEvent("begin_checkout", {
      ecommerce: {
        currency: "SAR",
        value: subtotal,
        content_type: "product",
        contents: items.map((i) => ({
          content_id: String(i.product.id),
          content_name: i.product.name,
          quantity: i.quantity,
          price: Number(i.product.price) || 0,
        })),
      },
    });
  }, [items, subtotal]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Prefills once the logged-in customer's info is available (after the
  // hydration-safe load in AuthProvider) — the fields start empty so this
  // never diverges from the server-rendered (logged-out) markup.
  useEffect(() => {
    if (!customer) return;
    // A real reaction to the customer becoming known post-hydration, not a
    // render loop — each setter is a no-op once the field already has text.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName((prev) => prev || [customer.firstName, customer.lastName].filter(Boolean).join(" "));
    setPhone((prev) => prev || customer.phone);
    setEmail((prev) => prev || customer.email);
  }, [customer]);

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [headerLocation, setHeaderLocation] = useState<LocationPickResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationPickResult | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Read the location already chosen in the header so we can prefill checkout
  // without forcing the customer to pick on the map a second time.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HEADER_LOCATION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LocationPickResult;
        if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setHeaderLocation(parsed);
          setLocation((prev) => prev ?? parsed);
          setSelectedSource((prev) => prev ?? "header");
        }
      }
    } catch {
      // ignore malformed header location
    }
  }, []);

  // Load customer's saved addresses and auto-select the default (or first) one.
  useEffect(() => {
    const activePhone = customer?.phone;
    if (!activePhone) return;
    let cancelled = false;
    fetch(`/api/account/addresses?phone=${encodeURIComponent(activePhone)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: CustomerAddress[]) => {
        if (cancelled || !Array.isArray(list)) return;
        const valid = list.filter((a) => a.lat != null && a.lng != null);
        setSavedAddresses(valid);
        if (valid.length > 0) {
          const preferred = valid.find((a) => a.is_default) ?? valid[0];
          const picked = toLocationResult(preferred);
          if (picked) {
            setLocation(picked);
            setSelectedSource(`saved:${preferred.id}`);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [customer?.phone]);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");

  // Mirrors Order::qualifiesForFirstOrdersFreeDelivery on the backend, just
  // for display — the server always recomputes the real fee at order time
  // regardless of what this shows. null = not checked yet (too-short phone,
  // or the request hasn't resolved) → falls back to the normal fee below.
  const [freeFirstOrders, setFreeFirstOrders] = useState<boolean | null>(null);
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    const timer = setTimeout(() => {
      if (digits.length < 9) {
        setFreeFirstOrders(null);
        return;
      }
      fetch(`/api/delivery-eligibility?phone=${encodeURIComponent(phone)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setFreeFirstOrders(data?.eligible ?? null))
        .catch(() => setFreeFirstOrders(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [phone]);

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  // Fingerprint of the cart at the moment the coupon was applied — the
  // server always recomputes the real discount at order time regardless,
  // but showing a discount amount that no longer matches the cart (item
  // added/removed/qty changed after applying) is confusing right at the
  // moment the customer is about to pay. Re-check below whenever it drifts.
  const [couponCartKey, setCouponCartKey] = useState<string | null>(null);
  const cartKey = items.map((i) => `${i.product.id}:${i.quantity}`).join(",");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const city = location?.city ?? "";
  const address = location?.address ?? "";
  const coords = location ? { lat: location.lat, lng: location.lng } : null;

  const zone = city ? findZoneForCity(deliveryZones, city) : null;
  const zoneFee = deliveryFeeFor(zone, subtotal, storeSettings.delivery_fee, {
    freeShippingThreshold: storeSettings.free_shipping_threshold,
    freeFirstOrders: freeFirstOrders ?? undefined,
  });
  // A shared location inside the branch's radius overrides the normal
  // city/zone-based fee — it's a more specific, usually cheaper rate. The
  // first-orders perk still wins over that too, same priority as the server.
  const nearBranchFee = nearBranchFeeFor(storeSettings.free_delivery_near_branch, coords, subtotal);
  const deliveryFee = freeFirstOrders ? 0 : nearBranchFee ?? zoneFee;
  const isNearBranch = nearBranchFee !== null;

  const codFee = paymentMethod === "cod" && storeSettings.cod.fee_enabled ? storeSettings.cod.fee_amount : 0;
  const discount = coupon?.discount_amount ?? 0;
  const effectiveDelivery = coupon?.free_shipping ? 0 : deliveryFee;
  const total = Math.max(0, subtotal + effectiveDelivery + codFee - discount);

  const belowMinimum = storeSettings.min_order_value > 0 && subtotal < storeSettings.min_order_value;
  const hasUnavailable = unavailableIds.length > 0;
  const hasPriceChanges = !hasUnavailable && Object.keys(changes).length > 0;

  // Cart changed after the coupon was applied (qty edited, item added or
  // removed) — the shown discount no longer reflects what the server would
  // actually recompute, so clear it and ask the customer to reapply.
  useEffect(() => {
    if (coupon && couponCartKey !== null && cartKey !== couponCartKey) {
      setCoupon(null);
      setCouponCartKey(null);
      setCouponError(t("couponCartChanged"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const productIds = items.map((i) => i.product.id).join(",");
      const res = await fetch(
        `/api/coupons/validate?code=${encodeURIComponent(couponInput.trim())}&subtotal=${subtotal}&product_ids=${productIds}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.message ?? t("couponInvalid"));
        setCoupon(null);
        setCouponCartKey(null);
        return;
      }
      setCoupon(data);
      setCouponCartKey(cartKey);
    } catch {
      setCouponError(t("couponFailed"));
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || belowMinimum || hasUnavailable) return;
    if (!location) {
      setSubmitError(t("selectLocation"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    // Fire-and-forget, same as the app — lets the panel follow up if the
    // order below never actually goes through (closed tab, lost
    // connection, declined card). Cleaned up once the order confirmation
    // page confirms the order actually succeeded.
    fetch("/api/abandoned-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, cart_items: items.map((i) => ({ name: i.product.name, qty: i.quantity, price: i.product.price })), total }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          woo_customer_id: customer?.id,
          source: "web",
          locale, // Forward active locale so Paymob redirects back to the matching language
          address,
          city,
          notes,
          subtotal,
          delivery_fee: effectiveDelivery,
          discount,
          payment_method: paymentMethod,
          cod_fee: codFee,
          total,
          lat: coords?.lat,
          lng: coords?.lng,
          items: items.map((i) => ({ id: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message ?? t("orderFailed"));
        setSubmitting(false);
        return;
      }

      if (data.payment_method === "cod") {
        // Confirmed immediately — no online payment step to wait for.
        clear();
        router.push(`/order-confirmation/${data.order_id}/${data.access_key}`);
        return;
      }

      const checkoutUrl =
        `https://ksa.paymob.com/unifiedcheckout/?publicKey=${data.public_key}` +
        `&clientSecret=${data.client_secret}`;
      window.location.assign(checkoutUrl);
    } catch {
      setSubmitError(t("connectionFailed"));
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-900/10 py-16 text-center">
        <p className="mb-4 font-semibold text-navy-700">{t("emptyCart")}</p>
        <Link href="/browse" className="text-brand-700 underline">
          {tCommon("browseProducts")}
        </Link>
      </div>
    );
  }

  const labelText = (label: string) => {
    const key = label as "home" | "work" | "friend" | "other";
    if (["home", "work", "friend", "other"].includes(key)) {
      return tAccount(`label.${key}`);
    }
    return label;
  };

  return (
    <>
      {showPicker && (
        <LocationPickerModal
          initialLat={location?.lat}
          initialLng={location?.lng}
          initialLocationType={location?.locationType}
          deliveryZones={deliveryZones}
          onClose={() => setShowPicker(false)}
          onConfirm={(result) => {
            setLocation(result);
            setSelectedSource("custom");
            setShowPicker(false);
          }}
        />
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {hasUnavailable && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                <span>{t("unavailableItems")}</span>
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

          {hasPriceChanges && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>{t("pricesUpdated")}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("fullName")} required>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder={t("fullNamePlaceholder")}
              />
            </Field>
            <Field label={t("phone")} required>
              <input
                required
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input text-start"
                placeholder="05xxxxxxxx"
              />
            </Field>
          </div>

          <Field label={t("email")}>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input text-start"
              placeholder="example@email.com"
            />
          </Field>

          <div>
            <span className="mb-2 block text-sm font-bold text-navy-900">
              {t("deliveryAddress")} <span className="text-rose-500">*</span>
            </span>

            <div className="space-y-2.5">
              {savedAddresses.map((addr) => {
                const picked = toLocationResult(addr);
                if (!picked) return null;
                const key = `saved:${addr.id}`;
                const active = selectedSource === key;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setLocation(picked);
                      setSelectedSource(key);
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition ${
                      active ? "border-brand-600 bg-brand-50/70" : "border-navy-900/10 bg-white hover:border-brand-200"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-brand-600 bg-brand-600 text-white" : "border-navy-900/20"
                      }`}
                    >
                      {active && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-700">{labelText(addr.label)}</span>
                        {addr.city && <span className="text-xs text-navy-400">· {addr.city}</span>}
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-navy-900">{addr.address_text}</p>
                    </div>
                  </button>
                );
              })}

              {headerLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setLocation(headerLocation);
                    setSelectedSource("header");
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition ${
                    selectedSource === "header"
                      ? "border-brand-600 bg-brand-50/70"
                      : "border-navy-900/10 bg-white hover:border-brand-200"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selectedSource === "header" ? "border-brand-600 bg-brand-600 text-white" : "border-navy-900/20"
                    }`}
                  >
                    {selectedSource === "header" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600">
                      <Navigation className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                      <span>{t("headerLocation")}</span>
                      {headerLocation.city && <span className="text-navy-400">· {headerLocation.city}</span>}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-navy-900">{headerLocation.address}</p>
                  </div>
                </button>
              )}

              {selectedSource === "custom" && location && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-600 bg-brand-50/70 p-3.5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy-900">{location.address}</p>
                    {location.city && <p className="mt-0.5 text-xs text-navy-500">{location.city}</p>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                {location ? t("newAddress") : t("pickOnMap")}
              </button>

              {isNearBranch && (
                <p className="text-xs font-semibold text-brand-700">{t("nearBranch")}</p>
              )}
            </div>
          </div>

          <Field label={t("notes")}>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              placeholder={t("notesPlaceholder")}
            />
          </Field>

          <div>
            <span className="mb-2 block text-sm font-bold text-navy-900">{t("paymentMethod")}</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PaymentOption
                label={t("payCard")}
                description={t("payCardDesc")}
                Icon={CreditCard}
                selected={paymentMethod === "card"}
                onSelect={() => setPaymentMethod("card")}
              />
              {storeSettings.cod.enabled && (
                <PaymentOption
                  label={t("payCod")}
                  description={
                    storeSettings.cod.fee_enabled ? (
                      t.rich("codFeeDesc", {
                        fee: () => <SarPrice amount={storeSettings.cod.fee_amount} />,
                      })
                    ) : (
                      t("codNoFee")
                    )
                  }
                  Icon={Banknote}
                  selected={paymentMethod === "cod"}
                  onSelect={() => setPaymentMethod("cod")}
                />
              )}
            </div>
          </div>
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-navy-900/8 p-5">
          <h2 className="text-base font-bold text-navy-900">{t("summary")}</h2>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-navy-300" aria-hidden />
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t("couponCode")}
                className="input ps-9"
              />
            </div>
            <button
              type="button"
              onClick={applyCoupon}
              disabled={checkingCoupon}
              className="shrink-0 rounded-xl bg-navy-900 px-4 text-sm font-bold text-white transition hover:bg-navy-700 disabled:opacity-60"
            >
              {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("applyCoupon")}
            </button>
          </div>
          {couponError && <p className="text-xs text-rose-600">{couponError}</p>}
          {coupon && <p className="text-xs font-semibold text-brand-700">{t("couponApplied", { code: coupon.code })}</p>}

          <div className="space-y-2 border-t border-navy-900/10 pt-4 text-sm">
            <Row label={t("subtotal")} value={<SarPrice amount={subtotal} />} />
            <Row
              label={t("deliveryFee")}
              value={effectiveDelivery === 0 ? tCommon("free") : <SarPrice amount={effectiveDelivery} />}
            />
            {codFee > 0 && <Row label={t("codFee")} value={<SarPrice amount={codFee} />} />}
            {discount > 0 && (
              <Row label={t("discount")} value={<>- <SarPrice amount={discount} /></>} highlight />
            )}
            <div className="flex items-center justify-between border-t border-navy-900/10 pt-2 text-base font-extrabold text-navy-900">
              <span>{t("total")}</span>
              <span><SarPrice amount={total} /></span>
            </div>
          </div>

          {belowMinimum && (
            <p className="text-xs font-semibold text-rose-600">
              {t.rich("minOrder", {
                min: () => <SarPrice amount={storeSettings.min_order_value} />,
              })}
            </p>
          )}
          {submitError && <p className="text-xs font-semibold text-rose-600">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting || belowMinimum || hasUnavailable}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-navy-900/10 disabled:text-navy-300 disabled:shadow-none"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {paymentMethod === "cod" ? t("placeOrder") : t("payNow")}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-navy-900">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-500">{label}</span>
      <span className={highlight ? "font-semibold text-brand-700" : "font-semibold text-navy-900"}>{value}</span>
    </div>
  );
}

function PaymentOption({
  label,
  description,
  Icon,
  selected,
  onSelect,
}: {
  label: string;
  description: React.ReactNode;
  Icon: typeof CreditCard;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-start transition ${
        selected ? "border-brand-600 bg-brand-50" : "border-navy-900/10 bg-white hover:border-brand-200"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-brand-600 text-white" : "bg-navy-900/5 text-navy-500"}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-bold text-navy-900">{label}</span>
        <span className="block text-xs text-navy-500">{description}</span>
      </span>
    </button>
  );
}
