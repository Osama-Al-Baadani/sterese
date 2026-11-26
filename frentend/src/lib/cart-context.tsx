"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { effectiveMaxQty } from "./cart-limits";
import type { Product, StoreSettings } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
  variationId?: number;
  variationLabel?: string;
}

/** What changed for one cart line after the last price/stock sync. */
export interface CartChange {
  oldPrice?: string;
  newPrice?: string;
  unavailable?: boolean;
  quantityAdjusted?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  /** Subtotal of purchasable lines only — unavailable items never count. */
  subtotal: number;
  hydrated: boolean;
  storeSettings: StoreSettings;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: Product, quantity?: number, variation?: { id: number; label: string; price?: string; image?: string | null }) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  maxQtyFor: (product: Product) => number;
  clear: () => void;
  /** True while the cart is being re-validated against the server. */
  syncing: boolean;
  /** Per-product changes found by the last sync (price moved, sold out...). */
  changes: Record<number, CartChange>;
  /** Cart lines that can no longer be bought (deleted or out of stock). */
  unavailableIds: number[];
  /** Re-fetches live price & stock for every cart line. */
  refresh: () => Promise<void>;
  removeUnavailable: () => void;
  dismissChanges: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "storeseco_cart_v1";

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  delivery_fee: 0,
  free_shipping_threshold: 0,
  min_order_value: 0,
  whatsapp_phone: "",
  support_phone: "",
  support_email: "",
  working_hours_weekday: "",
  working_hours_friday: "",
  announcement_active: false,
  announcement_text: "",
  badges: [],
  free_delivery_near_branch: {
    enabled: false,
    branch_lat: 24.598,
    branch_lng: 46.639308,
    radius_km: 5,
    fee: 0,
    free_threshold: null,
  },
  cod: { enabled: false, fee_enabled: false, fee_amount: 0 },
  default_max_qty: 10,
};

function unitPrice(product: Product): number {
  return Number(product.price) || 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [productQtyLimits, setProductQtyLimits] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const [changes, setChanges] = useState<Record<number, CartChange>>({});
  const [missingIds, setMissingIds] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Deliberately loaded in an effect, one tick after mount, rather than in
  // a lazy useState initializer: reading localStorage during the initial
  // render would make that render's output diverge from what the server
  // sent (which always renders an empty cart, having no access to this
  // browser's storage), producing a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted/blocked storage — start from an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — cart just won't persist across reloads
    }
  }, [items, hydrated]);

  // Quantity limits (global default + per-product) so repeated "add to
  // cart" taps and the cart page's own +/- steppers can't build up past
  // what the admin panel actually allows — server-rendered pages already
  // get this via getAppConfig(), but this client-only context needs its
  // own fetch.
  useEffect(() => {
    fetch("/api/app-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.storeSettings) setStoreSettings(data.storeSettings);
        if (data.productQtyLimits) setProductQtyLimits(data.productQtyLimits);
      })
      .catch(() => {
        // stays at the permissive defaults — better than blocking the cart
      });
  }, []);

  const maxQtyFor = useCallback(
    (product: Product) => effectiveMaxQty(product, storeSettings, productQtyLimits),
    [storeSettings, productQtyLimits],
  );

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      variation?: { id: number; label: string; price?: string; image?: string | null },
    ) => {
      const effectiveProduct: Product = variation
        ? {
            ...product,
            price: variation.price ?? product.price,
            images: variation.image ? [{ src: variation.image }, ...product.images] : product.images,
          }
        : product;

      setItems((prev) => {
        const max = effectiveMaxQty(effectiveProduct, storeSettings, productQtyLimits);
        const existing = prev.find(
          (i) => i.product.id === product.id && (i.variationId ?? null) === (variation?.id ?? null),
        );
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id && (i.variationId ?? null) === (variation?.id ?? null)
              ? { ...i, quantity: Math.min(i.quantity + quantity, max) }
              : i,
          );
        }
        return [
          ...prev,
          {
            product: effectiveProduct,
            quantity: Math.min(quantity, max),
            variationId: variation?.id,
            variationLabel: variation?.label,
          },
        ];
      });
    },
    [storeSettings, productQtyLimits],
  );

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const setQuantity = useCallback(
    (productId: number, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) return prev.filter((i) => i.product.id !== productId);
        return prev.map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.min(quantity, effectiveMaxQty(i.product, storeSettings, productQtyLimits)) }
            : i,
        );
      });
    },
    [storeSettings, productQtyLimits],
  );

  const clear = useCallback(() => {
    setItems([]);
    setChanges({});
    setMissingIds([]);
  }, []);

  /** Lines that can't be purchased anymore: deleted/unpublished on the
   * server (missing from the last sync) or flagged out of stock. */
  const unavailableIds = useMemo(
    () =>
      items
        .filter((i) => missingIds.includes(i.product.id) || i.product.stock_status === "outofstock")
        .map((i) => i.product.id),
    [items, missingIds],
  );

  /**
   * localStorage keeps a *snapshot* of each product from the moment it was
   * added, so a cart opened days later could show (and charge) an old price
   * or include something that has since sold out. This re-reads the live
   * product data and reconciles the cart with it, recording what changed so
   * the UI can tell the customer instead of silently altering their order.
   */
  const refresh = useCallback(async () => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.product.id).slice(0, 100);
    setSyncing(true);
    try {
      const res = await fetch(`/api/products?ids=${ids.join(",")}&fresh=1`, { cache: "no-store" });
      if (!res.ok) return;
      const fresh: unknown = await res.json();
      if (!Array.isArray(fresh) || fresh.length === 0) return;

      const byId = new Map<number, Product>((fresh as Product[]).map((p) => [p.id, p]));
      const nextChanges: Record<number, CartChange> = {};
      const missing: number[] = [];

      for (const item of items) {
        const live = byId.get(item.product.id);
        if (!live) {
          missing.push(item.product.id);
          nextChanges[item.product.id] = { unavailable: true };
          continue;
        }
        const change: CartChange = {};
        if (Number(live.price) !== Number(item.product.price)) {
          change.oldPrice = item.product.price;
          change.newPrice = live.price;
        }
        if (live.stock_status === "outofstock") change.unavailable = true;
        if (item.quantity > effectiveMaxQty(live, storeSettings, productQtyLimits)) change.quantityAdjusted = true;
        if (Object.keys(change).length > 0) nextChanges[live.id] = change;
      }

      setItems((prev) =>
        prev.map((i) => {
          const live = byId.get(i.product.id);
          if (!live) return i;
          return { product: live, quantity: Math.min(i.quantity, effectiveMaxQty(live, storeSettings, productQtyLimits)) };
        }),
      );
      setMissingIds(missing);
      setChanges(nextChanges);
    } catch {
      // offline / transient error — keep showing the saved snapshot
    } finally {
      setSyncing(false);
    }
  }, [items, storeSettings, productQtyLimits]);

  const removeUnavailable = useCallback(() => {
    setItems((prev) => prev.filter((i) => !(missingIds.includes(i.product.id) || i.product.stock_status === "outofstock")));
    setMissingIds([]);
    setChanges((prev) => {
      const next = { ...prev };
      for (const [id, c] of Object.entries(prev)) {
        if (c.unavailable) delete next[Number(id)];
      }
      return next;
    });
  }, [missingIds]);

  const dismissChanges = useCallback(() => setChanges({}), []);

  const { count, subtotal } = useMemo(
    () => ({
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items
        .filter((i) => !unavailableIds.includes(i.product.id))
        .reduce((s, i) => s + unitPrice(i.product) * i.quantity, 0),
    }),
    [items, unavailableIds],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      hydrated,
      storeSettings,
      drawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      removeItem,
      setQuantity,
      maxQtyFor,
      clear,
      syncing,
      changes,
      unavailableIds,
      refresh,
      removeUnavailable,
      dismissChanges,
    }),
    [
      items,
      count,
      subtotal,
      hydrated,
      storeSettings,
      drawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      removeItem,
      setQuantity,
      maxQtyFor,
      clear,
      syncing,
      changes,
      unavailableIds,
      refresh,
      removeUnavailable,
      dismissChanges,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

/** Re-validates the cart against live prices/stock once per mount — call it
 * from the cart and checkout screens (the two places a stale snapshot hurts). */
export function useCartSync() {
  const { hydrated, refresh } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    void refresh();
  }, [hydrated, refresh]);
}
