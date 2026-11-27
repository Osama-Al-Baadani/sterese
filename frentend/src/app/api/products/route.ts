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
    // `fresh=1` (cart sync) skips the 300s data cache so a customer never
    // checks out at a price or stock level that changed minutes ago.
    const products = await getProducts({ include: ids, perPage: 100, fresh: sp.get("fresh") === "1" });
    return NextResponse.json(products, sp.get("fresh") === "1" ? { headers: { "Cache-Control": "no-store" } } : undefined);
  }

  const orderby = sp.get("orderby");
  const order = sp.get("order");
  const minPriceRaw = sp.get("min_price");
  const maxPriceRaw = sp.get("max_price");
  const minPrice = minPriceRaw && !Number.isNaN(Number(minPriceRaw)) ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw && !Number.isNaN(Number(maxPriceRaw)) ? Number(maxPriceRaw) : undefined;
  const search = sp.get("search") ?? undefined;
  const products = await getProducts({
    search,
    category: sp.get("category") ?? undefined,
    brand: sp.get("brand") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    orderby: orderby === "date" || orderby === "price" ? orderby : "popularity",
    order: order === "asc" ? "asc" : "desc",
    minPrice,
    maxPrice,
    inStockOnly: sp.get("in_stock") === "1",
    page: Number(sp.get("page") ?? "1") || 1,
    perPage: Number(sp.get("per_page") ?? "24") || 24,
  });
  return NextResponse.json(
    products,
    search
      ? undefined
      : { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600" } },
  );
}
