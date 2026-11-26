import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig } from "@/lib/api";
import CartView from "@/components/CartView";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.cart" });
  return { title: t("title") };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.cart" }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-extrabold text-navy-900">{t("title")}</h1>
          <CartView />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
