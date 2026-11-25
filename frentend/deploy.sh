#!/bin/bash
set -e

echo ""
echo "=============================="
echo "  Storeseco Web — Deploy"
echo "=============================="
echo ""

echo "→ Installing Node dependencies..."
npm install --silent
echo "  Done."

# Next.js's on-disk fetch/data cache (.next/cache) hasn't been reliably
# expiring itself in this self-hosted (non-Vercel, pm2 + `next start`)
# setup — confirmed 2026-11-15: a product deleted two days earlier was
# still showing live on the storefront, long past its 5-minute revalidate
# window, and the directory had grown to 1.5GB of accumulated stale
# entries. Clearing it on every deploy is the only thing confirmed to force
# a real refetch from the backend.
echo "→ Clearing stale Next.js data cache..."
rm -rf .next/cache
echo "  Done."

echo "→ Building..."
npm run build
echo "  Done."

echo "→ Restarting app..."
pm2 restart storeseco-web
echo "  Done."

echo ""
echo "=============================="
echo "  Deploy complete!"
echo "=============================="
echo ""
