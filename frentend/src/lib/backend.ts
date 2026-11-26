/**
 * Server-only helpers for talking to the Laravel backend (ecostore-panel).
 * Never import this from a "use client" file — the v2 API secret would end
 * up in the browser bundle. Client code goes through this site's own
 * /api/* route handlers instead, which call these helpers server-side.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8001").trim().replace(/\/+$/, "");
const V2_API_KEY = (process.env.V2_API_KEY ?? "").trim();
const V2_API_SECRET = (process.env.V2_API_SECRET ?? "").trim();

const v2AuthHeader =
  V2_API_KEY && V2_API_SECRET
    ? "Basic " + Buffer.from(`${V2_API_KEY}:${V2_API_SECRET}`).toString("base64")
    : undefined;

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
    super(typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : `Backend error ${status}`);
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
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.v2Auth && v2AuthHeader) headers.Authorization = v2AuthHeader;
  if (opts.bearerToken) headers.Authorization = `Bearer ${opts.bearerToken}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    ...(opts.revalidate === false
      ? { cache: "no-store" as const }
      // 5 min, not 60s — bumped 2026-10-26 under real crawl + launch-day load.
      // Only ever reaches public, non-personal data: every customer-specific
      // call (orders, addresses, profile, OTP, coupon check) already passes
      // revalidate: false explicitly and is unaffected. A price/stock edit in
      // the admin can take up to 5 min to show on the storefront now — the
      // real checkout total is always recomputed server-side regardless, so
      // this is a display-staleness tradeoff only, never a money one.
      : { next: { revalidate: opts.revalidate ?? 60 } }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new BackendError(res.status, data);
  return data as T;
}
