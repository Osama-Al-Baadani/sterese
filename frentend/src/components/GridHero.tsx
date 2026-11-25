import type { Banner, PromoCard } from "@/lib/types";
import Hero from "./Hero";
import PromoCards from "./PromoCards";
import GridTiles from "./GridTiles";

/**
 * Mosaic hero: left side rotates through "grid_stack" banners (2 slots),
 * right side rotates through "grid_tile" banners (3 slots). Only takes
 * over once at least one grid_tile banner exists — until then this renders
 * the exact same Hero + PromoCards pair as before, so a store that hasn't
 * touched this feature sees no visual change.
 */
export default function GridHero({
  webCarouselBanners,
  promoCards,
  gridStackBanners,
  gridTileBanners,
}: {
  webCarouselBanners: Banner[];
  promoCards: PromoCard[];
  gridStackBanners: Banner[];
  gridTileBanners: Banner[];
}) {
  if (gridTileBanners.length === 0) {
    return (
      <>
        <Hero banners={webCarouselBanners} />
        <PromoCards cards={promoCards} />
      </>
    );
  }

  return (
    <section className="bg-white pt-4 pb-6 sm:pt-6 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:h-[420px] sm:grid-cols-4 sm:gap-4 lg:h-[460px]">
          {gridStackBanners.length > 0 && (
            <GridTiles
              banners={gridStackBanners}
              visibleSlots={2}
              // Hidden on mobile — two small stacked tiles read as clutter
              // on a narrow screen, so only the rotating 3-tile group shows
              // there; both groups appear side by side from sm: up.
              className="hidden gap-4 sm:col-span-1 sm:grid sm:grid-rows-2"
            />
          )}

          <GridTiles
            banners={gridTileBanners}
            visibleSlots={3}
            manualControls
            className={gridStackBanners.length > 0 ? "sm:col-span-3" : "sm:col-span-4"}
          />
        </div>
      </div>
    </section>
  );
}
