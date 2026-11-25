"use client";

import { Link } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites-context";

export default function FavoriteIcon() {
  const { ids } = useFavorites();

  return (
    <Link
      href="/favorites"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/5"
      aria-label="المفضلة"
    >
      <Heart className="h-5 w-5" aria-hidden />
      {ids.length > 0 && (
        <span className="absolute -top-0.5 -left-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-navy-900 px-1 text-[10px] font-bold text-white ring-2 ring-brand-500">
          {ids.length}
        </span>
      )}
    </Link>
  );
}
