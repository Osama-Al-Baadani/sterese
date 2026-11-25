@AGENTS.md

# storeseco-web — الموقع الإلكتروني

Next.js (App Router) storefront for "المخازن الاقتصادية". Talks to the
`ecostore-panel` Laravel backend through server-side API routes under
`src/app/api/` (never directly from client components — the backend's
`V2_API_KEY`/`V2_API_SECRET` must never reach the browser).

## Cross-repo relationships

- Backend: `C:\src\ecostore-panel` — same live API as the mobile app
  (`storeseco11-dev`). If you change how this site calls an endpoint, check
  whether the app calls the same one; they've drifted out of sync before (e.g.
  the order-history endpoint's param changed from `customer_id` to `phone` on
  the backend, and this site's own proxy route had to be updated to match — it
  silently showed "no orders" for every customer until that was caught).
- Deployed on the same Alibaba Cloud server as `ecostore-panel`, via PM2
  (`pm2 restart storeseco-web` after `npm run build`).
- `storeseco.com` itself is still on the old WordPress/WooCommerce hosting —
  this site currently runs on a `staging.storeseco.com` subdomain pointing at
  the new server. Anything that assumes the production domain (deep links,
  the `SITE_URL` env var, App Links verification) won't fully resolve until
  that domain migrates.

## Hard-won gotchas

- **Never use `req.nextUrl.origin`** to build a redirect URL (e.g. for PayMob's
  `redirection_url`) — behind this server's reverse-proxy setup it resolves to
  `http://localhost:3000`, sending customers to a blank page after paying. Use
  the `SITE_URL` env var instead (already the pattern in `robots.ts`,
  `sitemap.ts`, `layout.tsx`, `Breadcrumbs.tsx`, `browse/page.tsx` —
  `process.env.SITE_URL ?? "http://localhost:3000"`).
- **Money is never trusted from this site either.** The backend recomputes
  subtotal/discount/delivery/cod fee server-side regardless of what this site's
  checkout form sends — if a displayed number can drift from what the server
  will actually charge (e.g. an applied coupon discount after the cart changes),
  fix the *display* to stay honest, don't rely on the backend alone to make it
  look right.
- **Internal links must use `@/i18n/navigation`'s `Link`**, not plain
  `next/link`. Using the wrong one on an internal link produces an unprefixed
  href on the English locale, which combined with a Next.js core prefetch bug
  caused a genuine infinite request loop across every `/en` page.
- `hasProducts()` in `category-tree.ts` filters empty categories (including
  empty *subtrees*, not just directly-empty ones) out of nav/browse/homepage —
  reuse it rather than checking `category.count` directly.

## Workflow

1. `npx tsc --noEmit` before committing — this is the fast, reliable check;
   there's no way to visually test the UI in this environment, so say so
   explicitly rather than claiming a UI change "works."
2. Commit with a message explaining *why* — this file and git history are the
   durable memory between sessions/agents, including a different AI tool
   picking this repo up later.
3. Push, then deploy: `ssh` to the server, `git pull`, `npm run build`,
   `pm2 restart storeseco-web`.
4. For anything touching the backend contract, verify the actual live response
   shape (curl or a tinker script against `ecostore-panel`) rather than
   trusting that the TypeScript types already match reality.
