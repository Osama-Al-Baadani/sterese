declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Pushes a Google Tag Manager dataLayer event — the one integration point
 * between our own app events (checkout started, order placed) and whatever
 * marketing tags (TikTok, Facebook, Google Ads...) are wired up in GTM.
 * Adding, removing, or re-mapping which ad platforms react to these events
 * never needs a code change here — just a trigger+tag inside GTM's own
 * dashboard, same as every other pixel from here on. */
export function trackEvent(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}
