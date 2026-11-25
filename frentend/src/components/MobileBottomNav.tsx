"use client";

import { Heart, Home, ShoppingCart, Store, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";

export default function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { count } = useCart();
  const { ids } = useFavorites();
  const { isLoggedIn, hydrated } = useAuth();

  const tabs = [
    { href: "/", label: t("home"), Icon: Home, match: (p: string) => p === "/" },
    { href: "/browse", label: t("store"), Icon: Store, match: (p: string) => p.startsWith("/browse") },
    { href: "/cart", label: t("cart"), Icon: ShoppingCart, badge: count, match: (p: string) => p === "/cart" },
    {
      href: "/favorites",
      label: t("favorites"),
      Icon: Heart,
      badge: ids.length,
      match: (p: string) => p === "/favorites",
    },
    {
      href: hydrated && isLoggedIn ? "/account" : "/login",
      label: t("account"),
      Icon: User,
      match: (p: string) => p === "/account" || p === "/login",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/8 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      <div className="grid grid-cols-5">
        {tabs.map(({ href, label, Icon, badge, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                active ? "text-brand-700" : "text-brand-600"
              }`}
            >
              <span className="relative">
                <Icon className="h-5.5 w-5.5" aria-hidden />
                {!!badge && (
                  <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-900 px-1 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
