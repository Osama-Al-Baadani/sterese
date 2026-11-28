"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface FavoritesContextValue {
  ids: number[];
  hydrated: boolean;
  isFavorite: (id: number) => boolean;
  toggle: (id: number) => void;
}

interface FavoritesSnapshot {
  ids: number[];
  hydrated: boolean;
}

interface FavoritesStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => FavoritesSnapshot;
  getServerSnapshot: () => FavoritesSnapshot;
  has: (id: number) => boolean;
  getCount: () => number;
  toggle: (id: number) => void;
  hydrate: () => void;
}

const STORAGE_KEY = "storeseco_favorites_v1";
const EMPTY_IDS: number[] = [];
const SERVER_SNAPSHOT: FavoritesSnapshot = { ids: EMPTY_IDS, hydrated: false };

function createFavoritesStore(): FavoritesStore {
  let ids: number[] = EMPTY_IDS;
  let idSet = new Set<number>();
  let hydrated = false;
  let snapshot: FavoritesSnapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const persist = () => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // storage full/blocked — favorites just won't persist across reloads
    }
  };

  const hydrate = () => {
    if (hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          ids = parsed.filter((x): x is number => typeof x === "number");
          idSet = new Set(ids);
        }
      }
    } catch {
      // corrupted/blocked storage — start from no favorites
    }
    hydrated = true;
    snapshot = { ids, hydrated };
    emit();
  };

  const toggle = (id: number) => {
    if (idSet.has(id)) {
      ids = ids.filter((x) => x !== id);
    } else {
      ids = [...ids, id];
    }
    idSet = new Set(ids);
    snapshot = { ids, hydrated };
    persist();
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    has: (id) => idSet.has(id),
    getCount: () => ids.length,
    toggle,
    hydrate,
  };
}

const FavoritesStoreContext = createContext<FavoritesStore | null>(null);

function useFavoritesStore(): FavoritesStore {
  const store = useContext(FavoritesStoreContext);
  if (!store) throw new Error("useFavorites must be used within a FavoritesProvider");
  return store;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createFavoritesStore);

  // Hydrated one tick after mount so the first client render matches SSR.
  useEffect(() => {
    store.hydrate();
  }, [store]);

  return (
    <FavoritesStoreContext.Provider value={store}>
      {children}
    </FavoritesStoreContext.Provider>
  );
}

/** Selective hook for a single product card — only re-renders when THIS product's favorite status flips. */
export function useFavoriteItem(productId: number): {
  active: boolean;
  toggle: (id: number) => void;
} {
  const store = useFavoritesStore();
  const active = useSyncExternalStore(
    store.subscribe,
    () => store.has(productId),
    () => false,
  );
  return { active, toggle: store.toggle };
}

/** Selective hook for header/bottom-nav badges — only re-renders when total favorite count changes. */
export function useFavoritesCount(): number {
  const store = useFavoritesStore();
  return useSyncExternalStore(store.subscribe, store.getCount, () => 0);
}

export function useFavorites(): FavoritesContextValue {
  const store = useFavoritesStore();
  const { ids, hydrated } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const isFavorite = useCallback((id: number) => store.has(id), [store]);

  return useMemo(
    () => ({ ids, hydrated, isFavorite, toggle: store.toggle }),
    [ids, hydrated, isFavorite, store.toggle],
  );
}
