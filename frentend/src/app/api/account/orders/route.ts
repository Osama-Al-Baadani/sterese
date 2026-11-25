import { NextRequest, NextResponse } from "next/server";
import { backendFetch, bearerFrom, BackendError } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ message: "phone required" }, { status: 422 });

  try {
    const data = await backendFetch("paymob-orders", {
      query: { phone },
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر تحميل الطلبات" }, { status: 500 });
  }
}
