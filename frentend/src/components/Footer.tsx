import Image from "next/image";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { StoreSettings } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { FacebookIcon, InstagramIcon, SnapchatIcon, TikTokIcon } from "./SocialIcons";

const SOCIAL_LINKS = [
  {
    name: "Snapchat",
    Icon: SnapchatIcon,
    href: "https://www.snapchat.com/add/storeseco_1",
    hoverBg: "hover:bg-[#FFFC00] hover:text-black",
  },
  {
    name: "TikTok",
    Icon: TikTokIcon,
    href: "https://www.tiktok.com/@storesecoksa?_r=1&_t=ZS-9BWrattKJhE",
    hoverBg: "hover:bg-black hover:text-white",
  },
  {
    name: "Instagram",
    Icon: InstagramIcon,
    href: "https://www.instagram.com/storesecoksa/?hl=ar",
    hoverBg: "hover:bg-gradient-to-tr hover:from-amber-500 hover:to-pink-600 hover:text-white",
  },
  {
    name: "Facebook",
    Icon: FacebookIcon,
    href: "https://www.facebook.com/p/%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D8%B2%D9%86-%D8%A7%D9%84%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF%D9%8A%D8%A9-61573061786343/",
    hoverBg: "hover:bg-[#1877F2] hover:text-white",
  },
];

const PAYMENT_METHODS = [
  {
    name: "مدى - mada",
    src: "/payments/mada.svg",
    alt: "شعار بطاقة مدى للدفع الإلكتروني في السعودية (mada)",
    seoLabel: "بطاقة مدى البنكية للدفع الإلكتروني في السعودية",
  },
  {
    name: "Apple Pay",
    src: "/payments/apple-pay.svg",
    alt: "شعار خدمة آبل باي للدفع السريع والآمن (Apple Pay)",
    seoLabel: "خدمة آبل باي للدفع السريع والآمن",
  },
  {
    name: "Visa",
    src: "/payments/visa.svg",
    alt: "شعار بطاقة فيزا للدفع الإلكتروني (Visa)",
    seoLabel: "بطاقات فيزا الائتمانية والخصم المباشر",
  },
  {
    name: "Mastercard",
    src: "/payments/mastercard.svg",
    alt: "شعار بطاقة ماستركارد العالمية (Mastercard)",
    seoLabel: "بطاقات ماستركارد العالمية للدفع الإلكتروني",
  },
];

export default async function Footer({ settings }: { settings: StoreSettings }) {
  const year = new Date().getFullYear();
  // Load footer and meta translations to localize brand name and tagline
  const [t, tMeta] = await Promise.all([
    getTranslations("footer"),
    getTranslations("meta"),
  ]);
  const whatsappClean = (settings.whatsapp_phone || "").replace(/\D/g, "").replace(/^0/, "966");
  const hasContactInfo = Boolean(
    settings.support_phone ||
    settings.whatsapp_phone ||
    settings.support_email ||
    settings.working_hours_weekday ||
    settings.working_hours_friday
  );

  return (
    <footer className="mt-auto border-t border-white/10 bg-gradient-to-b from-navy-900 to-[#121c30] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        {/* Main 5-column grid */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Col 1: Identity & Social */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                // Localized store logo alt text
                alt={tMeta("brand")}
                width={42}
                height={42}
                className="h-10.5 w-auto object-contain"
              />
              <div>
                {/* Localized store brand name and short tagline */}
                <span className="block text-lg font-black tracking-tight">{tMeta("brand")}</span>
                <span className="block text-xs font-semibold text-brand-500">{t("brandTagline")}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-navy-300">
              {t("tagline")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {SOCIAL_LINKS.map(({ name, Icon, href, hoverBg }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 ${hoverBg} shadow-sm`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              {t("quickLinks")}
            </h3>
            <ul className="space-y-3 text-sm text-navy-300">
              <li>
                <Link href="/" className="inline-block py-0.5 transition hover:text-white">
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/browse" className="inline-block py-0.5 transition hover:text-white">
                  {t("browse")}
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="inline-block py-0.5 transition hover:text-white">
                  {t("trackOrder")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-block py-0.5 transition hover:text-white">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-block py-0.5 transition hover:text-white">
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              {t("storePolicies")}
            </h3>
            <ul className="space-y-3 text-sm text-navy-300">
              <li>
                <Link href="/policies/terms" className="inline-block py-0.5 transition hover:text-white">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="inline-block py-0.5 transition hover:text-white">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/policies/return" className="inline-block py-0.5 transition hover:text-white">
                  {t("returns")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="inline-block py-0.5 transition hover:text-white">
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Branches */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              {t("ourBranches")}
            </h3>
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:border-0 sm:bg-transparent sm:p-0">
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                  <span>{t("mainBranch")}</span>
                </div>
                <p className="mt-1 text-xs text-navy-300">
                  {t("branchAddress")}
                </p>
              </div>
              <div>
                <a
                  href="https://share.google/NhA4nghqRUVGDB6oP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/25 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-400 transition hover:bg-brand-500/20 hover:text-brand-300"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  <span>{t("viewOnMap")}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Col 5: Contact & App Download */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              {t("contactUs")}
            </h3>
            {hasContactInfo && (
              <ul className="space-y-3 text-sm text-navy-300">
                {settings.support_phone && (
                  <li>
                    <a
                      href={`tel:${settings.support_phone}`}
                      className="group flex items-center gap-2.5 py-0.5 transition hover:text-white"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:scale-110" aria-hidden />
                      <span dir="ltr">{settings.support_phone}</span>
                    </a>
                  </li>
                )}
                {settings.whatsapp_phone && (
                  <li>
                    <a
                      href={`https://wa.me/${whatsappClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 py-0.5 transition hover:text-white"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:scale-110" aria-hidden />
                      <span dir="ltr">{settings.whatsapp_phone}</span>
                    </a>
                  </li>
                )}
                {settings.support_email && (
                  <li>
                    <a
                      href={`mailto:${settings.support_email}`}
                      className="group flex items-center gap-2.5 py-0.5 transition hover:text-white"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:scale-110" aria-hidden />
                      <span dir="ltr">{settings.support_email}</span>
                    </a>
                  </li>
                )}
                {(settings.working_hours_weekday || settings.working_hours_friday) && (
                  <li className="flex items-start gap-2.5 py-0.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                    <span className="leading-relaxed">
                      {settings.working_hours_weekday}
                      {settings.working_hours_weekday && settings.working_hours_friday && <br />}
                      {settings.working_hours_friday}
                    </span>
                  </li>
                )}
              </ul>
            )}

            {/* Quick App Link */}
            <div className={hasContactInfo ? "mt-5 border-t border-white/10 pt-4" : "mt-2"}>
              <span className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-navy-300">
                <Smartphone className="h-3.5 w-3.5 text-brand-500" />
                {t("downloadApp")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://apps.apple.com/us/app/id6778609957"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  <Image
                    src="/payments/app-store.svg"
                    alt="App Store"
                    width={14}
                    height={14}
                    className="h-3.5 w-auto"
                  />
                  <span>App Store</span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=sa.storeseco.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  <Image
                    src="/payments/google-play.svg"
                    alt="Google Play"
                    width={14}
                    height={14}
                    className="h-3.5 w-auto"
                  />
                  <span>Google Play</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Section with SEO Archiving Optimization */}
        <section
          aria-labelledby="payment-methods-heading"
          className="mt-12 border-t border-white/10 pt-8"
        >
          {/* Schema.org paymentAccepted metadata for search indexing */}
          <meta itemProp="paymentAccepted" content="Cash, Credit Card, Debit Card, mada, Visa, Mastercard, Apple Pay" />

          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <h4
              id="payment-methods-heading"
              className="text-xs font-bold uppercase tracking-wider text-navy-200"
            >
              {t("paymentMethods")}
            </h4>

            {/* Payment Icons */}
            <div
              className="flex flex-wrap items-center justify-center gap-2.5"
              role="list"
              aria-label={t("paymentMethods")}
            >
              {PAYMENT_METHODS.map(({ name, src, alt, seoLabel }) => (
                <div
                  key={name}
                  role="listitem"
                  className="transition duration-150 hover:scale-105"
                  title={`${name} - ${seoLabel}`}
                >
                  <Image
                    src={src}
                    alt={alt}
                    width={48}
                    height={30}
                    className="h-7 w-auto drop-shadow-sm"
                  />
                  <span className="sr-only">{name} - {seoLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Bar: Copyright */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-navy-300">
          {/* Localized store name in copyright bar */}
          © {year} {tMeta("brand")}. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
