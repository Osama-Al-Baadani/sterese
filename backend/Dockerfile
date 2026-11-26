FROM php:8.3-apache

# Install system dependencies & PHP extensions required by Laravel + Filament
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libicu-dev \
    libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite and set DocumentRoot to Laravel's /public
RUN a2enmod rewrite
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

# Install PHP dependencies & publish Filament CSS/JS assets
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && php artisan filament:assets

# Set permissions for Laravel storage & cache
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Render injects $PORT at runtime (default 10000); configure Apache, run migrations, seed default admin if missing & start server
CMD ["sh", "-c", "sed -i \"s/80/${PORT:-10000}/g\" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf && php artisan migrate --force && php -r \"require 'vendor/autoload.php'; \\$app = require_once 'bootstrap/app.php'; \\$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); App\\Models\\User::firstOrCreate(['email' => getenv('ADMIN_EMAIL') ?: 'admin@storeseco.com'], ['name' => 'Admin', 'password' => getenv('ADMIN_PASSWORD') ?: 'Admin@123456']);\" && (php artisan storage:link || true) && apache2-foreground"]
