import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/api";

// Client-side components (e.g. CartContext, which needs quantity limits
// before the user ever navigates to a server-rendered page) can't call
// getAppConfig() directly — it runs server-only. This is the public,
// no-secrets subset they fetch instead.
export async function GET() {
  const config = await getAppConfig();
  return NextResponse.json({
    storeSettings: config.storeSettings,
    productQtyLimits: config.productQtyLimits,
  });
}
