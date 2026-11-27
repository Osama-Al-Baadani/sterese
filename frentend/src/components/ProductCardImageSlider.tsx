"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, PackageX } from "lucide-react";
import type { ProductImage } from "@/lib/types";

export default function ProductCardImageSlider({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  // Preload secondary slides as soon as the user hovers or touches the card
  const [warmed, setWarmed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const primary = images[0]?.src;

  if (!primary) {
    return (
      <div className="flex h-full items-center justify-center text-navy-300">
        <PackageX className="h-10 w-10" aria-hidden />
      </div>
    );
  }

  function prev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWarmed(true);
    setIndex((i) => (i - 1 + count) % count);
  }

  function next(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWarmed(true);
    setIndex((i) => (i + 1) % count);
  }

  const renderedImages = warmed || index > 0 ? images : images.slice(0, 1);

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => {
        if (count > 1 && !warmed) setWarmed(true);
      }}
      onTouchStart={(e) => {
        if (count > 1) {
          if (!warmed) setWarmed(true);
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }
      }}
      onTouchEnd={(e) => {
        if (count <= 1 || touchStartX.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) > 35) {
          e.preventDefault();
          e.stopPropagation();
          setIndex((i) => (delta < 0 ? (i + 1) % count : (i - 1 + count) % count));
        }
      }}
    >
      {renderedImages.map((img, i) => {
        if (!img?.src) return null;
        const isActive = i === index;
        return (
          <Image
            key={`${img.src}-${i}`}
            src={img.src}
            alt={isActive ? name : ""}
            fill
            loading={i === 0 ? undefined : "eager"}
            sizes="(min-width: 1024px) 20vw, 45vw"
            className={`object-contain p-3 transition-all duration-200 group-hover:scale-105 ${
              isActive ? "z-[1] opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          />
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="absolute top-1/2 start-1.5 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md backdrop-blur-xs transition-all hover:scale-110 hover:bg-brand-500 hover:text-white md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
          </button>

          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="absolute top-1/2 end-1.5 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md backdrop-blur-xs transition-all hover:scale-110 hover:bg-brand-500 hover:text-white md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
          </button>

          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1">
            {images.slice(0, 6).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Image ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWarmed(true);
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-brand-600 shadow-xs" : "w-1.5 bg-navy-900/20 hover:bg-navy-900/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
