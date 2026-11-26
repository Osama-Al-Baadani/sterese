"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { localizedPath } from "@/lib/i18n-helpers";

const RECENT_SEARCHES_KEY = "storeseco_recent_searches_v1";

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  const clean = term.trim();
  if (!clean) return;
  try {
    const next = [clean, ...loadRecentSearches().filter((s) => s !== clean)].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export default function SearchBar({ keywords = [] }: { keywords?: string[] }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [liveKeywords, setLiveKeywords] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, []);

  // Fast keyword suggestions from product names (text-only chips, no heavy dropdown)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveKeywords([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(trimmed)}&per_page=8`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data: Array<{ name: string; name_en?: string | null }> = await res.json();
          if (Array.isArray(data)) {
            const names = data
              .map((p) => (locale === "en" && p.name_en ? p.name_en : p.name))
              .filter(Boolean);
            setLiveKeywords(Array.from(new Set(names)).slice(0, 8));
          }
        }
      } catch {
        // ignore abort/network
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filteredStaticKeywords = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return keywords.slice(0, 10);
    return keywords.filter((k) => k.toLowerCase().includes(q)).slice(0, 8);
  }, [keywords, query]);

  const combinedChips = useMemo(() => {
    const merged = [...liveKeywords, ...filteredStaticKeywords];
    return Array.from(new Set(merged)).slice(0, 10);
  }, [liveKeywords, filteredStaticKeywords]);

  function runSearch(term: string) {
    const clean = term.trim();
    if (!clean) return;
    saveRecentSearch(clean);
    setRecent(loadRecentSearches());
    setQuery(clean);
    setOpen(false);
    router.push(`/browse?search=${encodeURIComponent(clean)}`);
  }

  return (
    <div
      ref={containerRef}
      className="relative order-3 w-full basis-full sm:order-none sm:basis-auto sm:flex-1"
    >
      <form
        action={localizedPath("/browse", locale)}
        method="get"
        onSubmit={(e) => {
          const clean = query.trim();
          if (!clean) return;
          e.preventDefault();
          runSearch(clean);
        }}
      >
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 start-4 h-5 w-5 -translate-y-1/2 text-navy-400"
            aria-hidden
          />
          <input
            type="search"
            name="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className="w-full rounded-full border border-black/5 bg-white py-2.5 ps-12 pe-10 text-base text-navy-900 shadow-xs outline-none transition focus:ring-2 focus:ring-navy-900/15 sm:ps-11 sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLiveKeywords([]);
              }}
              className="absolute top-1/2 end-3 -translate-y-1/2 rounded-full p-1 text-navy-400 transition hover:bg-navy-900/5 hover:text-navy-700"
              aria-label={tCommon("close")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
      </form>

      {open && (combinedChips.length > 0 || (query.trim() === "" && recent.length > 0)) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-2xl border border-navy-900/10 bg-white p-3.5 shadow-xl shadow-navy-900/10">
          {query.trim() === "" && recent.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-navy-500">
                  <Clock className="h-3.5 w-3.5 text-navy-400" aria-hidden />
                  {t("recentSearches")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
                    setRecent([]);
                  }}
                  className="text-[11px] font-semibold text-navy-400 hover:text-rose-600"
                >
                  {t("clearRecent")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => runSearch(term)}
                    className="rounded-full border border-navy-900/10 bg-navy-900/[0.03] px-3 py-1 text-xs font-semibold text-navy-800 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {combinedChips.length > 0 && (
            <div>
              <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-navy-500">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                {t("quickKeywords")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {combinedChips.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => runSearch(kw)}
                    className="rounded-full border border-brand-500/20 bg-brand-50/70 px-3 py-1 text-xs font-bold text-brand-800 transition hover:border-brand-600 hover:bg-brand-600 hover:text-white"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
