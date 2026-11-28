import { NextRequest, NextResponse } from "next/server";
import { getCategorySections } from "@/lib/api";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parentId = Number(sp.get("parent_id") ?? "0");
  const perPage = Number(sp.get("per_page") ?? "8") || 8;

  if (!parentId || parentId <= 0) {
    return NextResponse.json([]);
  }

  const sections = await getCategorySections(parentId, perPage);
  return NextResponse.json(sections, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
