import { Link } from "@/i18n/navigation";
import { ShoppingBasket } from "lucide-react";

export default function PromoBanner() {
  return (
    <section className="bg-gradient-to-b from-gold-400/15 to-white py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-8">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
          <ShoppingBasket className="h-10 w-10" aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
            أسعار أوفر لحياة أفضل
          </h2>
          <p className="mx-auto mt-3 max-w-md text-navy-500">
            جودة عالية، أسعار منافسة، وتوصيل سريع — كل هذا بانتظارك الآن
          </p>
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
        >
          ابدأ التسوق الآن ←
        </Link>
      </div>
    </section>
  );
}
