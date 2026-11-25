"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useCart } from "@/lib/cart-context";
import SarPrice from "./SarPrice";

type Status = "pending" | "paid" | "cod" | "failed";

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
  const { clear } = useCart();
  const [status, setStatus] = useState<Status>("pending");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const cleared = useRef(false);
  const firedPurchase = useRef(false);
  const keyQuery = accessKey ? `?key=${encodeURIComponent(accessKey)}` : "";

  useEffect(() => {
    let stop = false;

    async function poll() {
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
      if (!stop) setTimeout(poll, 3000);
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
        <p className="text-lg font-bold text-navy-900">جارٍ التحقق من الدفع...</p>
        <p className="text-sm text-navy-500">لا تغلق الصفحة، هذا يستغرق ثواني قليلة</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <XCircle className="h-14 w-14 text-rose-500" aria-hidden />
        <p className="text-lg font-bold text-navy-900">تعذّر إتمام الدفع</p>
        <p className="text-sm text-navy-500">لم يتم خصم أي مبلغ — يمكنك إعادة المحاولة</p>
        <Link
          href="/checkout"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          إعادة المحاولة
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CheckCircle2 className="h-14 w-14 text-brand-600" aria-hidden />
      <p className="text-lg font-bold text-navy-900">تم استلام طلبك بنجاح! 🎉</p>
      {order && (
        <p className="text-sm text-navy-500">
          {status === "cod" ? "سيتم تحصيل المبلغ نقداً عند التسليم — " : ""}رقم الطلب #{order.order_number}
        </p>
      )}
      {order?.free_delivery?.applied && (
        <p className="rounded-full bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700">
          {order.free_delivery.order_number === order.free_delivery.limit
            ? "🎁 هذا كان آخر توصيل مجاني لك — استمتعت بكل الفرص المجانية!"
            : `🎁 هذا طلبك المجاني رقم ${order.free_delivery.order_number} من ${order.free_delivery.limit}`}
        </p>
      )}
      {order && (
        <div className="mt-4 w-full max-w-sm rounded-2xl border border-navy-900/8 p-5 text-right">
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">الإجمالي</span>
            <span className="font-bold text-navy-900"><SarPrice amount={order.total} /></span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-navy-500">التوصيل إلى</span>
            <span className="font-semibold text-navy-900">{order.city}</span>
          </div>
        </div>
      )}
      <Link
        href="/browse"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
      >
        متابعة التسوق
      </Link>
    </div>
  );
}
