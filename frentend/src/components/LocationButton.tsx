"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl"; // Read active locale and nav.defaultCity
import type { LocationPickResult } from "./LocationPickerModal";
import type { DeliveryZone } from "@/lib/types";

const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), { ssr: false });

const STORAGE_KEY = "storeseco_location_v1";

// Arabic/English Saudi city lookup pairs so saved localStorage cities switch cleanly across locales
const CITY_PAIRS: [string, string][] = [
  ["الرياض", "Riyadh"],
  ["جدة", "Jeddah"],
  ["مكة المكرمة", "Makkah"],
  ["مكة", "Makkah"],
  ["المدينة المنورة", "Madinah"],
  ["المدينة", "Madinah"],
  ["الدمام", "Dammam"],
  ["الخبر", "Khobar"],
  ["الظهران", "Dhahran"],
  ["الطائف", "Taif"],
  ["تبوك", "Tabuk"],
  ["بريدة", "Buraydah"],
  ["أبها", "Abha"],
  ["حائل", "Hail"],
  ["جازان", "Jazan"],
  ["نجران", "Najran"],
  ["الخرج", "Al Kharj"],
  ["الدرعية", "Diriyah"],
];

const CITY_TO_EN = new Map<string, string>(CITY_PAIRS);
const CITY_TO_AR = new Map<string, string>();
for (const [ar, en] of CITY_PAIRS) {
  const key = en.toLowerCase();
  if (!CITY_TO_AR.has(key)) CITY_TO_AR.set(key, ar);
}

/** Translates stored Saudi city names across site locales while preserving the original string if unrecognized. */
function localizeCity(city: string, locale: string): string {
  const cleaned = city
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(منطقة|محافظة|مدينة)\s+/, "");
  if (locale === "en") {
    return CITY_TO_EN.get(cleaned) ?? city;
  }
  return CITY_TO_AR.get(cleaned.toLowerCase()) ?? city;
}

export default function LocationButton({ deliveryZones }: { deliveryZones: DeliveryZone[] }) {
  const t = useTranslations("nav"); // Provides localized defaultCity fallback
  const locale = useLocale(); // Active locale for translating saved city names
  const [location, setLocation] = useState<LocationPickResult | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Same hydration-safe pattern as CartProvider/AuthProvider — loaded in an
  // effect so the server-rendered (default city) markup always matches the
  // first client render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLocation(JSON.parse(raw));
    } catch {
      // corrupted/blocked storage — falls back to the default city label
    }
  }, []);

  function confirm(result: LocationPickResult) {
    setLocation(result);
    setShowPicker(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
      // storage full/blocked — selection just won't persist across reloads
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-navy-900 transition hover:bg-black/5 sm:flex"
      >
        <MapPin className="h-4 w-4 text-navy-900" aria-hidden />
        {/* Localize saved city name or fall back to translated defaultCity */}
        {location?.city ? localizeCity(location.city, locale) : t("defaultCity")}
      </button>

      {showPicker && (
        <LocationPickerModal
          initialLat={location?.lat}
          initialLng={location?.lng}
          initialLocationType={location?.locationType}
          deliveryZones={deliveryZones}
          onConfirm={confirm}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
