# Selects which vendor stage below gets copied into the final image.
# docker-compose.yml (prod/deploy) leaves this at the default so the image
# stays --no-dev; docker-compose.dev.yml overrides it to vendor-dev.
ARG VENDOR_STAGE=vendor

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --optimize-autoloader \
    --prefer-dist

# Same install but with dev deps (fakerphp/faker, Pail, Boost, ...) kept in,
# for the local dev compose override — see docker-compose.dev.yml.
FROM composer:2 AS vendor-dev
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-scripts \
    --no-interaction \
    --prefer-dist

# BuildKit doesn't support a variable in COPY --from, so alias whichever
# vendor stage was selected to a fixed stage name here instead.
FROM ${VENDOR_STAGE} AS vendor-selected

FROM php:8.3-fpm-alpine AS app

RUN apk add --no-cache \
        libpq-dev \
        libzip-dev \
        icu-dev \
        postgresql16-client \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        bcmath \
        intl \
        zip \
        opcache

RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.memory_consumption=192'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

WORKDIR /var/www/html

COPY . .
COPY --from=vendor-selected /app/vendor ./vendor

# The repo's committed bootstrap/cache/*.php (regenerated locally against the
# full dev vendor tree) is excluded via .dockerignore — rebuild it here
# against whichever vendor tree was actually copied in above, or boot fails
# looking for providers (Pail, Boost, ...) that vendor/ doesn't have.
RUN php artisan package:discover --ansi

RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
