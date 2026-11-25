import type { Metadata } from "next";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { hreflangAlternates } from "@/lib/i18n-helpers";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق دعم المخازن الاقتصادية عبر الهاتف أو واتساب أو البريد الإلكتروني.",
  alternates: { canonical: "/contact", languages: hreflangAlternates("/contact") },
};

export default async function ContactPage() {
  const { storeSettings } = await getAppConfig();

  const rows = [
    { Icon: Phone, label: "الهاتف", value: storeSettings.support_phone, href: `tel:${storeSettings.support_phone}` },
    {
      Icon: MessageCircle,
      label: "واتساب",
      value: storeSettings.whatsapp_phone,
      href: `https://wa.me/${storeSettings.whatsapp_phone.replace(/\D/g, "")}`,
    },
    { Icon: Mail, label: "البريد الإلكتروني", value: storeSettings.support_email, href: `mailto:${storeSettings.support_email}` },
  ].filter((r) => r.value);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-navy-900">تواصل معنا</h1>
          <p className="mt-3 text-navy-500">فريقنا جاهز لمساعدتك في أي وقت</p>

          <div className="mt-8 space-y-3">
            {rows.map((r) => (
              <a
                key={r.label}
                href={r.href}
                dir="ltr"
                className="flex items-center gap-4 rounded-2xl border border-navy-900/8 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <r.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span dir="rtl">
                  <span className="block text-xs text-navy-500">{r.label}</span>
                  <span className="block font-semibold text-navy-900">{r.value}</span>
                </span>
              </a>
            ))}

            {(storeSettings.working_hours_weekday || storeSettings.working_hours_friday) && (
              <div className="flex items-start gap-4 rounded-2xl border border-navy-900/8 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Clock className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <span className="block text-xs text-navy-500">ساعات العمل</span>
                  <span className="block font-semibold text-navy-900">{storeSettings.working_hours_weekday}</span>
                  <span className="block font-semibold text-navy-900">{storeSettings.working_hours_friday}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}
