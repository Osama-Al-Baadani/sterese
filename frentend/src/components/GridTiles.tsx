"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Banner } from "@/lib/types";
import { linkHref } from "@/lib/types";

/**
 * `visibleSlots` tiles that rotate through however many banners the admin
 * uploads. Used for both the grid_tile (3 slots) and grid_stack (2 slots)
 * groups in GridHero.
 *
 * `manualControls` (grid_tile only) renders a real sliding filmstrip: all
 * `visibleSlots` tiles move together as one strip, shifting over by one
 * whole tile-width to reveal the next banner at the trailing edge — not
 * each tile independently swapping its own content in place. Hover-only
 * prev/next arrows step it manually, as does dragging with the mouse or
 * swiping with a finger; it also auto-advances every 5s regardless. grid_stack
 * keeps the simpler per-slot fade/slide-in it already had.
 */
export default function GridTiles({
  banners,
  visibleSlots,
  className = "",
  manualControls = false,
}: {
  banners: Banner[];
  visibleSlots: number;
  className?: string;
  manualControls?: boolean;
}) {
  if (manualControls) {
    return <Filmstrip banners={banners} visibleSlots={visibleSlots} className={className} />;
  }

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (banners.length <= visibleSlots) return;
    const id = setInterval(() => setOffset((o) => (o + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length, visibleSlots]);

  const slots = Array.from({ length: Math.min(visibleSlots, banners.length) }, (_, i) => banners[(offset + i) % banners.length]);

  return (
    <div className={className}>
      {slots.map((b, i) => (
        <Link
          key={`${b.id}-${i}`}
          href={linkHref(b.link_type, b.link_value)}
          className="relative block h-52 overflow-hidden rounded-2xl bg-navy-900/[0.03] sm:h-full"
        >
          {b.image_url && <Image src={b.image_url} alt="" fill className="tile-slide-in object-cover" />}
        </Link>
      ))}
    </div>
  );
}

const GAP_REM = 1; // matches the track's gap-4

function Filmstrip({ banners, visibleSlots, className }: { banners: Banner[]; visibleSlots: number; className: string }) {
  const n = banners.length;
  const canSlide = n > visibleSlots;

  const extended = canSlide ? [...banners.slice(-visibleSlots), ...banners, ...banners.slice(0, visibleSlots)] : banners;

  const [index, setIndex] = useState(canSlide ? visibleSlots : 0);
  const [animate, setAnimate] = useState(true);
  const [dragPx, setDragPx] = useState(0);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const dragStartX = useRef(0);

  useEffect(() => {
    setIndex(canSlide ? visibleSlots : 0);
    setAnimate(false);
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, visibleSlots]);

  const step = (dir: 1 | -1) => {
    if (!canSlide) return;
    setAnimate(true);
    setIndex((i) => i + dir);
  };

  useEffect(() => {
    if (!canSlide) return;
    const id = setInterval(() => {
      if (!isDragging.current) step(1);
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSlide) return;
    isDragging.current = true;
    wasDragged.current = false;
    dragStartX.current = e.clientX;
    setAnimate(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setDragPx(e.clientX - dragStartX.current);
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // Net displacement at release, not "ever moved mid-gesture" — a click
    // naturally wiggles a few px between press and release, and judging by
    // that alone was swallowing ordinary clicks (never reaching the link).
    wasDragged.current = Math.abs(dragPx) > 10;
    const containerWidth = trackRef.current?.parentElement?.offsetWidth ?? 0;
    const threshold = (containerWidth / visibleSlots) * 0.2;
    setAnimate(true);
    if (canSlide && Math.abs(dragPx) > threshold) {
      setIndex((i) => i + (dragPx < 0 ? 1 : -1));
    }
    setDragPx(0);
  };

  const handleClickCapture = (e: ReactMouseEvent) => {
    if (wasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDragged.current = false;
    }
  };

  // Seamless infinite loop: once the strip has slid past the real banners
  // into the cloned lead-in/lead-out tiles, snap back to the equivalent
  // real position with the transition off, one frame after it lands.
  useEffect(() => {
    if (!canSlide) return;
    if (index >= visibleSlots + n) {
      resetTimeout.current = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => i - n);
      }, 420);
    } else if (index < visibleSlots) {
      resetTimeout.current = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => i + n);
      }, 420);
    }
    return () => {
      if (resetTimeout.current) clearTimeout(resetTimeout.current);
    };
  }, [index, canSlide, n, visibleSlots]);

  useEffect(() => {
    if (!animate) {
      const raf = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [animate]);

  const itemWidth = `calc((100% - ${(visibleSlots - 1) * GAP_REM}rem) / ${visibleSlots})`;

  return (
    <div className={`group relative h-52 overflow-hidden sm:h-full ${className}`}>
      <div
        ref={trackRef}
        dir="ltr"
        className={`flex h-full touch-pan-y ${canSlide ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          gap: `${GAP_REM}rem`,
          transform: `translateX(calc(${-index} * (100% + ${GAP_REM}rem) / ${visibleSlots} + ${dragPx}px))`,
          transition: animate ? "transform 420ms ease-out" : "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
      >
        {extended.map((b, i) => (
          <Link
            key={i}
            href={linkHref(b.link_type, b.link_value)}
            className="relative block h-full shrink-0 overflow-hidden rounded-2xl bg-navy-900/[0.03]"
            style={{ width: itemWidth }}
          >
            {b.image_url && <Image src={b.image_url} alt="" fill className="object-cover" />}
          </Link>
        ))}
      </div>

      {canSlide && (
        <>
          <button
            type="button"
            aria-label="السابق"
            onClick={() => step(-1)}
            className="absolute inset-y-0 left-0 z-20 flex w-9 items-center justify-center bg-gradient-to-r from-black/35 to-transparent text-2xl text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="التالي"
            onClick={() => step(1)}
            className="absolute inset-y-0 right-0 z-20 flex w-9 items-center justify-center bg-gradient-to-l from-black/35 to-transparent text-2xl text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
