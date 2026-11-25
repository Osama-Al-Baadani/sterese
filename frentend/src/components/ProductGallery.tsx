"use client";

import Image from "next/image";
import { useState } from "react";
import { PackageX } from "lucide-react";
import type { ProductImage } from "@/lib/types";

export default function ProductGallery({
  images,
  name,
  bundle,
}: {
  images: ProductImage[];
  name: string;
  bundle?: string | null;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-navy-900/[0.03]">
        {current ? (
          <Image src={current.src} alt={name} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" priority />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-300">
            <PackageX className="h-16 w-16" aria-hidden />
          </div>
        )}
        {bundle && (
          <span className="absolute top-3 right-3 rounded-lg bg-gradient-to-l from-emerald-600 to-emerald-500 px-2.5 py-1 text-sm font-extrabold text-white shadow-lg">
            {bundle}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
