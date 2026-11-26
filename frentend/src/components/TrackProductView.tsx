"use client";

import { useEffect } from "react";
import { addRecentlyViewedId } from "@/lib/recently-viewed";

export default function TrackProductView({ productId }: { productId: number }) {
  useEffect(() => {
    addRecentlyViewedId(productId);
  }, [productId]);

  return null;
}
