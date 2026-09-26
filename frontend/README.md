# MAI_ISHA — Frontend

Customer storefront and admin dashboard for **MAI_ISHA Fashion & Beauty Sphere**, a UK fashion and beauty e-commerce brand. Built with Next.js against the Laravel API in [`../backend`](../backend). Product scope lives in [`../docs/PRD.md`](../docs/PRD.md).

## Features

### Storefront

- Home, category browsing (nested subcategories), full-text search — with a rebuilt filter experience: size/colour multi-select with swatches, price bands + range, in-stock / on-sale toggles, sort, removable filter chips, and a phone bottom-sheet with a live "Show N results" count. The URL is the only state, so any filtered view can be shared and Back works
- Sales: an announcement banner while a sale is live, a `/sale` page, sale badges and struck-through prices, and the saving shown in the cart and checkout
- Brands: a `/brands` page, a page per brand (`/brand/[slug]`), a Brand filter, and the brand shown on products
- Product detail with size/colour variant selection and live stock status
- Persistent cart — works for guests, merges into the account on login/register
- Checkout: address book, discount codes, itemised UK VAT, Stripe Elements payment
- Customer accounts: registration, login, password reset, order history with status tracking, saved addresses

### Admin dashboard

- Dashboard: revenue, orders and average order value against the previous period, revenue chart, sales running now, low-stock / out-of-stock / awaiting-payment alerts — every row (recent orders, low stock, sales) is a full clickable link through to the thing it names
- A notification bell (`/admin/notifications`, polled every 30s): new paid orders, low/out-of-stock variants, checkouts stuck on pending payment for 2+ hours, and sales ending within a day. Opening it clears the unread badge; items stay listed either way
- Customers (`/admin/customers`): search, paid order count and total spent per customer; a detail page with their orders, addresses, and a form to email them directly (not an order-status notification — a one-off message, e.g. "checking your order arrived OK")
- Analytics (`/admin/analytics`): range presets or custom dates, KPI tiles, revenue over time, top products, revenue by category, best weekdays, orders by status, where the money went, sale and discount-code performance, CSV export. Every chart has a table view
- Sales management (`/admin/sales`): create a sale as a draft, choose what it covers (whole shop, or any mix of lines, brands and products), add items later, then **Activate** / **Deactivate** it. Manual by default (Christmas, Ileya, Black Friday); "Between dates" and "Weekly" are optional. Live price preview
- Brands (`/admin/brands`): create/edit/show-hide/delete brands with a logo upload; assign a brand on the product form
- Discount codes: percentage or fixed £ amount, with a live "on a £60 basket" preview
- Product management: details, variants (size/colour/price/stock), image upload, and delete — blocked (409) for a product with order history, so a founder is pointed at "deactivate" instead of losing the record behind past orders
- Category management (nested)
- Order management: list with a "View" action per row, status updates with the customer notified by email/SMS

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 — black & gold brand theme (`src/app/globals.css`) |
| Data fetching | [SWR](https://swr.vercel.app/) |
| Payments | [Stripe Elements](https://stripe.com/docs/payments/elements) (`@stripe/react-stripe-js`) |
| Auth | Laravel Sanctum — **cookie-session (SPA) auth**, not bearer tokens |
| Package manager | pnpm |

## Prerequisites

- Node.js 20.9+
- pnpm 10+
- The backend running locally (see [`../backend/README.md`](../backend/README.md)) — this app doesn't do anything useful without it

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Must run on port 3000.** The backend's `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URL(S)` are configured for `localhost:3000`/`127.0.0.1:3000` specifically — Sanctum only enables session/CSRF middleware for origins it recognises, so running this app on a different port makes every authenticated request fail (see [Gotchas](#gotcha-laravels-automatic-resource-wrapping) below for the related response-shape trap, and the note on origin-checking in [Auth](#auth)).

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Laravel API base URL (`http://localhost:8000` in dev) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for the Payment Element |

### Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve a production build |
| `pnpm lint` | ESLint |

## Project structure

```text
src/
  app/
    (storefront)/     customer-facing pages — shares SiteHeader/SiteFooter
    admin/login/       admin sign-in (outside the guarded group below)
    admin/(dashboard)/ everything else under /admin, behind RequireAuth admin
  components/          organised by domain (product, checkout, admin, account, ui…)
  context/             AuthContext, CartContext — app-wide client state
  lib/                 api client, money/date formatting, shared types; productFilters.ts (URL ⇄ filter state)
```

## Architecture notes

### Auth

`AuthContext` (`src/context/AuthContext.tsx`) fetches `/api/user` via SWR and exposes `login`/`register`/`logout`/`refresh`. `RequireAuth` (`src/components/auth/RequireAuth.tsx`) is a client-side guard used at the top of `account/layout.tsx` and `admin/(dashboard)/layout.tsx` — pass `admin` to also gate on `role === "admin"`.

There's no Next.js middleware doing route protection: the session cookie is httpOnly and opaque to client JS, and Sanctum only turns on session handling for requests whose `Origin`/`Referer` matches `SANCTUM_STATEFUL_DOMAINS` — a plain edge-middleware cookie check can't replicate that, so guards run client-side after an `/api/user` call instead.

Sanctum SPA flow (`src/lib/api.ts`): before any non-GET request, `ensureCsrfCookie()` hits `GET /sanctum/csrf-cookie` once (cached as a module-level promise), then the `XSRF-TOKEN` cookie is read and sent back as an `X-XSRF-TOKEN` header on the actual request. Every request uses `credentials: "include"`.

### Gotcha: Laravel's automatic resource wrapping

A lone `JsonResource`/`ResourceCollection` returned directly from a Laravel controller gets auto-wrapped as `{"data": ...}` — but a **paginated** resource collection puts `data` *alongside* `meta`/`links`, and a hand-built `response()->json([...])` isn't wrapped at all. All three shapes exist in this API, so `src/lib/api.ts` exposes two families of helpers:

- `api.get/post/put/patch/delete` — raw response body. Use for paginated list endpoints (shape already matches `PaginatedResponse<T>`) and for plain `response()->json(...)` endpoints (login, checkout preview, admin dashboard).
- `apiResource.get/post/put/patch/delete` (and `swrFetcherResource` for SWR) — unwraps `.data` automatically. Use for single-resource endpoints (`/api/products/{slug}`, `/api/admin/products/{id}`, a single address, etc.) and non-paginated collections (`/api/categories`, `/api/addresses`).

This isn't fully uniform across the API — e.g. `/api/admin/discount-codes` returns a plain array (no wrapping) where most other collection endpoints wrap in `data`. **Don't assume — curl the endpoint and check its top-level keys before wiring up a new one.**

### Admin write payloads

A few field names on the admin API aren't what you'd guess from the read-side resources — notably variants take `price_override_pence` (not `price_pence`), and a discount code's `value` is pence for `type: "fixed"` but raw percentage points for `type: "percentage"`. See the admin form components under `src/components/admin/` for the exact shapes in use.

### Auth guard

`RequireAuth admin` never redirects a signed-in non-admin silently — it shows an "Admin access only" page naming the account, with "Sign in as an admin" (signs out, then goes to `/admin/login`). `LoginForm adminOnly` (the admin sign-in page) signs out and refuses a customer account instead of sending it into `/admin` to be bounced.

### Images from a local backend

`lib/image.ts` `isUnoptimizedImage` loads images hosted on localhost/private addresses directly in the browser. Next's image optimizer refuses private IPs (SSRF protection), and from inside the Docker frontend container `localhost` isn't the backend — so without this every uploaded product photo and brand logo is a broken image on a dev machine. Public production hosts still go through the optimizer.

### Product filters

`lib/productFilters.ts` is the single place that converts between the URL and filter state; the server page (which fetches) and the client filter UI (which edits) both use it. `components/product/listing/` holds `ListingShell` (sidebar / toolbar / chips, updating the URL with `router.replace` inside a transition so the old results dim instead of vanishing), `FilterSections` (shared by the desktop sidebar and the mobile sheet), and `FilterSheet`. Adding a new filter = a param in `lib/productFilters.ts`, a section in `FilterSections`, and support in the backend `ProductController`.

### Charts

The analytics charts are hand-rolled SVG/HTML in `components/admin/charts/` (no charting dependency). Colours are CSS variables on `.viz` in `globals.css`, chosen and validated per the dataviz method (the accent `#a8842a` is the lightest brand-gold that clears 3:1 on white; brand gold `#c8a24a` is only 2.4:1). Every chart has a table view, and tooltips also work from the keyboard.

### Money, status, images

- All prices are integer pence (`*_pence` fields), GBP only — see `src/lib/money.ts` for formatting.
- Order status labels/colours/flow live in `src/lib/orderStatus.ts`.
- `next.config.ts` whitelists `NEXT_PUBLIC_API_URL`'s host (real product photos) and `picsum.photos` (seed/demo placeholders) for `next/image`. Add any new image host there.

## Deployment

A multi-stage `Dockerfile` builds a standalone production image (`output: "standalone"` in `next.config.ts`); see the repo root for Docker Compose and CI/CD.

## Known gaps

- Search matches on the backend's `search` query param (name/description); there's no relevance ranking, typo tolerance, or autocomplete yet.
- Stripe and SMS are wired end-to-end but the backend's `.env` ships with placeholder keys — real payments/notifications need real provider credentials before going live.
