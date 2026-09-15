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
| Discount code | `WELCOME10` — 10% off, no usage limit |
| Categories | The 9 PRD §3 categories, several with subcategories |
| Products | ~14 products across those categories, each with 1+ variants (size/colour), realistic stock levels including a couple of deliberately low-stock variants |
| Customers | 10 realistic UK customers (`CustomerSeeder`), each with a default delivery address |
| Orders | 8 realistic orders (`OrderSeeder`) spanning the full lifecycle — placed, processing, shipped, delivered, and one cancelled — with matching payments and shipments, so the admin dashboard/orders screens have real-looking data to show without placing any orders yourself first |

Re-running `php artisan migrate:fresh --seed` is always safe in development — it drops and rebuilds everything from scratch.

---

## Testing the API

Two ways, pick whichever fits:

- **`php artisan test`** — the real test suite (52 tests): auth, cart, checkout math and rollback behaviour, admin authorization, Stripe webhook handling, rate limiting, etc. This is what CI runs.
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
- **Order status lifecycle:** `pending_payment` → `placed` (set by the Stripe webhook, not the checkout request itself) → `processing` → `shipped` → `delivered`, or `cancelled` at any point. Admins can move an order to any status via `PATCH /api/admin/orders/{order}/status` (no strict state-machine enforcement, so mistakes are correctable) — `pending_payment` itself is not an admin-settable target. Cancelling a paid order automatically restocks its items.
- **Swappable integrations** — three third-party dependencies the PRD (§9) explicitly left unresolved at build time are behind small interfaces in `app/Contracts/`, bound in `AppServiceProvider`, so wiring up a real provider later is a rebind, not a rewrite:
  - `PaymentGateway` → `StripePaymentGateway` (the one that's real — Stripe was the client's confirmed choice)
  - `ShippingProvider` → `LogShippingProvider` (stands in for the multi-courier aggregator from PRD §7.4; logs instead of calling a real API)
  - `SmsProvider` → `LogSmsProvider` (stands in for a real SMS provider; email notifications are real, via Laravel's own Mail, `log` driver locally)
- **Off-server backups (NFR-7).** `php artisan db:backup` dumps the database (`pg_dump` in production, a plain file copy for local SQLite) and uploads it gzipped to the `s3` disk, pruning anything older than `--retention-days` (default 30). Scheduled daily in `routes/console.php`.
- **Discount codes** are always stored and matched uppercase (`SAVE10` and `save10` are the same code), and admin deactivation (`DELETE /api/admin/discount-codes/{id}`) never hard-deletes — it flips `is_active` so usage history for reporting survives.
- **Category deletion is blocked, not cascading**, when the category (or a subcategory) still has products in it — `products.category_id` cascades on delete at the schema level, so without this guard deleting a category would silently wipe every product in it.

---

## Known limitations / intentionally deferred

Documented rather than silently missing:

- **Catalogue search (`?search=`) is a plain SQL `LIKE` match** on name/description — fine at the current catalogue size, but doesn't rank by relevance or handle typos/partial words. If the catalogue grows enough for that to matter, Postgres full-text search (`tsvector`) is the natural next step since production already runs on Postgres.
- **Real shipping-courier and SMS integrations** are logging stand-ins (see above) pending the client actually contracting a provider (PRD §9) — the code path is real and tested, only the outbound call is stubbed.
- **Apple Pay / Google Pay** activate automatically via Stripe's Payment Element once enabled in the Stripe Dashboard for a verified domain — no backend code change needed, but also nothing to demo until that's configured.
- **Multi-currency and international shipping** are architected for (a `currency` column exists on `orders`/`payments`, shipping/tax logic is isolated in dedicated services) but not activated — GBP/UK-only is the confirmed Phase 1 scope (PRD §1.2, §8).

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
