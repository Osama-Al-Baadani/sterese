import { NextRequest, NextResponse } from "next/server";
import { backendFetch, bearerFrom, BackendError } from "@/lib/backend";

export async function PUT(req: NextRequest) {
  const { customer_id, first_name } = await req.json();
  if (!customer_id) return NextResponse.json({ message: "customer_id required" }, { status: 422 });

  try {
    const data = await backendFetch(`customers/${customer_id}`, {
      method: "PUT",
      body: { first_name },
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر تحديث الملف الشخصي" }, { status: 500 });
  }
}
