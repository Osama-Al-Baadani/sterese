import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server"; // Server-side i18n helpers for login page
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";

// Localized page title metadata for Arabic and English routes
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("title") };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Bind the active route locale before fetching translations
  setRequestLocale(locale);
  const [{ storeSettings }, t] = await Promise.all([
    getAppConfig(),
    getTranslations({ locale, namespace: "auth" }), // Load localized auth heading and subtitle
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          {/* Localized login heading and subtitle */}
          <h1 className="mb-1 text-center text-2xl font-extrabold text-navy-900">{t("title")}</h1>
          <p className="mb-8 text-center text-sm text-navy-500">{t("subtitle")}</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}
