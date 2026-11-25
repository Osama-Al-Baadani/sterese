import type { Metadata } from "next";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OrderStatus from "@/components/OrderStatus";

export const metadata: Metadata = { title: "حالة الطلب" };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
          <OrderStatus orderId={id} />
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
