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
    <div className="mx-auto w-full max-w-7xl px-0 pt-0 sm:px-6 sm:pt-5 lg:px-8">
      <div className="relative aspect-[3.25/1] w-full overflow-hidden rounded-none bg-brand-100 shadow-xs sm:aspect-[3.5/1] sm:rounded-2xl sm:shadow-[0_8px_30px_-8px_rgba(26,39,66,0.25)] lg:aspect-[4/1]">
        {banners.map((b, i) => (
          <Link
            key={b.id}
            href={linkHref(b.link_type, b.link_value)}
            tabIndex={i === active ? 0 : -1}
            aria-hidden={i !== active}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
          >
            {b.image_url && (
              <Image
                src={b.image_url}
                alt=""
                fill
                sizes="(min-width: 1280px) 1232px, 100vw"
                priority={i === 0}
                className="object-cover object-center"
              />
            )}
          </Link>
        ))}

        {banners.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center sm:bottom-3.5">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-navy-900/25 px-2.5 py-1 backdrop-blur-xs">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/60 hover:bg-white/85"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}