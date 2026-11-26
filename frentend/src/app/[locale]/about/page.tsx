import type { Metadata } from "next";
import { BadgePercent, HeartHandshake, ShieldCheck, Truck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { localizedAlternates } from "@/lib/i18n-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.about" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localizedAlternates("/about", locale),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.about" }),
  ]);

  const values = [
    { Icon: ShieldCheck, title: t("quality"), body: t("qualityBody") },
    { Icon: Truck, title: t("delivery"), body: t("deliveryBody") },
    { Icon: BadgePercent, title: t("prices"), body: t("pricesBody") },
    { Icon: HeartHandshake, title: t("support"), body: t("supportBody") },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-navy-900">{t("title")}</h1>
          <p className="mt-4 leading-8 text-navy-700">{t("body")}</p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {values.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-navy-900/8 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-navy-900">{title}</h3>
                  <p className="mt-1 text-sm text-navy-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
