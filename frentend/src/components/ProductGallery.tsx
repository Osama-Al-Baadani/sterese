"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, PackageX, X, ZoomIn, ZoomOut } from "lucide-react";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const current = images[active];
  const count = images.length;

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setZoomed(false);
      } else if (e.key === "ArrowRight" && count > 1) {
        setActive((i) => (i + 1) % count);
        setZoomed(false);
      } else if (e.key === "ArrowLeft" && count > 1) {
        setActive((i) => (i - 1 + count) % count);
        setZoomed(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, count]);

  return (
    <>
      {/* dir="ltr" ensures the vertical thumbnail column always stays on the right side */}
      <div dir="ltr" className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
        {/* Main Image — all gallery slides stay mounted & eagerly preloaded so flipping is 0ms */}
        <div
          className="group relative flex-1 aspect-square overflow-hidden rounded-2xl border border-navy-900/8 bg-white shadow-xs"
          onTouchStart={(e) => {
            if (count > 1) touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (count <= 1 || touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > 40) {
              setActive((i) => (delta < 0 ? (i + 1) % count : (i - 1 + count) % count));
            }
          }}
        >
          {count > 0 ? (
            images.map((img, i) => {
              const isActive = i === active;
              return (
                <Image
                  key={`${img.src}-${i}`}
                  src={img.src}
                  alt={isActive ? name : ""}
                  fill
                  priority={i === 0}
                  loading={i === 0 ? undefined : "eager"}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className={`cursor-zoom-in object-cover transition-all duration-200 group-hover:scale-[1.03] ${
                    isActive ? "z-[1] opacity-100" : "pointer-events-none z-0 opacity-0"
                  }`}
                  onClick={() => setLightboxOpen(true)}
                />
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center text-navy-300">
              <PackageX className="h-16 w-16" aria-hidden />
            </div>
          )}

          {bundle && (
            <span className="absolute top-3 left-3 z-10 rounded-lg bg-gradient-to-l from-emerald-600 to-emerald-500 px-2.5 py-1 text-sm font-extrabold text-white shadow-lg">
              {bundle}
            </span>
          )}

          {/* Stylish Zoom Button */}
          {current && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Zoom image"
              className="absolute bottom-3 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-navy-900/10 bg-white/90 text-navy-900 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-brand-500 hover:text-white"
            >
              <ZoomIn className="h-5 w-5" aria-hidden />
            </button>
          )}

          {/* Prev / Next arrows on main image */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActive((i) => (i - 1 + count) % count)}
                aria-label="Previous image"
                className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy-900 shadow-md backdrop-blur-xs transition hover:scale-110 hover:bg-brand-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setActive((i) => (i + 1) % count)}
                aria-label="Next image"
                className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy-900 shadow-md backdrop-blur-xs transition hover:scale-110 hover:bg-brand-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>

        {/* Vertical Thumbnails Column on the Right Side */}
        {count > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 sm:max-h-[460px] sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pb-0">
            {images.map((img, i) => (
              <button
                key={`${img.src}-${i}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 sm:h-20 sm:w-20 ${
                  i === active
                    ? "border-brand-600 shadow-md shadow-brand-600/20 ring-2 ring-brand-500/20"
                    : "border-navy-900/10 opacity-70 hover:border-brand-500/50 hover:opacity-100"
                }`}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      {lightboxOpen && current && (
        <div
          dir="ltr"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-900/92 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setLightboxOpen(false);
            setZoomed(false);
          }}
        >
          {/* Top controls */}
          <div
            className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              {active + 1} / {count}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? "Zoom out" : "Zoom in"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-brand-500"
              >
                {zoomed ? <ZoomOut className="h-5 w-5" aria-hidden /> : <ZoomIn className="h-5 w-5" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxOpen(false);
                  setZoomed(false);
                }}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-rose-600"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          {/* Lightbox Image — stacked so switching inside Lightbox is also instant */}
          <div
            className="relative flex h-[78vh] w-full max-w-4xl items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={() => setZoomed((z) => !z)}
              className={`relative h-full w-full transition-transform duration-300 ${
                zoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
              }`}
            >
              {images.map((img, i) => {
                const isActive = i === active;
                return (
                  <Image
                    key={`lb-main-${img.src}-${i}`}
                    src={img.src}
                    alt={isActive ? name : ""}
                    fill
                    loading="eager"
                    sizes="100vw"
                    className={`object-contain transition-opacity duration-150 ${
                      isActive ? "z-[1] opacity-100" : "pointer-events-none z-0 opacity-0"
                    }`}
                  />
                );
              })}
            </div>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActive((i) => (i - 1 + count) % count);
                    setZoomed(false);
                  }}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-brand-500"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActive((i) => (i + 1) % count);
                    setZoomed(false);
                  }}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-brand-500"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}
          </div>

          {/* Bottom thumbnails in Lightbox */}
          {count > 1 && (
            <div
              className="mt-4 flex max-w-full gap-2 overflow-x-auto px-2 pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={`lb-${img.src}-${i}`}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setZoomed(false);
                  }}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === active ? "border-brand-500 opacity-100" : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image src={img.src} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
