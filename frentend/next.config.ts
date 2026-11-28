import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Keep prefetched and visited pages in the client router cache so
    // clicking categories/products or pressing Back opens instantaneously
    // without re-fetching or flashing.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Laravel backend (ecostore-panel) — banner/category/product images served
      // from its public storage disk.
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "8001" },
      { protocol: "http", hostname: "127.0.0.1", port: "8001" },
      // Staging deployment on Alibaba Cloud (storeseco-prod-01).
      { protocol: "https", hostname: "staging-api.storeseco.com" },
      // The actual live domain ecostore-panel now serves from — APP_URL
      // there was fixed 2026-10-20 (was still "staging-api" though the
      // real admin panel had already moved to this domain), so every
      // storage URL the backend generates now uses this hostname.
      { protocol: "https", hostname: "app-api.storeseco.com" },
      // Real production backend, once it's live on the same server.
      { protocol: "https", hostname: "api.storeseco.com" },
      // Some existing banner/product rows still point at the legacy
      // WordPress media library (pre-migration content).
      { protocol: "https", hostname: "storeseco.com" },
      // External product catalog CDN images (e.g. imported via CSV/Excel).
      { protocol: "https", hostname: "**" },
    ],
  },
  // Baseline security headers that were entirely missing (a plain curl -I
  // showed none of these set at all). No Content-Security-Policy here on
  // purpose — Next.js's own inline hydration scripts need either
  // 'unsafe-inline' or a per-request nonce via middleware to not break the
  // whole site, and getting that wrong has a much bigger blast radius than
  // these headers. That's a separate, carefully-tested change.
  async headers() {
    return [
      // iOS fetches this extension-less file to decide which storeseco.com
      // links open the app; it must be served as JSON.
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/:path*",
        headers: [
          // Stops the site being framed by another origin (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stops a browser from guessing a response's type away from the
          // Content-Type we actually sent (MIME-sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Deny browser features this site never uses; the delivery
          // address picker does use the browser's geolocation, so that one
          // stays allowed for same-origin only.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), usb=(), payment=(), geolocation=(self)",
          },
          // No includeSubDomains: this domain's parent (storeseco.com) also
          // covers the old WordPress site and api.storeseco.com (the old
          // app's backend, deliberately left untouched during the
          // migration) — includeSubDomains would force HTTPS-only on those
          // too for any browser that ever hit this site, which is a bigger
          // and harder-to-reverse change than intended here.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
