import { NextRequest, NextResponse } from "next/server";
import { backendFetch, bearerFrom, BackendError } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ message: "phone required" }, { status: 422 });

  try {
    const data = await backendFetch("addresses", {
      query: { phone },
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر تحميل العناوين" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const data = await backendFetch("addresses", {
      method: "POST",
      body,
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر إضافة العنوان" }, { status: 500 });
  }
}
