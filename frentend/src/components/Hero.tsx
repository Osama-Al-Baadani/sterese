"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/types";
import { linkHref } from "@/lib/types";

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="relative aspect-[2.5/1] w-full overflow-hidden rounded-2xl bg-brand-100 shadow-[0_8px_30px_-8px_rgba(26,39,66,0.25)] sm:aspect-[3/1] lg:aspect-[4/1]">
        {banners.map((b, i) => (
          <Link
            key={b.id}
            href={linkHref(b.link_type, b.link_value)}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
          >
            {b.image_url && (
              <Image src={b.image_url} alt="" fill priority={i === 0} className="object-cover" />
            )}
          </Link>
        ))}

        {banners.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:bottom-4">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`بانر ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full shadow-sm transition-all ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/55"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}