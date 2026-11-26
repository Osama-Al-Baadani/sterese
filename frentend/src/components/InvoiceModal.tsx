"use client";

import { useLocale, useTranslations } from "next-intl";
import { Printer, X } from "lucide-react";
import type { NativeOrder } from "@/lib/types";
import SarPrice from "./SarPrice";

const VAT_RATE = 0.15;
const VAT_NUMBER = "312496273400003";

/** Prices are VAT-inclusive — split each amount into its pre-VAT price and
 * the 15% VAT it contains, the same math the Flutter app's PDF invoice
 * uses, so the numbers match across both apps. */
function splitVat(amountIncludingVat: number) {
  const beforeVat = amountIncludingVat / (1 + VAT_RATE);
  return { beforeVat, vat: amountIncludingVat - beforeVat };
}

export default function InvoiceModal({ order, onClose }: { order: NativeOrder; onClose: () => void }) {
  const locale = useLocale();
  const t = useTranslations("invoice");
  const tCommon = useTranslations("common");
  const tOrders = useTranslations("orders");
  const subtotal = splitVat(order.subtotal);
  const delivery = splitVat(order.delivery_fee);
  const codFee = splitVat(order.cod_fee ?? 0);
  // Every VAT-inclusive line the customer actually paid — subtotal, delivery,
  // and (for COD orders) the COD surcharge — must be summed here, or this
  // breakdown silently falls short of order.total and looks like an error.
  const totalVat = subtotal.vat + delivery.vat + codFee.vat;
  // "المجموع قبل الضريبة" is the PRODUCTS-only pre-VAT line — delivery and
  // the COD fee each get their own pre-VAT line right below it, so folding
  // them in here too would double-count them in the visible breakdown
  // (the printed lines wouldn't sum to order.total anymore).

  const rawStatus = order.delivery_status ?? order.status;
  const knownStatuses = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];
  const statusLabel = knownStatuses.includes(rawStatus)
    ? tOrders(`status.${rawStatus as "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled"}`)
    : rawStatus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 print:static print:bg-transparent print:p-0"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* Toolbar — hidden on the printed page */}
        <div className="flex shrink-0 items-center justify-between border-b border-navy-900/8 px-5 py-3 print:hidden">
          <h2 className="font-bold text-navy-900">{t("orderReceiptTitle", { number: order.order_number })}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              {t("print")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-navy-400 hover:bg-navy-900/5 hover:text-navy-700"
              aria-label={tCommon("close")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* The invoice itself — this is the only thing that ends up on the printed page */}
        <div id="invoice-print-area" className="overflow-y-auto p-0 print:overflow-visible">
          {/* Header band */}
          <div className="flex items-center justify-between bg-navy-900 px-8 py-6">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain img, not next/image: this prints via window.print() and must render immediately without next/image's lazy-loading */}
              <img src="/logo.png" alt={t("storeName")} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
              <div>
                <p className="text-lg font-extrabold text-white">{t("storeName")}</p>
                <p className="text-xs text-white/70">{t("storeNameSecondary")}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-lg font-extrabold text-white">{t("receipt")}</p>
              <span className="mt-1 inline-block rounded bg-gold-500 px-2.5 py-1 text-[10px] font-bold text-white">
                Order Receipt
              </span>
            </div>
          </div>

          <div className="space-y-5 px-8 py-6">
            {/* Order + customer info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-navy-900/[0.03] p-3.5 text-sm">
                <p className="mb-2 font-bold text-navy-900">{t("orderInfo")}</p>
                <p className="text-navy-600">
                  {t("orderNumber")} <span className="font-semibold text-navy-900">#{order.order_number}</span>
                </p>
                {order.created_at && (
                  <p className="mt-1 text-navy-600">
                    {t("date")}{" "}
                    <span className="font-semibold text-navy-900">
                      {new Date(order.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}
                    </span>
                  </p>
                )}
                <p className="mt-1 text-navy-600">
                  {t("status")} <span className="font-semibold text-navy-900">{statusLabel}</span>
                </p>
              </div>
              <div className="rounded-lg bg-navy-900/[0.03] p-3.5 text-sm">
                <p className="mb-2 font-bold text-navy-900">{t("customerInfo")}</p>
                <p className="text-navy-600">
                  {t("name")} <span className="font-semibold text-navy-900">{order.customer_name}</span>
                </p>
                <p className="mt-1 text-navy-600">
                  {t("phone")}{" "}
                  <span dir="ltr" className="font-semibold text-navy-900">
                    {order.customer_phone}
                  </span>
                </p>
                {order.city && (
                  <p className="mt-1 text-navy-600">
                    {t("city")} <span className="font-semibold text-navy-900">{order.city}</span>
                  </p>
                )}
                {order.address && (
                  <p className="mt-1 truncate text-navy-600">
                    {t("address")} <span className="font-semibold text-navy-900">{order.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Items table */}
            <table className="w-full border-collapse overflow-hidden rounded-lg text-sm">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-3 py-2 text-start font-bold">{t("product")}</th>
                  <th className="px-3 py-2 text-start font-bold">{t("sku")}</th>
                  <th className="px-3 py-2 text-center font-bold">{t("quantity")}</th>
                  <th className="px-3 py-2 text-end font-bold">{t("unitPrice")}</th>
                  <th className="px-3 py-2 text-end font-bold">{t("lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-navy-900/[0.03]" : undefined}>
                    <td className="px-3 py-2 text-navy-900">{item.name ?? t("productFallback", { id: item.id })}</td>
                    <td className="px-3 py-2 text-navy-500">{item.sku ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-navy-900">{item.quantity}</td>
                    <td className="px-3 py-2 text-end text-navy-900">
                      {item.price != null ? <SarPrice amount={item.price} /> : "—"}
                    </td>
                    <td className="px-3 py-2 text-end font-semibold text-navy-900">
                      {item.price != null ? <SarPrice amount={item.price * item.quantity} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-start">
              <div className="w-full max-w-[280px] space-y-1.5 rounded-lg border border-navy-900/10 p-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-navy-500">{t("subtotalBeforeVat")}</span>
                  <span className="text-navy-900"><SarPrice amount={subtotal.beforeVat} /></span>
                </div>
                {order.delivery_fee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-navy-500">{t("deliveryBeforeVat")}</span>
                    <span className="text-navy-900"><SarPrice amount={delivery.beforeVat} /></span>
                  </div>
                )}
                {order.cod_fee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-navy-500">{t("codBeforeVat")}</span>
                    <span className="text-navy-900"><SarPrice amount={codFee.beforeVat} /></span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-navy-500">{t("discount")}</span>
                    <span className="text-emerald-700">- <SarPrice amount={order.discount} /></span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-navy-500">{t("vat")}</span>
                  <span className="text-navy-900"><SarPrice amount={totalVat} /></span>
                </div>
                <div className="my-1 border-t border-navy-900/10" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900">{t("totalWithVat")}</span>
                  <span className="text-base font-extrabold text-brand-700"><SarPrice amount={order.total} /></span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-navy-900/8 bg-navy-900/[0.03] px-8 py-3.5 text-center text-[11px] text-navy-500">
            {t("thanks", { vat: VAT_NUMBER })}
          </div>
        </div>
      </div>
    </div>
  );
}
