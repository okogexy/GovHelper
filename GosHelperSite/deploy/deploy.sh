#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/govhelper}"
PHP_BIN="${PHP_BIN:-php}"
cd "$APP_DIR"

composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
npm ci --no-audit --no-fund
npm run build
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan route:cache
"$PHP_BIN" artisan view:cache
chmod -R ug+rw storage bootstrap/cache
"$PHP_BIN" artisan about --only=environment
