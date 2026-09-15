# syntax=docker/dockerfile:1

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --optimize-autoloader \
    --prefer-dist

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
COPY --from=vendor /app/vendor ./vendor

# The repo's committed bootstrap/cache/*.php (regenerated locally against the
# full dev vendor tree) is excluded via .dockerignore — rebuild it here
# against the --no-dev vendor tree instead, or boot fails looking for
# dev-only providers (Pail, Boost, ...) that were never installed above.
RUN php artisan package:discover --ansi

RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
