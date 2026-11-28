"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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

export interface CartActions {
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (
    product: Product,
    quantity?: number,
    variation?: { id: number; label: string; price?: string; image?: string | null },
  ) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number, variationId?: number | null) => void;
  clear: () => void;
  refresh: () => Promise<void>;
  removeUnavailable: () => void;
  dismissChanges: () => void;
}

interface CartContextValue extends CartActions {
  items: CartItem[];
  count: number;
  /** Subtotal of purchasable lines only — unavailable items never count. */
  subtotal: number;
  hydrated: boolean;
  storeSettings: StoreSettings;
  drawerOpen: boolean;
  maxQtyFor: (product: Product) => number;
  /** True while the cart is being re-validated against the server. */
  syncing: boolean;
  /** Per-product changes found by the last sync (price moved, sold out...). */
  changes: Record<number, CartChange>;
  /** Cart lines that can no longer be bought (deleted or out of stock). */
  unavailableIds: number[];
}

interface CartStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CartContextValue;
  getServerSnapshot: () => CartContextValue;
  getProductQty: (productId: number) => number;
  getVariationQty: (productId: number, variationId: number | null) => number;
  getCount: () => number;
  getDrawerOpen: () => boolean;
  getHydrated: () => boolean;
  maxQtyFor: (product: Product) => number;
  actions: CartActions;
  hydrate: () => void;
}

const STORAGE_KEY = "storeseco_cart_v1";
const EMPTY_ITEMS: CartItem[] = [];
const EMPTY_UNAVAILABLE: number[] = [];
const EMPTY_CHANGES: Record<number, CartChange> = {};
const EMPTY_LIMITS: Record<string, number> = {};

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

function createCartStore(): CartStore {
  let items: CartItem[] = EMPTY_ITEMS;
  let hydrated = false;
  let storeSettings: StoreSettings = DEFAULT_STORE_SETTINGS;
  let productQtyLimits: Record<string, number> = EMPTY_LIMITS;
  let syncing = false;
  let changes: Record<number, CartChange> = EMPTY_CHANGES;
  let missingIds: number[] = EMPTY_UNAVAILABLE;
  let drawerOpen = false;
  let count = 0;

  const listeners = new Set<() => void>();

  const persist = () => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — cart just won't persist across reloads
    }
  };

  const maxQtyFor = (product: Product) =>
    effectiveMaxQty(product, storeSettings, productQtyLimits);

  const actions: CartActions = {
    openDrawer() {
      if (drawerOpen) return;
      drawerOpen = true;
      rebuildSnapshot();
      emit();
    },
    closeDrawer() {
      if (!drawerOpen) return;
      drawerOpen = false;
      rebuildSnapshot();
      emit();
    },
    addItem(product, quantity = 1, variation) {
      const effectiveProduct: Product = variation
        ? {
            ...product,
            price: variation.price ?? product.price,
            images: variation.image ? [{ src: variation.image }, ...product.images] : product.images,
          }
        : product;

      const max = effectiveMaxQty(effectiveProduct, storeSettings, productQtyLimits);
      const existing = items.find(
        (i) => i.product.id === product.id && (i.variationId ?? null) === (variation?.id ?? null),
      );
      if (existing) {
        items = items.map((i) =>
          i.product.id === product.id && (i.variationId ?? null) === (variation?.id ?? null)
            ? { ...i, quantity: Math.min(i.quantity + quantity, max) }
            : i,
        );
      } else {
        items = [
          ...items,
          {
            product: effectiveProduct,
            quantity: Math.min(quantity, max),
            variationId: variation?.id,
            variationLabel: variation?.label,
          },
        ];
      }
      persist();
      rebuildSnapshot();
      emit();
    },
    removeItem(productId) {
      items = items.filter((i) => i.product.id !== productId);
      persist();
      rebuildSnapshot();
      emit();
    },
    setQuantity(productId, quantity, variationId) {
      const matches = (i: CartItem) =>
        variationId === undefined
          ? i.product.id === productId
          : i.product.id === productId && (i.variationId ?? null) === variationId;

      if (quantity <= 0) {
        items = items.filter((i) => !matches(i));
      } else {
        items = items.map((i) =>
          matches(i)
            ? {
                ...i,
                quantity: Math.min(
                  quantity,
                  effectiveMaxQty(i.product, storeSettings, productQtyLimits),
                ),
              }
            : i,
        );
      }
      persist();
      rebuildSnapshot();
      emit();
    },
    clear() {
      items = EMPTY_ITEMS;
      changes = EMPTY_CHANGES;
      missingIds = EMPTY_UNAVAILABLE;
      persist();
      rebuildSnapshot();
      emit();
    },
    async refresh() {
      if (items.length === 0) return;
      const ids = items.map((i) => i.product.id).slice(0, 100);
      syncing = true;
      rebuildSnapshot();
      emit();
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
          if (item.quantity > effectiveMaxQty(live, storeSettings, productQtyLimits)) {
            change.quantityAdjusted = true;
          }
          if (Object.keys(change).length > 0) nextChanges[live.id] = change;
        }

        items = items.map((i) => {
          const live = byId.get(i.product.id);
          if (!live) return i;
          return {
            ...i,
            product: live,
            quantity: Math.min(i.quantity, effectiveMaxQty(live, storeSettings, productQtyLimits)),
          };
        });
        missingIds = missing;
        changes = nextChanges;
        persist();
      } catch {
        // offline / transient error — keep showing the saved snapshot
      } finally {
        syncing = false;
        rebuildSnapshot();
        emit();
      }
    },
    removeUnavailable() {
      items = items.filter(
        (i) => !(missingIds.includes(i.product.id) || i.product.stock_status === "outofstock"),
      );
      missingIds = EMPTY_UNAVAILABLE;
      const next = { ...changes };
      for (const [id, c] of Object.entries(changes)) {
        if (c.unavailable) delete next[Number(id)];
      }
      changes = next;
      persist();
      rebuildSnapshot();
      emit();
    },
    dismissChanges() {
      changes = EMPTY_CHANGES;
      rebuildSnapshot();
      emit();
    },
  };

  const buildValue = (): CartContextValue => {
    const unavailableIds = items
      .filter((i) => missingIds.includes(i.product.id) || i.product.stock_status === "outofstock")
      .map((i) => i.product.id);
    count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items
      .filter((i) => !unavailableIds.includes(i.product.id))
      .reduce((s, i) => s + unitPrice(i.product) * i.quantity, 0);

    return {
      items,
      count,
      subtotal,
      hydrated,
      storeSettings,
      drawerOpen,
      maxQtyFor,
      syncing,
      changes,
      unavailableIds: unavailableIds.length === 0 ? EMPTY_UNAVAILABLE : unavailableIds,
      ...actions,
    };
  };

  const serverSnapshot = buildValue();
  let snapshot: CartContextValue = serverSnapshot;

  function rebuildSnapshot() {
    snapshot = buildValue();
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  const hydrate = () => {
    if (hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) items = parsed as CartItem[];
      }
    } catch {
      // corrupted/blocked storage — start from an empty cart
    }
    hydrated = true;
    rebuildSnapshot();
    emit();

    fetch("/api/app-config")
      .then((r) => r.json())
      .then((data) => {
        let updated = false;
        if (data.storeSettings) {
          storeSettings = data.storeSettings;
          updated = true;
        }
        if (data.productQtyLimits) {
          productQtyLimits = data.productQtyLimits;
          updated = true;
        }
        if (updated) {
          rebuildSnapshot();
          emit();
        }
      })
      .catch(() => {
        // stays at the permissive defaults — better than blocking the cart
      });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    getProductQty: (productId) => items.find((i) => i.product.id === productId)?.quantity ?? 0,
    getVariationQty: (productId, variationId) =>
      items.find(
        (i) => i.product.id === productId && (i.variationId ?? null) === (variationId ?? null),
      )?.quantity ?? 0,
    getCount: () => count,
    getDrawerOpen: () => drawerOpen,
    getHydrated: () => hydrated,
    maxQtyFor,
    actions,
    hydrate,
  };
}

const CartStoreContext = createContext<CartStore | null>(null);

function useCartStore(): CartStore {
  const store = useContext(CartStoreContext);
  if (!store) throw new Error("useCart must be used within a CartProvider");
  return store;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createCartStore);

  // Loaded one tick after mount so the first client render matches SSR.
  useEffect(() => {
    store.hydrate();
  }, [store]);

  return <CartStoreContext.Provider value={store}>{children}</CartStoreContext.Provider>;
}

/** Selective hook for product cards — only re-renders when THIS product's quantity changes. */
export function useCartProductQty(productId: number, variationId?: number | null): number {
  const store = useCartStore();
  return useSyncExternalStore(
    store.subscribe,
    () =>
      variationId === undefined
        ? store.getProductQty(productId)
        : store.getVariationQty(productId, variationId),
    () => 0,
  );
}

/** Selective hook for max quantity of a product — only re-renders if store qty limits change. */
export function useCartMaxQty(product: Product): number {
  const store = useCartStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.maxQtyFor(product),
    () => effectiveMaxQty(product, DEFAULT_STORE_SETTINGS, EMPTY_LIMITS),
  );
}

/** Stable cart action callbacks — never causes a re-render when cart state changes. */
export function useCartActions(): CartActions {
  return useCartStore().actions;
}

/** Selective hook for header/bottom-nav cart badges — only re-renders when total item count changes. */
export function useCartCount(): number {
  const store = useCartStore();
  return useSyncExternalStore(store.subscribe, store.getCount, () => 0);
}

/** Selective hook for drawer visibility — only re-renders when the cart drawer opens or closes. */
export function useCartDrawerOpen(): boolean {
  const store = useCartStore();
  return useSyncExternalStore(store.subscribe, store.getDrawerOpen, () => false);
}

export function useCart(): CartContextValue {
  const store = useCartStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/** Re-validates the cart against live prices/stock once per mount — call it
 * from the cart and checkout screens (the two places a stale snapshot hurts). */
export function useCartSync() {
  const store = useCartStore();
  const hydrated = useSyncExternalStore(store.subscribe, store.getHydrated, () => false);
  const done = useRef(false);

  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    void store.actions.refresh();
  }, [hydrated, store]);
}
