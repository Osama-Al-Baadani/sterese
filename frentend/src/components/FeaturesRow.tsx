import { BadgePercent, HeartHandshake, Lock, RotateCcw, ShieldCheck, Truck } from "lucide-react"; // Semantic icons matched to badge meaning
import { getLocale, getTranslations } from "next-intl/server"; // Server locale and home translations

const FALLBACK_ICONS = [HeartHandshake, BadgePercent, Truck, ShieldCheck];

// Maps Arabic badges returned from the admin panel to English equivalents on /en
const BADGE_TRANSLATIONS_EN: [RegExp, string][] = [
  [/توصيل|شحن/i, "Fast Delivery"],
  [/دفع\s*آمن|دفع/i, "Secure Payment"],
  [/إرجاع|استرجاع|استبدال/i, "Free Returns"],
  [/جودة/i, "Guaranteed Quality"],
  [/خدمة\s*عملاء|دعم/i, "Premium Customer Support"],
  [/عروض|تخفيضات|خصومات|أسعار/i, "Ongoing Deals & Discounts"],
  [/أصلي|منتجات/i, "100% Authentic Products"],
];

// Translate known Arabic admin badges to English; fall back to default English badge if unrecognized
function translateBadgeToEn(label: string, fallback: string): string {
  if (!/[\u0600-\u06FF]/.test(label)) return label;
  for (const [pattern, translation] of BADGE_TRANSLATIONS_EN) {
    if (pattern.test(label)) return translation;
  }
  return fallback;
}

// Pick a matching icon from the badge meaning (Arabic or English) instead of relying on array order
function iconForBadge(label: string, index: number) {
  if (/توصيل|شحن|delivery|shipping/i.test(label)) return Truck;
  if (/دفع|آمن|secure|payment/i.test(label)) return Lock;
  if (/إرجاع|استرجاع|استبدال|return/i.test(label)) return RotateCcw;
  if (/جودة|أصلي|quality|authentic/i.test(label)) return ShieldCheck;
  if (/عروض|تخفيض|خصم|أسعار|deal|discount|offer/i.test(label)) return BadgePercent;
  if (/خدمة|عملاء|دعم|support|service/i.test(label)) return HeartHandshake;
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

export default async function FeaturesRow({ badges }: { badges: string[] }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]); // Load home translations and active locale

  const defaultBadges = [t("feature1"), t("feature2"), t("feature3"), t("feature4")]; // Localized fallback badges
  const rawLabels = badges.length === 4 ? badges : defaultBadges; // Prefer 4 admin badges when configured
  // Keep Arabic admin badges as-is on /ar, and translate them on /en
  const labels =
    locale === "en" ? rawLabels.map((label, i) => translateBadgeToEn(label, defaultBadges[i])) : rawLabels;

  return (
    <section className="bg-brand-50/60 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Localized section heading and meaning-matched badge icons */}
        <h2 className="mb-10 text-center text-2xl font-extrabold text-navy-900 sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {labels.map((label, i) => {
            const Icon = iconForBadge(rawLabels[i], i);
            return (
              <div key={i} className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <span className="text-sm font-bold text-navy-900">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
