import { NextRequest, NextResponse } from "next/server";

// Forward-geocodes a free-text search query (place/street/neighbourhood name)
// into candidate locations, proxied server-side for the same reason as
// /api/geocode/reverse — Nominatim requires a real User-Agent.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Delivery is Riyadh-only for now, so search results are hard-bounded to
    // the city + immediate suburbs (bounded=1) instead of matching anywhere
    // in Saudi Arabia — a customer searching "حي كذا" shouldn't be offered a
    // same-named neighbourhood in another city we don't deliver to.
    const riyadhViewbox = "46.35,25.05,47.15,24.35";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=ar&limit=5&countrycodes=sa&viewbox=${riyadhViewbox}&bounded=1`,
      { headers: { "User-Agent": "StoresEcoWeb/1.0 (info@storeseco.com)" } },
    );
    const list = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    return NextResponse.json(
      list.map((item) => ({ lat: item.lat, lon: item.lon, display_name: item.display_name })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
