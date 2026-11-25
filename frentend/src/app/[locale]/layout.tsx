import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"; // Load locale messages explicitly
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import ErrorLogger from "@/components/ErrorLogger";
import { FavoritesProvider } from "@/lib/favorites-context";
import { safeJsonLd } from "@/lib/format";
import { isIndexable } from "@/lib/seo";
import { gtmScript, GtmNoscript } from "@/components/GoogleTagManager";
import "../globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const indexable = await isIndexable();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("defaultTitle"),
      template: `%s | ${t("brand")}`,
    },
    description: t("description"),
    // Belt-and-suspenders alongside robots.ts — this repeats site-wide
    // whatever robots.ts already tells crawlers, so a page-level metadata
    // override can't accidentally re-enable indexing outside production.
    robots: {
      index: indexable,
      follow: indexable,
    },
    openGraph: {
      siteName: t("brand"),
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
      images: [{ url: "/logo.png" }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Renders (and any client component below can read messages) in this
  // locale even though the page itself may be statically cached across
  // requests — without this a request for /en could render with Arabic
  // strings if an /ar render happened to be cached first.
  setRequestLocale(locale);
  const messages = await getMessages({ locale }); // Resolve messages for the active locale

  const dir = locale === "ar" ? "rtl" : "ltr";
  const brand = locale === "ar" ? "المخازن الاقتصادية" : "Al Makhazen Al Eqtisadeya";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/browse?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang={locale} dir={dir} className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-navy-900">
        {process.env.NEXT_PUBLIC_GTM_CONTAINER_ID && (
          <>
            <script
              id="gtm-script"
              dangerouslySetInnerHTML={{ __html: gtmScript(process.env.NEXT_PUBLIC_GTM_CONTAINER_ID) }}
            />
            <GtmNoscript containerId={process.env.NEXT_PUBLIC_GTM_CONTAINER_ID} />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
        <ErrorLogger />
        {/* Pass locale and messages explicitly so client components always match the active route locale */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>{children}</FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}