"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { effectiveMaxQty } from "./cart-limits";
import type { Product, StoreSettings } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  maxQtyFor: (product: Product) => number;
  clear: () => void;
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

  const maxQtyFor = (product: Product) => effectiveMaxQty(product, storeSettings, productQtyLimits);

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const max = effectiveMaxQty(product, storeSettings, productQtyLimits);
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, max) }
            : i,
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, max) }];
    });
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const setQuantity = (productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(quantity, effectiveMaxQty(i.product, storeSettings, productQtyLimits)) }
          : i,
      );
    });
  };

  const clear = () => setItems([]);

  const { count, subtotal } = useMemo(
    () => ({
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + unitPrice(i.product) * i.quantity, 0),
    }),
    [items],
  );

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, removeItem, setQuantity, maxQtyFor, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
