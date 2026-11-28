"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3500;

/**
 * Keeps open storefront tabs synchronized with backend admin changes
 * (products, banners, categories, sections, settings) automatically without
 * requiring a manual browser refresh.
 */
export default function StorefrontLiveSync({ initialVersion }: { initialVersion?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const versionRef = useRef<string | null>(initialVersion ?? null);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (initialVersion && versionRef.current === null) {
      versionRef.current = initialVersion;
    }
  }, [initialVersion]);

  useEffect(() => {
    let disposed = false;

    async function checkVersion() {
      if (disposed || checkingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      checkingRef.current = true;
      try {
        const qs = versionRef.current ? `?known=${encodeURIComponent(versionRef.current)}` : "";
        const res = await fetch(`/api/storefront-version${qs}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || disposed) return;

        const data = (await res.json()) as { version?: string | null };
        const nextVer = typeof data?.version === "string" && data.version ? data.version : null;
        if (!nextVer) return;

        if (versionRef.current === null) {
          versionRef.current = nextVer;
          return;
        }

        if (nextVer !== versionRef.current) {
          versionRef.current = nextVer;
          window.dispatchEvent(new CustomEvent("storefront:updated", { detail: { version: nextVer } }));
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        // Ignore transient network hiccups
      } finally {
        checkingRef.current = false;
      }
    }

    // Immediate check on mount + whenever the user switches back to this tab
    void checkVersion();

    const intervalId = window.setInterval(checkVersion, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkVersion();
      }
    };
    const onFocus = () => void checkVersion();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [router]);

  return null;
}
