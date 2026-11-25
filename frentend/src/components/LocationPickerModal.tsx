"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import {
  Briefcase,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  MoreHorizontal,
  Minus,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { findZoneForCity } from "@/lib/delivery";
import type { DeliveryZone } from "@/lib/types";

export interface LocationPickResult {
  lat: number;
  lng: number;
  address: string;
  city: string;
  locationType: string;
}

const LOCATION_TYPES = [
  { label: "المنزل", icon: Home },
  { label: "المكتب", icon: Briefcase },
  { label: "صديق", icon: Users },
  { label: "أخرى", icon: MoreHorizontal },
];

interface Suggestion {
  lat: string;
  lon: string;
  display_name: string;
}

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753]; // Riyadh

// Delivery is Riyadh-only for now — the map is soft-locked to the city and
// its immediate suburbs so a customer can't wander the whole map into a
// region we don't serve. [[south, west], [north, east]].
const RIYADH_BOUNDS: [[number, number], [number, number]] = [
  [24.35, 46.35],
  [25.05, 47.15],
];

export default function LocationPickerModal({
  initialLat,
  initialLng,
  initialLocationType,
  deliveryZones,
  onConfirm,
  onClose,
}: {
  initialLat?: number;
  initialLng?: number;
  initialLocationType?: string;
  deliveryZones: DeliveryZone[];
  onConfirm: (result: LocationPickResult) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [address, setAddress] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [locationType, setLocationType] = useState(initialLocationType || LOCATION_TYPES[0].label);
  const [countryCode, setCountryCode] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [center, setCenter] = useState<[number, number]>([
    initialLat ?? DEFAULT_CENTER[0],
    initialLng ?? DEFAULT_CENTER[1],
  ]);

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        maxBounds: RIYADH_BOUNDS,
        maxBoundsViscosity: 1,
        minZoom: 10,
      });
      // Standard OSM tiles — free, no API key. (CartoDB's basemaps now
      // require a registered key even for the free tier, which is why the
      // map showed "API KEY REQUIRED" watermark tiles instead of a map.)
      // Attribution is credited as text in the bottom panel instead of
      // Leaflet's own control, which the bottom panel would otherwise cover.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        subdomains: "abc",
        maxZoom: 19,
      }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        setCenter([c.lat, c.lng]);
        reverseGeocode(c.lat, c.lng);
      });

      mapRef.current = map;
      reverseGeocode(center[0], center[1]);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  function reverseGeocode(lat: number, lng: number) {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    setIsGeocoding(true);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        setAddress(data.address || "تعذّر تحديد العنوان");
        setCity(data.city || "");
        setCountryCode(data.country_code || "");
      } catch {
        setAddress("تعذّر تحديد العنوان");
      } finally {
        setIsGeocoding(false);
      }
    }, 500);
  }

  function moveTo(lat: number, lng: number, zoom = 15) {
    setCenter([lat, lng]);
    mapRef.current?.setView([lat, lng], zoom);
    reverseGeocode(lat, lng);
  }

  // ── Search ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      // A short/empty query clears any stale suggestions from a previous,
      // longer query — a real reaction to `query` changing, not a loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query.trim())}`);
        setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      }
    }, 500);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  async function searchNow() {
    if (!query.trim()) return;
    setIsSearching(true);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query.trim())}`);
      const list: Suggestion[] = await res.json();
      if (list.length > 0) {
        moveTo(parseFloat(list[0].lat), parseFloat(list[0].lon));
      }
    } finally {
      setIsSearching(false);
    }
  }

  function selectSuggestion(s: Suggestion) {
    setQuery(s.display_name.split(",")[0].trim());
    setSuggestions([]);
    moveTo(parseFloat(s.lat), parseFloat(s.lon));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveTo(pos.coords.latitude, pos.coords.longitude, 16);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function zoom(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  }

  const zone = city ? findZoneForCity(deliveryZones, city) : null;
  const isOutsideSaudi = countryCode !== "" && countryCode !== "sa";
  const isOutsideDeliveryArea = !isOutsideSaudi && !isGeocoding && !!city && !zone;
  const canConfirm = !isGeocoding && !!address && !isOutsideSaudi && !isOutsideDeliveryArea;

  return (
    <div className="fixed inset-0 z-50 bg-white" dir="rtl">
      {/* Map — z-0 gives this its own stacking context, confining Leaflet's
          internal panes (tiles/markers/popups carry z-index up to 700) so
          they can never paint over the sibling overlay UI below, no matter
          how high Leaflet's own z-index climbs. */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Center pin — z-10 puts it (and every other overlay below) above the
          map now that the map container has its own stacking context. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center" style={{ marginBottom: 34 }}>
          <span className="h-3 w-3 rounded-full bg-brand-600 shadow-[0_0_0_4px_rgba(0,0,0,0.08)]" />
          <MapPin className="h-11 w-11 text-brand-600 drop-shadow" fill="currentColor" strokeWidth={1} />
        </div>
      </div>

      {/* Top bar: close + search */}
      <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-lg"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 text-navy-900" aria-hidden />
          </button>
          <div className="relative flex-1">
            <div className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 shadow-lg">
              <Search className="h-4 w-4 shrink-0 text-navy-300" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchNow()}
                placeholder="ابحث عن حي، شارع، مكان..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {isSearching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden />}
            </div>
            {suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-[calc(100%+6px)] overflow-hidden rounded-2xl bg-white shadow-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="flex w-full items-start gap-2 border-b border-navy-900/5 px-3.5 py-2.5 text-right last:border-0 hover:bg-navy-900/5"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs text-navy-700">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom + my-location controls — offset high enough to clear the
          bottom panel, which grew taller once the location-type row was
          added below. */}
      <div className="absolute left-3 bottom-[340px] z-10 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => zoom(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow"
        >
          <Plus className="h-5 w-5 text-navy-900" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoom(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow"
        >
          <Minus className="h-5 w-5 text-navy-900" aria-hidden />
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={isLocating}
          className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
          ) : (
            <LocateFixed className="h-5 w-5 text-brand-600" aria-hidden />
          )}
        </button>
      </div>

      {/* Bottom panel */}
      <div className="absolute inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy-900/10" />

        <div className="mb-1 text-xs font-semibold text-navy-400">الموقع المحدد</div>
        {isGeocoding ? (
          <div className="mb-3 space-y-1.5">
            <div className="h-3.5 w-52 animate-pulse rounded bg-navy-900/10" />
            <div className="h-3.5 w-28 animate-pulse rounded bg-navy-900/10" />
          </div>
        ) : (
          <div className="mb-3 flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span className="text-sm font-bold text-navy-900">{address ?? "حرّك الخريطة لتحديد موقعك"}</span>
          </div>
        )}

        {zone && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
            توصيل {zone.name}
            {zone.base_fee === 0 && " — مجاني"}
          </div>
        )}

        <div className="mb-3 grid grid-cols-4 gap-2">
          {LOCATION_TYPES.map(({ label, icon: Icon }) => {
            const active = locationType === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setLocationType(label)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-bold transition ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-navy-900/10 text-navy-500 hover:bg-navy-900/[0.03]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        {isOutsideSaudi && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">
            التوصيل متاح داخل المملكة العربية السعودية فقط
          </div>
        )}

        {isOutsideDeliveryArea && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">
            التوصيل متاح حاليًا داخل مدينة الرياض فقط — لا يمكن إتمام الطلب لهذا الموقع
          </div>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() =>
            address &&
            onConfirm({ lat: center[0], lng: center[1], address, city, locationType })
          }
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition disabled:cursor-not-allowed disabled:bg-navy-900/10 disabled:text-navy-300 disabled:shadow-none"
        >
          تأكيد الموقع
        </button>
        <p className="mt-2 text-center text-[10px] text-navy-300">
          © خرائط{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>
        </p>
      </div>
    </div>
  );
}
