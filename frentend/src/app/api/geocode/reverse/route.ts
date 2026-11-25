import { NextRequest, NextResponse } from "next/server";

// Reverse-geocodes a lat/lng into an Arabic address + city via OpenStreetMap's
// Nominatim — proxied server-side (not called from the browser directly) so a
// real, policy-compliant User-Agent can be sent; Nominatim's usage policy
// requires one, and browsers refuse to let client JS set that header at all.
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ message: "lat and lng required" }, { status: 422 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { "User-Agent": "StoresEcoWeb/1.0 (info@storeseco.com)" } },
    );
    const data = await res.json();
    const addr = data.address ?? {};

    const parts: string[] = [];
    for (const k of ["road", "neighbourhood", "suburb", "city_district", "city", "state"]) {
      const v = addr[k];
      if (v) parts.push(v);
    }

    const exactCity: string = addr.city || addr.town || addr.village || "";
    const countryCode: string = (addr.country_code || "").toLowerCase();

    return NextResponse.json({
      address: parts.slice(0, 4).join("، "),
      city: exactCity || addr.municipality || addr.state || addr.county || "",
      country_code: countryCode,
    });
  } catch {
    return NextResponse.json({ message: "تعذّر تحديد العنوان" }, { status: 500 });
  }
}
