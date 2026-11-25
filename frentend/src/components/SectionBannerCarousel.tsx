"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import type { HomeSectionBanner } from "@/lib/types";

export default function SectionBannerCarousel({
  banners,
  title,
}: {
  banners: HomeSectionBanner[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-navy-900/[0.03]">
        {banners.map((b, i) => (
          <Link
            key={i}
            href={b.link || "/browse"}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
          >
            <Image src={b.image_url} alt={title} fill priority={i === 0} className="object-cover" />
          </Link>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`بانر ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-brand-600" : "w-1.5 bg-navy-900/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
