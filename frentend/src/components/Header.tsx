import Image from "next/image";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { getAppConfig, getCategories } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import AccountIcon from "./AccountIcon";
import CartIcon from "./CartIcon";
import CategoryNavBar from "./CategoryNavBar";
import FavoriteIcon from "./FavoriteIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import LocationButton from "./LocationButton";
import MobileBottomNav from "./MobileBottomNav";
import MobileCategoriesMenu from "./MobileCategoriesMenu";

export default async function Header() {
  const [{ deliveryZones }, categories, t, locale] = await Promise.all([
    getAppConfig(),
    getCategories(),
    getTranslations("nav"),
    getLocale(),
  ]);

  return (
    <>
      <header className="sticky top-0 z-40 shadow-sm">
        <div className="border-b border-black/10 bg-brand-500">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            {/* Localized store brand name for logo alt and title */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                <Image src="/logo.png" alt={t("brandName")} width={32} height={32} priority />
              </span>
              <span className="hidden text-lg font-extrabold text-navy-900 sm:inline">{t("brandName")}</span>
            </Link>

            {/* Restored original search form with locale-aware action and RTL/LTR logical spacing */}
            <form
              action={locale === "en" ? "/en/browse" : "/browse"}
              method="get"
              className="order-3 w-full basis-full sm:order-none sm:basis-auto sm:flex-1"
            >
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 start-4 h-5 w-5 -translate-y-1/2 text-navy-300"
                  aria-hidden
                />
                <input
                  type="search"
                  name="search"
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-full border border-black/5 bg-white py-2.5 ps-12 pe-4 text-base text-navy-900 outline-none transition focus:ring-2 focus:ring-navy-900/15 sm:ps-11 sm:text-sm"
                />
              </label>
            </form>

            <LocationButton deliveryZones={deliveryZones} />

            <Suspense fallback={null}>
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
            </Suspense>

            <MobileCategoriesMenu categories={categories} locale={locale} />

            <div className="hidden items-center md:flex">
              <AccountIcon />
              <FavoriteIcon />
              <CartIcon />
            </div>
          </div>
        </div>

        <CategoryNavBar categories={categories} locale={locale} />
      </header>

      <MobileBottomNav />
    </>
  );
}
