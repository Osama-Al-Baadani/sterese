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

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
          <OrderStatus orderId={id} />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
