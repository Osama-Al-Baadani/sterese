import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OrderStatus from "@/components/OrderStatus";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderStatus" });
  return { title: t("title") };
}

// Where checkout lands now: /order-confirmation/{id}/{access_key}. The key
// (handed back only to whoever created the order) is what lets this page
// read the order without a login — the backend no longer serves an order
// to anyone who just knows its sequential id. It's a path segment rather
// than ?key= because PayMob appends its own query string to the redirect.
export default async function OrderConfirmationWithKeyPage({
  params,
}: {
  params: Promise<{ id: string; key: string; locale: string }>;
}) {
  const { id, key, locale } = await params;
  setRequestLocale(locale);
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
          <OrderStatus orderId={id} accessKey={key} />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
