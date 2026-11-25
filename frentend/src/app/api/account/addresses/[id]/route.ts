import { NextRequest, NextResponse } from "next/server";
import { backendFetch, bearerFrom, BackendError } from "@/lib/backend";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    const data = await backendFetch(`addresses/${id}`, {
      method: "PUT",
      body,
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر تحديث العنوان" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = await backendFetch(`addresses/${id}`, {
      method: "DELETE",
      bearerToken: bearerFrom(req),
      revalidate: false,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json(e.body ?? { message: e.message }, { status: e.status });
    }
    return NextResponse.json({ message: "تعذّر حذف العنوان" }, { status: 500 });
  }
}
