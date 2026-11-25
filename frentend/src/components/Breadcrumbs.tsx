import { Link } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { safeJsonLd } from "@/lib/format";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <nav aria-label="مسار التنقل" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-navy-500">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronLeft className="h-3.5 w-3.5 text-navy-300" aria-hidden />}
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
