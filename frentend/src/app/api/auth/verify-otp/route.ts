import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ message: "phone and code required" }, { status: 422 });

  try {
    const data = await backendFetch("otp/verify", {
      method: "POST",
      body: { phone, code },
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر التحقق من الرمز" }, { status: 500 });
  }
}
