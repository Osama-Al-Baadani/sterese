"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useCartActions, useCartCount } from "@/lib/cart-context";

export default function CartIcon() {
  const tNav = useTranslations("nav");
  const count = useCartCount();
  const { openDrawer } = useCartActions();

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/5"
      aria-label={tNav("cart")}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-navy-900 px-1 text-[10px] font-bold text-white ring-2 ring-brand-500">
          {count}
        </span>
      )}
    </button>
  );
}
