import type { Metadata } from "next";
import { BadgePercent, HeartHandshake, ShieldCheck, Truck } from "lucide-react";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { hreflangAlternates } from "@/lib/i18n-helpers";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "المخازن الاقتصادية متجر إلكتروني سعودي يوفر كل احتياجاتك اليومية بعروض حصرية وجودة عالية وتوصيل سريع.",
  alternates: { canonical: "/about", languages: hreflangAlternates("/about") },
};

const VALUES = [
  { Icon: ShieldCheck, title: "جودة مضمونة", body: "نختار منتجاتنا بعناية لنضمن لك أعلى مستوى من الجودة." },
  { Icon: Truck, title: "توصيل سريع", body: "فريق توصيل مخصص يوصلك طلبك في أسرع وقت ممكن." },
  { Icon: BadgePercent, title: "أسعار منافسة", body: "عروض وخصومات مستمرة على أوسع تشكيلة منتجات." },
  { Icon: HeartHandshake, title: "خدمة عملاء", body: "فريق دعم جاهز للرد على استفساراتك في أي وقت." },
];

export default async function AboutPage() {
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-navy-900">من نحن</h1>
          <p className="mt-4 leading-8 text-navy-700">
            المخازن الاقتصادية متجر إلكتروني سعودي يهدف لتوفير كل احتياجاتك اليومية في مكان واحد
            — بعروض حصرية، جودة عالية، وتوصيل سريع. نؤمن إن التسوق لازم يكون سهل وموثوق، ولهذا
            نحرص على اختيار كل منتج بعناية ونطور خدماتنا باستمرار لراحتك.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {VALUES.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-navy-900/8 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-navy-900">{title}</h3>
                  <p className="mt-1 text-sm text-navy-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
