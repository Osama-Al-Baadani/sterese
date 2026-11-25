import type { Metadata } from "next";
import { getAppConfig } from "@/lib/api";
import CheckoutForm from "@/components/CheckoutForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "إتمام الطلب" };

export default async function CheckoutPage() {
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-extrabold text-navy-900">إتمام الطلب</h1>
          <CheckoutForm deliveryZones={config.deliveryZones} storeSettings={config.storeSettings} />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
