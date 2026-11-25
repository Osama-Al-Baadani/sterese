"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { RefreshCw } from "lucide-react";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();

  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, url: window.location.href }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  const t =
    locale === "ar"
      ? { title: "صار خطأ غير متوقع", body: "جرّب تحدّث الصفحة، وإذا استمرت المشكلة تواصل معنا.", retry: "إعادة المحاولة" }
      : { title: "Something went wrong", body: "Try refreshing the page — contact us if this keeps happening.", retry: "Try again" };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-extrabold text-navy-900">{t.title}</h1>
      <p className="max-w-sm text-navy-500">{t.body}</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-navy-900 transition hover:brightness-105"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {t.retry}
      </button>
    </div>
  );
}
