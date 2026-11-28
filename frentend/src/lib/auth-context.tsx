"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface AuthContextValue {
  customer: Customer | null;
  authToken: string | null;
  isLoggedIn: boolean;
  hydrated: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ isNew: boolean }>;
  setProfileName: (firstName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CUSTOMER_KEY = "storeseco_customer_v1";
const TOKEN_KEY = "storeseco_auth_token_v1";

interface RawCustomer {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  billing?: { phone?: string };
  auth_token?: string;
}

function toCustomer(raw: RawCustomer, fallbackPhone: string): Customer {
  return {
    id: raw.id,
    firstName: raw.first_name ?? "",
    lastName: raw.last_name ?? "",
    phone: raw.billing?.phone || fallbackPhone,
    email: raw.email ?? "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Same hydration-safe pattern as CartProvider — loaded in an effect, not
  // a lazy initializer, so the server-rendered (logged-out) markup always
  // matches the first client render.
  useEffect(() => {
    try {
      const rawCustomer = localStorage.getItem(CUSTOMER_KEY);
      const rawToken = localStorage.getItem(TOKEN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (rawCustomer) setCustomer(JSON.parse(rawCustomer));
      if (rawToken) setAuthToken(rawToken);
    } catch {
      // corrupted/blocked storage — start logged out
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((nextCustomer: Customer, nextToken: string) => {
    setCustomer(nextCustomer);
    setAuthToken(nextToken);
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(nextCustomer));
      localStorage.setItem(TOKEN_KEY, nextToken);
    } catch {
      // storage full/blocked — session just won't persist across reloads
    }
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "تعذّر إرسال رمز التحقق");
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "رمز التحقق غير صحيح");
      persist(toCustomer(data, phone), data.auth_token);
      return { isNew: data.is_new === true };
    },
    [persist],
  );

  const setProfileName = useCallback(
    async (firstName: string) => {
      if (!customer || !authToken) return;
      const res = await fetch(`/api/account/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ customer_id: customer.id, first_name: firstName }),
      });
      if (!res.ok) return;
      const data = await res.json();
      persist(toCustomer(data, customer.phone), authToken);
    },
    [customer, authToken, persist],
  );

  const logout = useCallback(() => {
    setCustomer(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(CUSTOMER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      customer,
      authToken,
      isLoggedIn: !!customer,
      hydrated,
      sendOtp,
      verifyOtp,
      setProfileName,
      logout,
    }),
    [customer, authToken, hydrated, sendOtp, verifyOtp, setProfileName, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
