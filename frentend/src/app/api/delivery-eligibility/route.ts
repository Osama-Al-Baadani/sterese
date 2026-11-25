import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ message: "phone required" }, { status: 422 });
  }

  try {
    const data = await backendFetch("delivery-eligibility", {
      revalidate: false,
      query: { phone },
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر التحقق من أهلية التوصيل المجاني" }, { status: 500 });
  }
}
