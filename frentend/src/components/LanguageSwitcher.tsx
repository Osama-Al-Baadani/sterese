"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export default function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/15 bg-white/40 px-3 py-2 text-xs font-bold text-navy-900 transition hover:bg-white/70"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span className="sm:hidden">{locale === "ar" ? "EN" : "AR"}</span>
      <span className="hidden sm:inline">{t("language")}</span>
    </button>
  );
}
