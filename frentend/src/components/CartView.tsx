"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Minus, PackageX, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { localizedName } from "@/lib/i18n-helpers";
import SarPrice from "./SarPrice";

export default function CartView() {
  const locale = useLocale();
  const { items, subtotal, setQuantity, removeItem, maxQtyFor } = useCart();
  const { isLoggedIn } = useAuth();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy-900/10 py-24 text-center">
        <ShoppingBag className="h-14 w-14 text-navy-300" aria-hidden />
        <p className="text-lg font-bold text-navy-900">سلتك فاضية</p>
        <p className="text-sm text-navy-500">تصفح المنتجات وأضف اللي يعجبك</p>
        <Link
          href="/browse"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {items.map(({ product, quantity }) => {
          const image = product.images[0]?.src;
          const name = localizedName(product, locale);
          return (
            <div
              key={product.id}
              className="flex items-center gap-4 rounded-2xl border border-navy-900/8 p-3"
            >
              <Link href={`/product/${product.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-900/[0.03]">
                {image ? (
                  <Image src={image} alt={name} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-navy-300">
                    <PackageX className="h-6 w-6" aria-hidden />
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-brand-700">
                  {name}
                </Link>
                <p className="mt-1 text-sm font-bold text-brand-700"><SarPrice amount={product.price} /></p>
              </div>

              <div className="flex shrink-0 items-center gap-1 rounded-full border border-navy-900/10 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(product.id, quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-navy-700 hover:bg-navy-900/5"
                  aria-label="إنقاص الكمية"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="w-6 text-center text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(product.id, quantity + 1)}
                  disabled={quantity >= maxQtyFor(product)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-navy-700 hover:bg-navy-900/5 disabled:opacity-40"
                  aria-label="زيادة الكمية"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeItem(product.id)}
                className="shrink-0 rounded-full p-2 text-navy-300 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label="حذف من السلة"
              >
                <Trash2 className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <div className="h-fit rounded-2xl border border-navy-900/8 p-5">
        <h2 className="mb-4 text-base font-bold text-navy-900">ملخص الطلب</h2>
        <div className="flex items-center justify-between text-sm text-navy-700">
          <span>المجموع الفرعي</span>
          <span className="font-semibold"><SarPrice amount={subtotal} /></span>
        </div>
        <p className="mt-1 text-xs text-navy-500">رسوم التوصيل تُحسب بخطوة الدفع</p>
        <Link
          href={isLoggedIn ? "/checkout" : "/login?redirect=/checkout"}
          className="mt-5 flex w-full items-center justify-center rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
        >
          إتمام الطلب
        </Link>
      </div>
    </div>
  );
}
