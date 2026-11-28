"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useCartActions } from "@/lib/cart-context";
import SarPrice from "./SarPrice";

type Status = "pending" | "paid" | "cod" | "failed";
const MAX_POLLS = 40; // ~2 minutes at 3s intervals

interface OrderDetail {
  id: number;
  order_number: number;
  total: number;
  address: string;
  city: string;
  customer_phone: string;
  free_delivery?: { applied: boolean; order_number: number | null; limit: number };
}

export default function OrderStatus({ orderId, accessKey }: { orderId: string; accessKey?: string }) {
  const t = useTranslations("orderStatus");
  const { clear } = useCartActions();
  const [status, setStatus] = useState<Status>("pending");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const cleared = useRef(false);
  const firedPurchase = useRef(false);
  const keyQuery = accessKey ? `?key=${encodeURIComponent(accessKey)}` : "";

  useEffect(() => {
    let stop = false;
    let attempts = 0;

    async function poll() {
      if (stop) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/orders/${orderId}/status${keyQuery}`, { cache: "no-store" });
        const data = await res.json();
        if (stop) return;
        if (data.status && data.status !== "pending") {
          setStatus(data.status === "paid" || data.status === "cod" ? data.status : "failed");
          return;
        }
      } catch {
        // transient network error — next tick retries
      }
      if (!stop && attempts < MAX_POLLS) {
        setTimeout(poll, 3000);
      } else if (!stop) {
        setStatus("failed");
      }
    }

    poll();
    return () => {
      stop = true;
    };
  }, [orderId, keyQuery]);

  useEffect(() => {
    if (status !== "paid" && status !== "cod") return;
    if (!cleared.current) {
      cleared.current = true;
      clear();
    }
    fetch(`/api/orders/${orderId}${keyQuery}`)
      .then((r) => r.json())
      .then((data: OrderDetail) => {
        setOrder(data);
        if (!firedPurchase.current) {
          firedPurchase.current = true;
          trackEvent("purchase", {
            ecommerce: {
              transaction_id: String(data.id),
              currency: "SAR",
              value: data.total,
            },
          });
        }
        // The abandoned-cart record is only ever cleaned up once we know
        // for sure the order went through — this is the one place both
        // COD and a completed card payment (redirected back here) reliably
        // pass through.
        if (data.customer_phone) {
          fetch(`/api/abandoned-cart/${data.customer_phone}`, { method: "DELETE" }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [status, orderId, keyQuery, clear]);

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-600" aria-hidden />
        <p className="text-lg font-bold text-navy-900">{t("verifying")}</p>
        <p className="text-sm text-navy-500">{t("verifyingHint")}</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <XCircle className="h-14 w-14 text-rose-500" aria-hidden />
        <p className="text-lg font-bold text-navy-900">{t("failed")}</p>
        <p className="text-sm text-navy-500">{t("failedHint")}</p>
        <Link
          href="/checkout"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {t("retry")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CheckCircle2 className="h-14 w-14 text-brand-600" aria-hidden />
      <p className="text-lg font-bold text-navy-900">{t("success")}</p>
      {order && (
        <p className="text-sm text-navy-500">
          {status === "cod" ? t("codNote") : ""}
          {t("orderNumber", { number: order.order_number })}
        </p>
      )}
      {order?.free_delivery?.applied && (
        <p className="rounded-full bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700">
          {order.free_delivery.order_number === order.free_delivery.limit
            ? t("lastFreeDelivery")
            : t("freeDeliveryProgress", {
                number: order.free_delivery.order_number ?? 1,
                limit: order.free_delivery.limit,
              })}
        </p>
      )}
      {order && (
        <div className="mt-4 w-full max-w-sm rounded-2xl border border-navy-900/8 p-5 text-start">
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">{t("total")}</span>
            <span className="font-bold text-navy-900"><SarPrice amount={order.total} /></span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-navy-500">{t("deliveredTo")}</span>
            <span className="font-semibold text-navy-900">{order.city}</span>
          </div>
        </div>
      )}
      <Link
        href="/browse"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}
