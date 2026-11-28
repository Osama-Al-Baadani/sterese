import { NextRequest, NextResponse } from "next/server";
import { purgeStorefrontCache } from "@/lib/storefront-cache";

export async function POST(req: NextRequest) {
  const configuredSecret = (process.env.REVALIDATE_SECRET ?? "").trim();
  if (configuredSecret) {
    const provided = req.headers.get("x-revalidate-secret") ?? "";
    if (provided !== configuredSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let version: string | null = null;
  try {
    const body = (await req.json()) as { version?: unknown };
    if (typeof body?.version === "string" && body.version) {
      version = body.version;
    }
  } catch {
    // Empty body is fine — still purge immediately
  }

  const revalidated = purgeStorefrontCache(version);
  return NextResponse.json(
    { ok: true, revalidated, version },
    { headers: { "Cache-Control": "no-store" } },
  );
}
