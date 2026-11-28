/**
 * Server-only helpers for talking to the Laravel backend (ecostore-panel).
 * Never import this from a "use client" file — the v2 API secret would end
 * up in the browser bundle. Client code goes through this site's own
 * /api/* route handlers instead, which call these helpers server-side.
 */
import { STOREFRONT_CACHE_TAG } from "./storefront-cache";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8001").trim().replace(/\/+$/, "");

function getV2AuthHeader(): string | undefined {
  const key = (process.env.V2_API_KEY ?? "").trim();
  const secret = (process.env.V2_API_SECRET ?? "").trim();
  return key && secret ? "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") : undefined;
}

/** Pulls the customer bearer token out of an incoming request's own
 * Authorization header, to forward on to backendFetch. */
export function bearerFrom(req: Request): string | undefined {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
}

export class BackendError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Backend error ${status}`
    );
    this.status = status;
    this.body = body;
  }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  v2Auth?: boolean;
  /** Customer bearer token (from OTP login) — forwarded as-is to the
   * customer-scoped endpoints (profile, addresses, wallet, order history)
   * that verify the caller actually owns the id being requested. */
  bearerToken?: string;
  revalidate?: number | false;
};

function buildUrl(path: string, query?: FetchOpts["query"]) {
  const url = new URL(`${BACKEND_URL}/api/${path.replace(/^\/+/, "")}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Thin JSON fetch wrapper — throws BackendError on non-2xx so callers can
 * catch a single error type instead of re-checking res.ok everywhere. */
export async function backendFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  const v2AuthHeader = opts.v2Auth ? getV2AuthHeader() : undefined;
  if (v2AuthHeader) headers.Authorization = v2AuthHeader;
  if (opts.bearerToken) headers.Authorization = `Bearer ${opts.bearerToken}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  // Cache only public GET reads that explicitly opt into a revalidate TTL;
  // mutations, bearer-authenticated customer reads, and fresh/search calls
  // stay strictly uncached.
  const canCache =
    method === "GET" &&
    !opts.bearerToken &&
    typeof opts.revalidate === "number" &&
    opts.revalidate > 0;

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    ...(canCache
      ? { next: { revalidate: opts.revalidate as number, tags: [STOREFRONT_CACHE_TAG] } }
      : { cache: "no-store" }),
    signal: AbortSignal.timeout(12000),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error("BACKEND_FAIL:", res.status, buildUrl(path, opts.query), text.slice(0, 300));
    throw new BackendError(res.status, data);
  }
  return data as T;
}

/** Lightweight uncached read of the backend's current catalog/config version. */
export async function fetchBackendStorefrontVersion(): Promise<string | null> {
  try {
    const res = await fetch(buildUrl("storefront-version"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data?.version === "string" && data.version ? data.version : null;
  } catch {
    return null;
  }
}