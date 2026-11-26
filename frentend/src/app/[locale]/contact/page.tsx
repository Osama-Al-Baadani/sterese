import type { Metadata } from "next";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "pages.contact" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localizedAlternates("/contact", locale),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [{ storeSettings }, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.contact" }),
  ]);

  const rows = [
    { Icon: Phone, label: t("phone"), value: storeSettings.support_phone, href: `tel:${storeSettings.support_phone}` },
    {
      Icon: MessageCircle,
      label: t("whatsapp"),
      value: storeSettings.whatsapp_phone,
      href: `https://wa.me/${storeSettings.whatsapp_phone.replace(/\D/g, "")}`,
    },
    { Icon: Mail, label: t("email"), value: storeSettings.support_email, href: `mailto:${storeSettings.support_email}` },
  ].filter((r) => r.value);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-navy-900">{t("title")}</h1>
          <p className="mt-3 text-navy-500">{t("subtitle")}</p>

          <div className="mt-8 space-y-3">
            {rows.map((r) => (
              <a
                key={r.label}
                href={r.href}
                dir="ltr"
                className="flex items-center gap-4 rounded-2xl border border-navy-900/8 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <r.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span dir={locale === "en" ? "ltr" : "rtl"}>
                  <span className="block text-xs text-navy-500">{r.label}</span>
                  <span className="block font-semibold text-navy-900">{r.value}</span>
                </span>
              </a>
            ))}

            {(storeSettings.working_hours_weekday || storeSettings.working_hours_friday) && (
              <div className="flex items-start gap-4 rounded-2xl border border-navy-900/8 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Clock className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <span className="block text-xs text-navy-500">{t("hours")}</span>
                  <span className="block font-semibold text-navy-900">{storeSettings.working_hours_weekday}</span>
                  <span className="block font-semibold text-navy-900">{storeSettings.working_hours_friday}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}
