import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import TrackOrderView from "@/components/TrackOrderView";
import { getAppConfig } from "@/lib/api";
import { localizedAlternates } from "@/lib/i18n-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trackOrder" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: localizedAlternates("/track-order", locale),
  };
}

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1 bg-navy-900/[0.02] px-4 py-10 sm:px-6 lg:px-8">
        <TrackOrderView />
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
