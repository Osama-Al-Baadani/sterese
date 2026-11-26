const STORAGE_KEY = "storeseco_recently_viewed_v1";
const MAX_ITEMS = 12;

export function getRecentlyViewedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewedId(productId: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentlyViewedIds().filter((id) => id !== productId);
    const next = [productId, ...current].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}
