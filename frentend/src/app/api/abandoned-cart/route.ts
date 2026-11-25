import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const data = await backendFetch("abandoned-cart", { method: "POST", body, revalidate: false });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر الحفظ" }, { status: 500 });
  }
}
