import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PromoCard } from "@/lib/types";
import { linkHref } from "@/lib/types";

export default function PromoCards({ cards }: { cards: PromoCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="bg-white py-4">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={linkHref(card.link_type, card.link_value)}
            className="group relative flex h-40 items-center overflow-hidden rounded-2xl bg-navy-900 p-6 shadow-sm"
          >
            {card.image_url && (
              <Image
                src={card.image_url}
                alt=""
                fill
                className="object-cover opacity-70 transition group-hover:scale-105 group-hover:opacity-80"
              />
            )}
            <div className="relative z-10 text-white">
              {card.title_ar && <h3 className="text-xl font-extrabold">{card.title_ar}</h3>}
              {card.subtitle_ar && <p className="mt-1 text-sm text-white/85">{card.subtitle_ar}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
