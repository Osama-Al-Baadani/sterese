import { NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await backendFetch("orders/public-track", {
      method: "POST",
      body,
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر تتبع الطلب الآن" }, { status: 500 });
  }
}
