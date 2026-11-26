import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { safeJsonLd } from "@/lib/format";
import { localizedPath } from "@/lib/i18n-helpers";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${localizedPath(item.href, locale)}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <nav aria-label={tCommon("breadcrumb")} className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-navy-500">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronLeft className="h-3.5 w-3.5 text-navy-300 ltr:rotate-180" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="transition hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-navy-900">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
