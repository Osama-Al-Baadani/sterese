"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites-context";
import { useToast } from "@/lib/toast-context";

export default function FavoriteButton({
  productId,
  size = "default",
}: {
  productId: number;
  size?: "default" | "sm";
}) {
  const tCommon = useTranslations("common");
  const { isFavorite, toggle } = useFavorites();
  const { showToast } = useToast();
  const active = isFavorite(productId);
  const dim = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(productId);
        showToast(active ? tCommon("removedFavoriteToast") : tCommon("addedFavoriteToast"), active ? "info" : "success");
      }}
      aria-pressed={active}
      aria-label={active ? tCommon("removeFavorite") : tCommon("addFavorite")}
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full border transition ${
        active
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-navy-900/10 bg-white text-navy-400 hover:text-rose-500"
      }`}
    >
      <Heart className={iconDim} fill={active ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
