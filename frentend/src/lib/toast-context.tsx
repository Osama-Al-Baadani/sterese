"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "info" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

interface ToastStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ToastItem[];
  getServerSnapshot: () => ToastItem[];
  dismiss: (id: number) => void;
  ctxValue: ToastContextValue;
}

const EMPTY_TOASTS: ToastItem[] = [];

function createToastStore(): ToastStore {
  let toasts: ToastItem[] = EMPTY_TOASTS;
  let nextId = 1;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const dismiss = (id: number) => {
    const next = toasts.filter((t) => t.id !== id);
    if (next.length === toasts.length) return;
    toasts = next.length === 0 ? EMPTY_TOASTS : next;
    emit();
  };

  const showToast = (message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    toasts = [...toasts.slice(-3), { id, message, variant }];
    emit();
    setTimeout(() => {
      dismiss(id);
    }, 2800);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => toasts,
    getServerSnapshot: () => EMPTY_TOASTS,
    dismiss,
    ctxValue: { showToast },
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastViewport({ store }: { store: ToastStore }) {
  const toasts = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-20 end-4 z-[60] flex max-w-sm flex-col gap-2 sm:bottom-6 sm:end-6"
    >
      {toasts.map((t) => {
        const Icon =
          t.variant === "error"
            ? AlertCircle
            : t.variant === "info"
              ? Info
              : CheckCircle2;
        const colors =
          t.variant === "error"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : t.variant === "info"
              ? "border-navy-900/10 bg-white text-navy-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-950";
        const iconColor =
          t.variant === "error"
            ? "text-rose-600"
            : t.variant === "info"
              ? "text-brand-600"
              : "text-emerald-600";

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg shadow-navy-900/10 backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${colors}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => store.dismiss(t.id)}
              className="rounded-full p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createToastStore);

  return (
    <ToastContext.Provider value={store.ctxValue}>
      {children}
      <ToastViewport store={store} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
