import { NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await backendFetch(`paymob-orders/${id}/status`, {
      // The order's own access key (from the confirmation URL) — the backend
      // won't serve an order by id alone any more.
      query: { key: new URL(req.url).searchParams.get("key") ?? undefined },
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر التحقق من حالة الطلب" }, { status: 500 });
  }
}
