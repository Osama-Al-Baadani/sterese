import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server"; // Server-side i18n helpers for orders page
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OrdersView from "@/components/OrdersView";

// Localized page title metadata for Arabic and English routes
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orders" });
  return { title: t("title") };
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Bind active locale before rendering server translations
  setRequestLocale(locale);
  const [{ storeSettings }, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "orders" }), // Load localized page heading
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Localized orders page heading */}
          <h1 className="mb-6 text-2xl font-extrabold text-navy-900">{t("title")}</h1>
          <OrdersView />
        </div>
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}
