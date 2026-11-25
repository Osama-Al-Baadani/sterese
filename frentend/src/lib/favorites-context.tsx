"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface FavoritesContextValue {
  ids: number[];
  hydrated: boolean;
  isFavorite: (id: number) => boolean;
  toggle: (id: number) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const STORAGE_KEY = "storeseco_favorites_v1";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Same hydration-safe pattern as CartProvider — loaded one tick after
  // mount so this render's output doesn't diverge from the server's.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // corrupted/blocked storage — start from no favorites
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // storage full/blocked — favorites just won't persist across reloads
    }
  }, [ids, hydrated]);

  const toggle = (id: number) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <FavoritesContext.Provider value={{ ids, hydrated, isFavorite: (id) => ids.includes(id), toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
