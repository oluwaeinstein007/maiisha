# MAI_ISHA API

Laravel 13 backend for **MAI_ISHA Fashion & Beauty Sphere** — a UK e-commerce API covering catalogue browsing, cart, checkout (Stripe), orders, discounts, and a full admin surface. See [`docs/PRD.md`](../docs/PRD.md) at the repo root for the product requirements this implements.

- **Auth:** Laravel Sanctum, cookie/session-based (SPA pattern) — not bearer tokens. See [Authentication](#authentication) below.
- **Money:** every amount is an integer in **pence**, GBP only (Phase 1 scope per the PRD).
- **Tests:** 52 passing (`php artisan test`), PHPUnit + `RefreshDatabase`, SQLite in-memory.
- **Style:** [Laravel Pint](https://laravel.com/docs/pint), CI-enforced (`vendor/bin/pint --test`).

---

## Quick start (without Docker)

```sh
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
composer dev        # runs the app server, queue worker, and log tail together
```

The API is now at `http://localhost:8000`. `composer dev` is Laravel's built-in concurrent dev runner (`php artisan dev`) — use plain `php artisan serve` instead if you'd rather run the queue worker separately.

Running the whole stack (Postgres + Next.js frontend + nginx) via Docker Compose instead is documented at the [repo root README](../README.md#running-locally-with-docker-compose).

### Seeded demo data

`--seed` (or `php artisan db:seed`) populates:

| What | Value |
|---|---|
| Admin login | `admin@maiisha.test` / `password` |
| Customer login | `customer@maiisha.test` / `password` |
| Sales | `SaleSeeder`: three **manual, inactive drafts with no dates** — *Christmas Sale*, *Ileya Sale* and *Black Friday* (the last two with lines/brands/products already attached) — plus a live manual *Autumn Style Sale*, a weekly *Monday Deals*, and a past dated *Summer Clearance* (the demo orders inside its window are priced at the sale price, which is what fills the analytics "sale performance" panel) |
| Brands | `BrandSeeder`: 9 invented demo brands, one per top-level category, assigned to every product that has no brand yet (a brand you've set is never overwritten) |
| Discount codes | `DiscountCodeSeeder`: `WELCOME10` (10% off) and `FIVEOFF` (£5.00 off, a fixed amount) |
| Categories | The 9 PRD §3 categories, several with subcategories |
| Products | ~14 products across those categories, each with 1+ variants (size/colour), realistic stock levels including a couple of deliberately low-stock variants |
| Customers | 10 realistic UK customers (`CustomerSeeder`), each with a default delivery address |
| Orders | 8 realistic orders (`OrderSeeder`) spanning the full lifecycle — placed, processing, shipped, delivered, and one cancelled — with matching payments and shipments, so the admin dashboard/orders screens have real-looking data to show without placing any orders yourself first |

Re-running `php artisan migrate:fresh --seed` is always safe in development — it drops and rebuilds everything from scratch.

---

## Testing the API

Two ways, pick whichever fits:

- **`php artisan test`** — the real test suite (130+ tests): auth, cart, checkout math and rollback behaviour, admin authorization, Stripe webhook handling, rate limiting, sale pricing, product filtering and admin analytics. This is what CI runs.
- **Postman** — [`postman/MAI_ISHA-API.postman_collection.json`](postman/MAI_ISHA-API.postman_collection.json) is a full, hand-built collection covering every endpoint with realistic example data, chained requests (each folder feeds variables to the next), and `pm.test()` assertions on every request — built for manually exploring or demoing the API, not for CI. Import it plus one of the two environment files in the same folder (`MAI_ISHA - Local` for `php artisan serve`, `MAI_ISHA - Docker Compose` for the container stack), select the environment, and run **00 - Setup** first. Full instructions are in the collection's own description (visible in Postman once imported).

---

## Authentication

This is a **cookie/session** API (Laravel Sanctum's SPA pattern), the same as a first-party frontend — not a bearer-token API. The flow, exactly as the real Next.js frontend does it:

1. `GET /sanctum/csrf-cookie` — sets a session cookie + an `XSRF-TOKEN` cookie.
2. Every subsequent request needs `credentials: 'include'` (send cookies) and, for anything other than `GET`, an `X-XSRF-TOKEN` header set from that cookie's (URL-decoded) value.
3. `POST /api/auth/login` or `/register` — authenticates the session. From here on, `/api/user` and any `auth:sanctum` route work as that user.

**One thing that trips people up:** Sanctum only turns on session/cookie middleware for a request whose `Origin` or `Referer` header matches `SANCTUM_STATEFUL_DOMAINS` in `.env` (`localhost:3000,127.0.0.1:3000` by default). A real browser sends `Origin` automatically on any cross-origin request, so the actual frontend never has to think about this — but a bare `curl`/script call without that header gets a clean `400 "This endpoint requires a browser session..."` instead (see `EnsureSessionIsAvailable` middleware) rather than a confusing crash. The Postman collection sets these headers for you automatically via a pre-request script.

---

## Environment variables

`.env.example` is the reference; the notable ones beyond Laravel's defaults:

| Variable | Purpose |
|---|---|
| `FRONTEND_URL`, `FRONTEND_URLS` | The Next.js app's origin — used for CORS, Sanctum's stateful-domain check, and links generated in emails (e.g. the password-reset link). |
| `SANCTUM_STATEFUL_DOMAINS` | Host:port pairs allowed to establish a cookie session — see [Authentication](#authentication). |
| `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET` | Ship as placeholders (`*_placeholder`). Checkout works end-to-end up to the payment-gateway call, then fails cleanly with a 422 until real Stripe **test-mode** keys are set — that's the intended fallback behaviour, not a bug. |
| `SMS_PROVIDER` | `log` (default) writes SMS sends to the log instead of a real provider — see "Swappable integrations" under [Architecture notes](#architecture-notes). |
| `VAT_RATE` | UK VAT rate used at checkout (`config/commerce.php`), default `0.20`. |
| `AWS_*`, `AWS_ENDPOINT` | Credentials for the `s3` filesystem disk — used only by `db:backup` (below) to push to DigitalOcean Spaces. Not used for product images, which are stored on the local `public` disk. |
| `DB_CONNECTION` | `sqlite` locally (zero-config, what `.env.example` ships), `pgsql` in Docker/production — see `docker-compose.yml` at the repo root. Migrations are written to be portable between both. |

---

## Architecture notes

A few decisions worth knowing before you extend this:

- **Money is always an integer in pence.** Every `*_pence` column and field is deliberately not a float, to avoid floating-point rounding bugs in totals. Convert to pounds only at the display layer.
- **VAT-inclusive pricing.** `products.price_pence` is the VAT-inclusive price shown to the customer (standard UK retail practice). `VatCalculator::vatPenceFromInclusive()` backs the VAT portion out of a total for the itemised checkout breakdown (FR-8/FR-13) — it doesn't add VAT on top of a price.
- **Stock is reserved atomically at checkout, not at payment confirmation.** `CheckoutController::store()` decrements stock inside the DB transaction that creates the order, using a single conditional `UPDATE ... WHERE stock_quantity >= ? AND is_active = 1` rather than a separate check-then-decrement — this closes a real race condition where two concurrent checkouts could both pass a naive stock check and oversell. If the payment-gateway call then fails, or the Stripe webhook later reports `payment_intent.payment_failed`, stock is released back automatically.
- **Order status lifecycle:** `pending_payment` → `placed` (set by the Stripe webhook, not the checkout request itself) → `processing` → `shipped` → `delivered`, or `cancelled` at any point. Admins can move an order to any status via `PATCH /api/admin/orders/{order}/status` (no strict state-machine enforcement, so mistakes are correctable) — `pending_payment` itself is not an admin-settable target. Cancelling a paid order automatically restocks its items and frees its discount code. `POST /api/admin/orders/{order}/refund` refunds the full payment through the gateway first (422 if there's no succeeded payment, 502 if Stripe fails — the order is left untouched), then restocks and cancels. `GET /api/admin/orders` also takes `?search=` (order number, customer name/email).
- **Swappable integrations** — three third-party dependencies the PRD (§9) explicitly left unresolved at build time are behind small interfaces in `app/Contracts/`, bound in `AppServiceProvider`, so wiring up a real provider later is a rebind, not a rewrite:
  - `PaymentGateway` → `StripePaymentGateway` (the one that's real — Stripe was the client's confirmed choice)
  - `ShippingProvider` → `LogShippingProvider` (stands in for the multi-courier aggregator from PRD §7.4; logs instead of calling a real API)
  - `SmsProvider` → `LogSmsProvider` (stands in for a real SMS provider; email notifications are real, via Laravel's own Mail, `log` driver locally)
- **Off-server backups (NFR-7).** `php artisan db:backup` dumps the database (`pg_dump` in production, a plain file copy for local SQLite) and uploads it gzipped to the `s3` disk, pruning anything older than `--retention-days` (default 30). Scheduled daily in `routes/console.php`.
- **Discount codes** are always stored and matched uppercase (`SAVE10` and `save10` are the same code), and admin deactivation (`DELETE /api/admin/discount-codes/{id}`) never hard-deletes — it flips `is_active` so usage history for reporting survives.
- **Sales are priced in one place** — `App\Services\SalePricing`. A sale (`sales` table) lowers the price of what it covers while it's live. Scope is `applies_to` = `all` (whole shop) or `selected` — any mix of categories ("lines", including their subcategories), brands and individual products (`sale_category`, `sale_brand`, `sale_product`); a selected sale with nothing chosen yet is a valid draft and changes no prices. **It switches on and off manually by default**: `is_active` is the switch (`POST /api/admin/sales/{id}/activate`, `DELETE …/{id}` to deactivate), and a sale with no dates and no weekdays is live exactly while it's active — that's how Christmas / Ileya / Black Friday work. Optionally it can also run between `starts_at`/`ends_at`, or on ISO `active_weekdays` (a "Monday deal"). Listings, the product page, cart, checkout and order lines all ask `ProductVariant::quote()`, so they can't disagree, and checkout stores `original_unit_price_pence` + `sale_id` on each order line so analytics knows what a sale earned and cost. Rules worth knowing: the best price wins (sales never stack); a category sale covers its subcategories; percentage maths is integer, rounded half-up (`Sale::priceFor()`); a discount code applies on top of the sale price; deleting a sale (`DELETE /api/admin/sales/{id}`) only deactivates it so past campaigns keep their name in reports. Public: `GET /api/sales/active`. Admin: `apiResource /api/admin/sales`.
- **Brands** — `brands` table + optional `products.brand_id` (deleting a brand un-brands its products at the DB level, but the API refuses to delete one that still has products — 409 — so the admin can hide it instead with `is_active`). Public: `GET /api/brands` (live brands with something to buy, with `products_count`) and `GET /api/brands/{slug}`. Admin: `apiResource /api/admin/brands`, `POST/DELETE /api/admin/brands/{id}/logo` (image upload to the `public` disk). A product's `brand` is only shown while its brand is active. The slug is set from the name at creation and stays put when the brand is renamed.
- **Promo codes** are either a percentage (`value` = percentage points, max 100) or a fixed amount (`value` = pence, never taking more than the subtotal off); they apply on top of any sale price.
- **Product filtering** — `GET /api/products` accepts `category` (includes subcategories), `brand` (comma-separated slugs), `search` (case-insensitive), `size` / `colour` (comma-separated; one variant must match all of them), `in_stock`, `on_sale`, `min_price` / `max_price` (pence) and `sort` = `latest | price_asc | price_desc | best_selling | discount`. Price filters and price sorting work on the **sale** price via the same SQL expression `SalePricing::effectivePriceSql()` builds (kept identical to the PHP maths; portable across SQLite and Postgres). `GET /api/products/filters` returns the options for the current category/brand/search: sorted sizes and colours, the price range, the on-sale count and per-category and per-brand counts (each facet is counted without its own filter, so choosing one doesn't hide the others).
- **Analytics** — `GET /api/admin/analytics?range=7d|30d|90d|12m|ytd|custom[&from=&to=]` (built by `App\Services\AnalyticsReport`) compares the period with the equal-length one before it and returns KPIs, a zero-filled time series (day/week/month buckets as the range grows), top products, revenue by top-level category, weekday breakdown, order-status counts, money breakdown, and sale / discount-code performance. Only paid orders count as sales. "Days" are shop days in `SHOP_TIMEZONE` (default `Europe/London`), not UTC. `GET /api/admin/analytics/export` streams the same period's paid orders as CSV (customer-supplied text is neutralised against spreadsheet formula injection).
- **Category deletion is blocked, not cascading**, when the category (or a subcategory) still has products in it — `products.category_id` cascades on delete at the schema level, so without this guard deleting a category would silently wipe every product in it.
- **Product deletion is blocked (409), not cascading**, once any of its variants has ever appeared on an order — `product_variants` cascades on delete and `order_items.product_variant_id` is `nullOnDelete`, so an unguarded delete wouldn't corrupt the order (it snapshots name/sku/price separately) but would silently drop the order line's product photo. The guard's message points the admin at deactivating (`is_active`) instead.
- **Admin notifications** (`App\Http\Controllers\Api\Admin\NotificationController`) are computed on read, not stored — new paid orders, low/out-of-stock variants, checkouts stuck on `pending_payment` for 2+ hours, and live sales ending within a day. "Unread" is a single per-admin cursor (`users.notifications_read_at`), not a flag per row: `POST /api/admin/notifications/read` sets it to now, and anything created after that instant is unread again on the next poll. A sale ending soon is shown but never counts toward `unread_count` — it's a standing heads-up, not a discrete event.
- **Admin inventory** (`Admin\InventoryController`, `Admin\ProductVariantController::restock`) — `GET /api/admin/inventory[?status=attention|out|low|all&search=&per_page=]` lists variants most-urgent first (paginated, with true `counts` for the filter chips; `search` matches product name or SKU). `POST /api/admin/variants/{variant}/restock` with `{quantity}` (1–100000) **adds** to the current stock atomically rather than setting it, so orders placed since the page loaded aren't overwritten; restocking a sold-out variant fires the back-in-stock emails. The dashboard's `low_stock`/`out_of_stock` lists are capped at the 20 most urgent, with `low_stock_count`/`out_of_stock_count` as the true totals.
- **Admin customers** (`App\Http\Controllers\Api\Admin\CustomerController`) — `GET /api/admin/customers[?search=]`, `GET .../export[?search=]` (CSV, formula-injection-safe via `SafeCsv`), `GET .../{id}` (with addresses), `GET .../{id}/orders` (paid and unpaid, unlike the dashboard/analytics figures), `POST .../{id}/message` (a one-off email via `App\Mail\AdminMessageMail`, not an order-status notification — no SMS, no order required). Every endpoint 404s for an admin `id`; only `role: customer` accounts are visible or messageable here.

---

## Known limitations / intentionally deferred

Documented rather than silently missing:

- **Catalogue search (`?search=`) is a plain SQL `LIKE` match** on name/description — fine at the current catalogue size, but doesn't rank by relevance or handle typos/partial words. If the catalogue grows enough for that to matter, Postgres full-text search (`tsvector`) is the natural next step since production already runs on Postgres.
- **Real shipping-courier and SMS integrations** are logging stand-ins (see above) pending the client actually contracting a provider (PRD §9) — the code path is real and tested, only the outbound call is stubbed.
- **Apple Pay / Google Pay** activate automatically via Stripe's Payment Element once enabled in the Stripe Dashboard for a verified domain — no backend code change needed, but also nothing to demo until that's configured. Apple Pay additionally requires the domain to be served over HTTPS (see below), which the production droplet doesn't have yet.
- **Multi-currency and international shipping** are architected for (a `currency` column exists on `orders`/`payments`, shipping/tax logic is isolated in dedicated services) but not activated — GBP/UK-only is the confirmed Phase 1 scope (PRD §1.2, §8).
- **TLS termination (NFR-1)** isn't set up yet — the production droplet itself is still stubbed (see `deploy.yml`), so there's no domain/cert to configure `nginx` with. The app-side half is done: `bootstrap/app.php` trusts the nginx sidecar's `X-Forwarded-*` headers, `AppServiceProvider` forces `https://` URL generation in production, and `docker/nginx/default.conf` forwards `X-Forwarded-Proto` to PHP-FPM. What's left, once the droplet exists, is purely infra: get a cert (e.g. Let's Encrypt/certbot) for the real domain, add a `listen 443 ssl` server block to `docker/nginx/default.conf`, redirect `:80` → `:443`, and set `SESSION_SECURE_COOKIE=true` in the production `.env`.

---

## Project structure highlights

```text
app/
  Contracts/        Swappable third-party interfaces (payment/shipping/SMS)
  Services/         VatCalculator, OrderNotifier, and the interface implementations above
  Http/Controllers/Api/          Public + customer-authenticated endpoints
  Http/Controllers/Api/Admin/    Admin-only endpoints (role=admin)
  Console/Commands/BackupDatabase.php
database/
  migrations/        Full schema — see individual files for column-level detail
  seeders/           CategorySeeder, ProductSeeder, DatabaseSeeder (demo accounts + discount code)
tests/
  Feature/           One file per concern — Auth, Cart, Checkout, AdminOrderManagement,
                     AdminAuthorization, StripeWebhook, PasswordReset, BackupDatabase,
                     StatefulSessionGuard, ProductCatalog
  Support/           FakePaymentGateway, CarriesSessionCookies (test helpers)
postman/             API collection + two environments (local / Docker)
```
