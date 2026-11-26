import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { localizedAlternates } from "@/lib/i18n-helpers";

type PolicyType = "terms" | "privacy" | "return";
const VALID_TYPES: PolicyType[] = ["terms", "privacy", "return"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; locale: string }>;
}): Promise<Metadata> {
  const { type, locale } = await params;
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.policies" }),
  ]);
  const policy = VALID_TYPES.includes(type as PolicyType) ? config.policies[type as PolicyType] : null;
  return {
    title: policy?.title ?? t("fallbackTitle"),
    alternates: localizedAlternates(`/policies/${type}`, locale),
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ type: string; locale: string }>;
}) {
  const { type, locale } = await params;
  setRequestLocale(locale);
  if (!VALID_TYPES.includes(type as PolicyType)) notFound();

  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "pages.policies" }),
  ]);
  const policy = config.policies[type as PolicyType];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          {!policy ? (
            <p className="text-navy-500">{t("unavailable")}</p>
          ) : (
            <>
              <h1 className="mb-8 text-3xl font-extrabold text-navy-900">{policy.title}</h1>
              <div className="space-y-6">
                {policy.sections.map((s, i) => (
                  <div key={i}>
                    <h2 className="mb-2 font-bold text-navy-900">{s.heading}</h2>
                    <p className="leading-7 whitespace-pre-line text-navy-600">{s.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
