import Image from "next/image";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { getAppConfig, getCategories } from "@/lib/api";
import { localizedName } from "@/lib/i18n-helpers";
import { Link } from "@/i18n/navigation";
import AccountIcon from "./AccountIcon";
import CartIcon from "./CartIcon";
import CategoryNavBar from "./CategoryNavBar";
import FavoriteIcon from "./FavoriteIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import LocationButton from "./LocationButton";
import MobileBottomNav from "./MobileBottomNav";
import MobileCategoriesMenu from "./MobileCategoriesMenu";
import SearchBar from "./SearchBar";

export default async function Header() {
  const [{ deliveryZones }, categories, t, locale] = await Promise.all([
    getAppConfig(),
    getCategories(),
    getTranslations("nav"),
    getLocale(),
  ]);

  const searchKeywords = Array.from(
    new Set(
      categories
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 14)
        .map((c) => localizedName(c, locale)),
    ),
  );

  return (
    <>
      <header className="sticky top-0 z-40 shadow-md shadow-navy-900/5">
        <div className="relative border-b border-black/10">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-500/95 backdrop-blur-md" />
          <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            {/* Localized store brand name for logo alt and title */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                <Image src="/logo.png" alt={t("brandName")} width={32} height={32} priority />
              </span>
              <span className="hidden text-lg font-extrabold text-navy-900 sm:inline">{t("brandName")}</span>
            </Link>

            <SearchBar keywords={searchKeywords} />

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
