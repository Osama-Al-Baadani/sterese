import { NextRequest, NextResponse } from "next/server";
import { fetchBackendStorefrontVersion } from "@/lib/backend";
import { getLastPurgedVersion, purgeStorefrontCache, rememberVersion } from "@/lib/storefront-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const known = req.nextUrl.searchParams.get("known");
  const version = await fetchBackendStorefrontVersion();

  if (version) {
    const serverKnown = getLastPurgedVersion();
    if ((serverKnown && serverKnown !== version) || (known && known !== version)) {
      purgeStorefrontCache(version);
    } else {
      rememberVersion(version);
    }
  }

  return NextResponse.json(
    { version },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
