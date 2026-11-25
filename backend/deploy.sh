#!/bin/bash
set -e

echo ""
echo "=============================="
echo "  EcoStore API — Deploy"
echo "=============================="
echo ""

# 1. Composer
echo "→ Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --quiet
echo "  Done."

# 2. App key (only if not already set)
if grep -q "^APP_KEY=$" .env 2>/dev/null; then
    echo "→ Generating app key..."
    php artisan key:generate --force
fi

# 3. Migrations
echo "→ Running database migrations..."
php artisan migrate --force
echo "  Done."

# 4. Cache config & routes (speeds up every request)
echo "→ Caching config and routes..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
echo "  Done."

# 5. Storage permissions
echo "→ Setting permissions..."
chmod -R 775 storage bootstrap/cache
echo "  Done."

echo ""
echo "=============================="
echo "  Deploy complete!"
echo "=============================="
echo ""
