import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ message: "phone required" }, { status: 422 });

  try {
    const data = await backendFetch("otp/send", { method: "POST", body: { phone }, revalidate: false });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر إرسال رمز التحقق" }, { status: 500 });
  }
}
