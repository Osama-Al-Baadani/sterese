"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, Loader2, Package, Search, Truck, XCircle } from "lucide-react";
import type { NativeOrder } from "@/lib/types";
import SarPrice from "./SarPrice";

const STEPS = ["pending", "confirmed", "preparing", "shipped", "delivered"] as const;

export default function TrackOrderView() {
  const locale = useLocale();
  const t = useTranslations("trackOrder");
  const tOrders = useTranslations("orders");
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<NativeOrder | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("notFound"));
      } else {
        setOrder(data);
      }
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  }

  const effectiveStatus = (order?.delivery_status || order?.status || "pending").toLowerCase();
  const isCancelled = effectiveStatus === "cancelled" || effectiveStatus === "failed";
  const currentIndex = STEPS.indexOf(effectiveStatus as (typeof STEPS)[number]);
  const activeStep = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-navy-900/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Truck className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold text-navy-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-navy-500">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-navy-700">
                {t("orderNumberLabel")}
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t("orderNumberPlaceholder")}
                className="w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-navy-700">
                {t("phoneLabel")}
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {t("submit")}
          </button>
        </form>
      </div>

      {order && (
        <div className="mt-6 rounded-3xl border border-navy-900/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-900/8 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">
                {tOrders("orderNumber", { number: order.order_number })}
              </h2>
              {order.created_at && (
                <p className="text-xs text-navy-500">
                  {new Date(order.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
            </div>
            <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-extrabold text-brand-700">
              {tOrders(`status.${isCancelled ? "cancelled" : STEPS[activeStep]}`)}
            </span>
          </div>

          {isCancelled ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <XCircle className="h-6 w-6 shrink-0 text-rose-600" aria-hidden />
              <p className="text-sm font-bold">{tOrders("status.cancelled")}</p>
            </div>
          ) : (
            <div className="relative mt-8">
              <div className="absolute top-5 right-[10%] left-[10%] h-1 rounded-full bg-navy-900/10" aria-hidden>
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
                />
              </div>
              <div className="relative grid grid-cols-5 gap-2">
                {STEPS.map((step, idx) => {
                  const done = idx <= activeStep;
                  const isCurrent = idx === activeStep;
                  const Icon =
                    step === "pending"
                      ? Clock
                      : step === "preparing"
                        ? Package
                        : step === "shipped"
                          ? Truck
                          : CheckCircle2;
                  return (
                    <div key={step} className="flex flex-col items-center text-center">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          done
                            ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25"
                            : "border-navy-900/10 bg-white text-navy-300"
                        } ${isCurrent ? "ring-4 ring-brand-500/25 scale-110" : ""}`}
                      >
                        <Icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <span
                        className={`mt-2.5 text-[11px] font-bold leading-tight ${
                          done ? "text-navy-900" : "text-navy-400"
                        }`}
                      >
                        {t(`step.${step}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-navy-900/8 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy-500">{tOrders("total")}</span>
              <span className="text-lg font-extrabold text-navy-900">
                <SarPrice amount={order.total} />
              </span>
            </div>
            {order.address && (
              <p className="mt-2 text-xs text-navy-500">
                {order.city ? `${order.city} — ` : ""}
                {order.address}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
