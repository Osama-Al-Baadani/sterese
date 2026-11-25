import type { Metadata } from "next";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FavoritesView from "@/components/FavoritesView";

export const metadata: Metadata = { title: "المفضلة" };

export default async function FavoritesPage() {
  const { storeSettings } = await getAppConfig();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-extrabold text-navy-900">المفضلة</h1>
          <FavoritesView />
        </div>
      </main>
      <Footer settings={storeSettings} />
    </>
  );
}
