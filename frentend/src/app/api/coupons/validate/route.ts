import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const subtotal = req.nextUrl.searchParams.get("subtotal");
  const productIds = req.nextUrl.searchParams.get("product_ids") ?? undefined;

  if (!code || !subtotal) {
    return NextResponse.json({ message: "code and subtotal required" }, { status: 422 });
  }

  try {
    const data = await backendFetch("v2/coupons/validate", {
      v2Auth: true,
      revalidate: false,
      query: { code, subtotal, product_ids: productIds },
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر التحقق من الكوبون" }, { status: 500 });
  }
}
