# MAI_ISHA — Frontend

Customer storefront and admin dashboard for **MAI_ISHA Fashion & Beauty Sphere**, a UK fashion and beauty e-commerce brand. Built with Next.js against the Laravel API in [`../backend`](../backend). Product scope lives in [`../docs/PRD.md`](../docs/PRD.md).

## Features

### Storefront

- Home, category browsing (with nested subcategories, filters, sort), full-text search
- Product detail with size/colour variant selection and live stock status
- Persistent cart — works for guests, merges into the account on login/register
- Checkout: address book, discount codes, itemised UK VAT, Stripe Elements payment
- Customer accounts: registration, login, password reset, order history with status tracking, saved addresses

### Admin dashboard

- Sales overview with low-stock and out-of-stock alerts
- Product management: details, variants (size/colour/price/stock), image upload
- Category management (nested)
- Order management with status updates
- Discount code management

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
  lib/                 api client, money/date formatting, shared types
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

### Money, status, images

- All prices are integer pence (`*_pence` fields), GBP only — see `src/lib/money.ts` for formatting.
- Order status labels/colours/flow live in `src/lib/orderStatus.ts`.
- `next.config.ts` whitelists `NEXT_PUBLIC_API_URL`'s host (real product photos) and `picsum.photos` (seed/demo placeholders) for `next/image`. Add any new image host there.

## Deployment

A multi-stage `Dockerfile` builds a standalone production image (`output: "standalone"` in `next.config.ts`); see the repo root for Docker Compose and CI/CD.

## Known gaps

- Search matches on the backend's `search` query param (name/description); there's no relevance ranking, typo tolerance, or autocomplete yet.
- Stripe and SMS are wired end-to-end but the backend's `.env` ships with placeholder keys — real payments/notifications need real provider credentials before going live.
