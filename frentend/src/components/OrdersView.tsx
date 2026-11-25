"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown, Download, Package, PackageX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl"; // Client i18n hooks for orders list and date formatting
import { useRouter } from "@/i18n/navigation"; // Locale-aware router so /login redirect keeps /en
import { useAuth } from "@/lib/auth-context";
import { bundleLabel } from "@/lib/format";
import InvoiceModal from "./InvoiceModal";
import SarPrice from "./SarPrice";
import type { NativeOrder } from "@/lib/types";

// Mirrors the admin panel's Order::deliveryStatusOptions() exactly — this is
// the fulfillment stage, set by an admin from the Filament order page.
// delivery_status is null until an admin acts on the order for the first
// time, so it isn't "no status" — it just means the order hasn't moved past
// its initial "pending" stage yet.
// Map delivery statuses to next-intl message keys
const DELIVERY_STATUS_KEYS = {
  pending: "status.pending",
  confirmed: "status.confirmed",
  preparing: "status.preparing",
  shipped: "status.shipped",
  delivered: "status.delivered",
  cancelled: "status.cancelled",
} as const;
type DeliveryStatusKey = keyof typeof DELIVERY_STATUS_KEYS;

// payment_method / status — separate from the line above, this only says
// how the order is being paid, not how far along it is.
// Map payment methods to next-intl message keys
const PAYMENT_METHOD_KEYS = {
  cod: "payment.cod",
  card: "payment.card",
} as const;
type PaymentMethodKey = keyof typeof PAYMENT_METHOD_KEYS;

export default function OrdersView() {
  const t = useTranslations("orders"); // Orders UI translations
  const locale = useLocale(); // Active locale for date formatting
  const router = useRouter();
  const { customer, authToken, hydrated, isLoggedIn } = useAuth();

  // Translate known delivery statuses via next-intl, falling back safely for unknown values
  function deliveryStatusLabel(status: string | null) {
    const key = status ?? "pending";
    if (key in DELIVERY_STATUS_KEYS) {
      return t(DELIVERY_STATUS_KEYS[key as DeliveryStatusKey]);
    }
    return status ?? "";
  }

  // Translate known payment methods via next-intl, falling back safely for unknown values
  function paymentMethodLabel(method: string) {
    if (method in PAYMENT_METHOD_KEYS) {
      return t(PAYMENT_METHOD_KEYS[method as PaymentMethodKey]);
    }
    return method;
  }

  const [orders, setOrders] = useState<NativeOrder[] | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<NativeOrder | null>(null);
  // Orders can carry many line items (groceries, bundles...) — collapsed by
  // default so the list stays scannable, expanded per-order on demand.
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const COLLAPSED_ITEM_COUNT = 2;

  function toggleExpanded(orderId: number) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace("/login");
  }, [hydrated, isLoggedIn, router]);

  useEffect(() => {
    if (!customer) return;
    fetch(`/api/account/orders?phone=${encodeURIComponent(customer.phone)}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    })
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]));
  }, [customer, authToken]);

  if (!hydrated || !customer || orders === null) {
    return <div className="py-20 text-center text-navy-400">{t("loading")}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-900/10 py-16 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-navy-300" aria-hidden />
        <p className="font-semibold text-navy-700">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-navy-900/8 p-4">
          <div className="flex items-center justify-between">
            {/* Localized order heading and delivery status badge */}
            <span className="font-bold text-navy-900">{t("orderNumber", { number: o.order_number })}</span>
            <span className="text-xs font-bold text-brand-700">
              {deliveryStatusLabel(o.delivery_status)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            {o.created_at && (
              // Format order date in the active locale instead of hardcoded ar-SA
              <p className="text-xs text-navy-400">{new Date(o.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}</p>
            )}
            {o.payment_method && (
              <span className="text-xs text-navy-400">
                {paymentMethodLabel(o.payment_method)}
              </span>
            )}
          </div>

          {/* Products */}
          <div className="mt-3 space-y-2.5 border-t border-navy-900/8 pt-3">
            {(expandedOrders.has(o.id) ? (o.items ?? []) : (o.items ?? []).slice(0, COLLAPSED_ITEM_COUNT)).map((item, i) => {
              const label = bundleLabel(item.bundle_qty);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-navy-900/[0.03]">
                    {item.image ? (
                      <Image src={item.image} alt={item.name ?? ""} fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-navy-300">
                        <PackageX className="h-4 w-4" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {item.name ?? t("productFallback", { id: item.id })}
                    </p>
                    <p className="mt-0.5 text-xs text-navy-400">
                      {item.quantity} × {item.price != null ? <SarPrice amount={item.price} /> : "—"}
                      {label && ` · ${label}`}
                    </p>
                  </div>
                  {item.price != null && (
                    <span className="shrink-0 text-sm font-bold text-navy-900">
                      <SarPrice amount={item.price * item.quantity} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {(o.items?.length ?? 0) > COLLAPSED_ITEM_COUNT && (
            <button
              type="button"
              onClick={() => toggleExpanded(o.id)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expandedOrders.has(o.id) ? "rotate-180" : ""}`}
                aria-hidden
              />
              {/* Localized expand/collapse items toggle */}
              {expandedOrders.has(o.id)
                ? t("showLess")
                : t("showMore", { count: (o.items?.length ?? 0) - COLLAPSED_ITEM_COUNT })}
            </button>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-navy-900/8 pt-3">
            <span className="text-sm text-navy-500">{t("total")}</span>
            <span className="font-extrabold text-navy-900"><SarPrice amount={o.total} /></span>
          </div>

          <button
            type="button"
            onClick={() => setInvoiceOrder(o)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900/10 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-navy-900/5"
          >
            <Download className="h-4 w-4" aria-hidden />
            {t("viewReceipt")}
          </button>
        </div>
      ))}

      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
}
