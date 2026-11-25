import { NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function DELETE(_req: Request, { params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  try {
    const data = await backendFetch(`abandoned-cart/${phone}`, { method: "DELETE", revalidate: false });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر الحذف" }, { status: 500 });
  }
}
