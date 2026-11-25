import QRCode from "qrcode";
import PhoneMockup from "./PhoneMockup";
import StoreBadges from "./StoreBadges";

const APP_LINK = "https://storeseco.com/app";

export default async function AppDownloadBanner() {
  const qrDataUrl = await QRCode.toDataURL(APP_LINK, {
    margin: 1,
    color: { dark: "#1356a0", light: "#00000000" },
    width: 200,
  });

  return (
    <section id="download" className="bg-gradient-to-l from-brand-700 to-brand-600 py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="scale-90 sm:scale-100">
            <PhoneMockup />
          </div>
        </div>

        <div className="order-1 text-center lg:order-2 lg:text-right">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            حمّل تطبيق المخازن الاقتصادية
          </h2>
          <p className="mt-4 text-lg text-brand-50">
            عروض أكبر · تجربة أسهل · أينما كنت
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center lg:justify-start">
            <StoreBadges variant="light" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="امسح الكود لتحميل التطبيق"
              width={104}
              height={104}
              className="hidden rounded-xl bg-white p-2 shadow-lg sm:block"
            />
          </div>
          <p className="mt-3 hidden text-sm text-brand-100 sm:block">امسح الكود بكاميرا جوالك</p>
        </div>
      </div>
    </section>
  );
}
