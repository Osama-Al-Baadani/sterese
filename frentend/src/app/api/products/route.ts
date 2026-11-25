import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/api";

// Client components fetch products through here — either specific IDs (the
// favorites page, which reads them from localStorage and so can't call
// getProducts() server-side) or a filtered/paginated browse page ("load
// more" on /browse, which needs to fetch page 2+ from the client without
// exposing the v2 API key that getProducts() otherwise sends server-side
// only).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ids = sp.get("ids");
  if (ids) {
    const products = await getProducts({ include: ids, perPage: 100 });
    return NextResponse.json(products);
  }

  const orderby = sp.get("orderby");
  const order = sp.get("order");
  const products = await getProducts({
    search: sp.get("search") ?? undefined,
    category: sp.get("category") ?? undefined,
    brand: sp.get("brand") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    orderby: orderby === "date" || orderby === "price" ? orderby : "popularity",
    order: order === "asc" ? "asc" : "desc",
    inStockOnly: sp.get("in_stock") === "1",
    page: Number(sp.get("page") ?? "1") || 1,
    perPage: Number(sp.get("per_page") ?? "24") || 24,
  });
  return NextResponse.json(products);
}
