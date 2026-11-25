import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

/**
 * Thin proxy to Laravel's native (non-WooCommerce) order-creation endpoint.
 * Runs server-side so the request can't be tampered with beyond what a
 * normal client already could, and keeps the shape of this route stable
 * even if the backend's contract shifts.
 */
export async function POST(req: NextRequest) {
  const { locale, ...orderBody } = await req.json(); // Extract client locale without forwarding it to Laravel
  const isEn = locale === "en" || /\/en(\/|\?|$)/.test(req.headers.get("referer") ?? ""); // Detect English checkout via payload or referer
  const prefix = isEn ? "/en" : ""; // Preserve /en prefix on payment gateway return
  const origin = process.env.SITE_URL ?? req.nextUrl.origin;

  try {
    const data = await backendFetch<
      | { order_id: number; access_key: string; client_secret: string; public_key: string; amount: number }
      | { order_id: number; access_key: string; payment_method: "cod" }
    >("paymob-orders/create", {
      method: "POST",
      body: { ...orderBody, return_url_base: `${origin}${prefix}/order-confirmation` }, // Locale-aware Paymob return URL
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { message: isEn ? "Could not create the order" : "تعذّر إنشاء الطلب" }, // Localized 500 fallback error
      { status: 500 },
    );
  }
}
