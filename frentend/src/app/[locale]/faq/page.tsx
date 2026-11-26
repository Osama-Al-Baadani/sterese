import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "pages.faq" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localizedAlternates("/faq", locale),
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.faq" }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-3xl font-extrabold text-navy-900">{t("title")}</h1>

          {config.faqs.length === 0 ? (
            <p className="text-navy-500">{t("empty")}</p>
          ) : (
            <div className="space-y-3">
              {config.faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-navy-900/8 open:border-brand-300 open:bg-brand-50/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-navy-900">
                    {f.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-navy-400 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="px-4 pb-4 leading-7 text-navy-600">{f.answer}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
