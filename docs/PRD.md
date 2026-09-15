# Product Requirements Document

**Product:** MAI_ISHA Fashion & Beauty Sphere — E-Commerce Web App
**Prepared by:** Lanre Sanni
**Prepared for:** Aishat Isha (Founder, MAI_ISHA)
**Date:** 14 September 2026
**Status:** Draft v1.0 — for client review

---

## 1. Overview

MAI_ISHA Fashion & Beauty Sphere is a UK-based fashion and beauty brand. The brand needs a full e-commerce web application — not a landing page — where customers can browse products, add items to a cart, and check out directly on the site. The experience should feel polished and premium, with categories clearly organised, and give the founder full control over products, orders, and stock through an admin dashboard.

> **Note on naming:** "Mai'sha" has been raised as a possible rename of the brand. This document uses **MAI_ISHA** throughout as the working name; all references should be updated if the rename is confirmed.

### 1.1 Goals

- Launch a credible, premium-feeling online store that reflects the brand's black-and-gold identity.
- Let customers self-serve end-to-end: browse → cart → checkout → track order — without needing to contact the brand.
- Give the founder a single dashboard to manage products, stock, orders, and discounts without developer involvement for day-to-day operations.
- Launch priced and built for the UK market (GBP, UK tax, UK couriers), but architected so international delivery and additional currencies can be switched on later without a rebuild.

### 1.2 Non-Goals (Phase 1)

- Native mobile apps (iOS/Android). This is a responsive web app, usable on mobile browsers.
- Multi-currency checkout (structure supports it; only GBP is enabled at launch).
- Marketplace/multi-vendor selling — MAI_ISHA is the only seller.
- Loyalty/rewards programs, subscriptions, or a blog/CMS beyond basic product content.

---

## 2. Users & Roles

| Role | Description |
|---|---|
| **Guest** | Can browse the catalogue, view product detail, and add to cart. Must register or log in to complete checkout. |
| **Customer** | Registered shopper. Can check out, view order history/tracking, save addresses, and apply discount codes. |
| **Admin (Founder)** | Full access to the admin dashboard: manage products, categories, stock, orders, discount codes, and view basic sales data. |

---

## 3. Information Architecture — Categories

Phase 1 launch categories (as supplied by the client):

1. Hair extensions & hair products
2. Women's fashion
3. Activewear
4. Islamic / modest wear
5. Beauty products
6. Accessories
7. Men's wear
8. Baby's wear
9. Shoes

Each category supports subcategories, filters (size, colour, price) and sort (price, newest, best-selling) — standard for the category, added as the product catalogue grows.

---

## 4. Functional Requirements

### 4.1 Storefront
- FR-1: Home page showcasing featured products, categories, and promotions, on-brand (black & gold).
- FR-2: Category and subcategory browsing with filtering and sorting.
- FR-3: Product detail page: images, description, price (GBP), size/variant selection, stock availability, add-to-cart.
- FR-4: Search across the catalogue.
- FR-5: Responsive layout — desktop, tablet, mobile.

### 4.2 Cart & Checkout
- FR-6: Persistent cart (survives page reload; tied to account when logged in).
- FR-7: Guest checkout must prompt account creation/login before payment (per client requirement that orders are placed by registered customers).
- FR-8: Checkout collects delivery address, applies discount codes, calculates UK VAT automatically, and shows a final itemised total before payment.
- FR-9: Order confirmation on-screen, plus email and SMS confirmation.

### 4.3 Payments
- FR-10: Secure payment processing supporting major debit/credit cards, Apple Pay, and Google Pay at launch.
- FR-11: Architecture supports adding PayPal and Klarna as additional payment methods post-launch without a checkout rebuild.
- FR-12: All payment handling is PCI DSS compliant via the chosen payment provider (see §7.3) — card details are never stored on MAI_ISHA's own servers.

### 4.4 Tax
- FR-13: The system calculates applicable UK VAT correctly at checkout based on product/order value, and displays it as a separate line item.

### 4.5 Customer Accounts
- FR-14: Registration, login, password reset.
- FR-15: Order history and order status per customer.
- FR-16: Saved delivery addresses.

### 4.6 Order Tracking & Notifications
- FR-17: Customers can view order status (e.g. Placed → Processing → Shipped → Delivered) in their account.
- FR-18: Automatic notifications are sent by **both email and SMS** at key order milestones (order placed, shipped, out for delivery/delivered), per client preference.
- FR-19: Shipping integrates with a multi-courier platform to generate labels/tracking, supporting **Royal Mail, DPD, Evri, and DHL** (see §7.4).

### 4.7 Discounts
- FR-20: Admin can create, edit, and deactivate discount codes (percentage or fixed amount, with optional expiry date and usage limits).
- FR-21: Customers can apply one discount code per order at checkout.

### 4.8 Stock & Inventory
- FR-22: Admin can set and adjust stock levels per product/variant.
- FR-23: Out-of-stock items are automatically hidden from purchase (shown as "out of stock", not removed from browsing) or hidden per admin preference.
- FR-24: Low-stock indicator in the admin dashboard.

### 4.9 Admin Dashboard
- FR-25: Manage products (create/edit/delete, images, pricing, variants, categories).
- FR-26: Manage orders (view, update status, view customer/delivery details).
- FR-27: Manage stock levels.
- FR-28: Manage discount codes.
- FR-29: Basic sales overview (orders, revenue) for the founder's own visibility.

---

## 5. Non-Functional Requirements

- **NFR-1 Security:** All traffic over HTTPS; payments handled by a PCI DSS–compliant processor; passwords hashed; standard protections against the OWASP Top 10 (injection, XSS, CSRF, etc.).
- **NFR-2 Performance:** Product and category pages should load quickly on mobile connections; images optimised/responsive.
- **NFR-3 Reliability:** Built to run with minimal ongoing intervention — no maintenance call expected unless a third-party provider (payment, courier, hosting) changes its API.
- **NFR-4 Scalability for internationalisation:** Currency, tax, and delivery logic are built as configurable modules so additional currencies and international shipping zones can be enabled later without re-architecting the app.
- **NFR-5 Accessibility:** Reasonable adherence to accessible design (colour contrast, alt text, keyboard navigation) despite the black & gold premium theme.
- **NFR-6 Browser support:** Latest versions of Chrome, Safari, Edge, Firefox, on desktop and mobile.
- **NFR-7 Data durability:** The production database is backed up daily to off-server object storage, independent of the application server, so a server failure or redeploy cannot result in data loss.

---

## 6. Design

- **Brand colours:** Black & Gold.
- **Tone:** Polished, premium, clearly organised — not cluttered.
- **Design ownership:** Lanre will design the UI/UX as part of the build (no separate product designer engaged at this stage). Client to confirm/share a logo file if one exists; otherwise initial launch may use a wordmark treatment of "MAI_ISHA" in the brand colours until a logo is finalised.

---

## 7. Technical Architecture & Integrations (Recommended)

### 7.1 Application Stack
- **Backend:** Laravel 13 (PHP 8.5), managed with **Composer 2.10** — a mature, well-supported framework with strong e-commerce building blocks (auth, queues, scheduling), suited to a store that will keep adding features over time.
- **Frontend:** Next.js, managed with **pnpm** — for a fast, SEO-friendly storefront.
- **Rationale:** this pairing suits a store that will keep growing (new categories, features, integrations) rather than a one-off build.

### 7.2 Hosting, Database & Backups
- **Server:** a DigitalOcean droplet (VPS), sized at **2GB+ RAM** so the web app, background queue worker (for emails/SMS/order processing), scheduler, and database can run together comfortably without relying on swap for normal operation.
- **HTTPS:** free, automated certificate via Certbot.
- **Deployment:** CI/CD pipeline so new updates deploy to the server automatically rather than manually.
- **Database:** PostgreSQL, self-hosted on the same server, configured to **only accept connections from the server itself** — never exposed to the public internet.
- **Backups:** automated **daily backups of the database to off-server object storage** (DigitalOcean Spaces), independent of the droplet. This is a hard requirement, not optional — a droplet's local disk (and therefore the database on it) is lost if the droplet is deleted without a backup, so day-one automated backups are how that risk is closed.
- **Migration/portability:** because the database is a standard, self-hosted PostgreSQL instance, it can be exported and migrated to another host at any time via standard database export tools (`pg_dump`) — there's no vendor lock-in.
- **Recurring cost:** indicative server cost of **~$12–18/month** (billed directly to the client's own card on file with the provider, no developer markup), plus a small, low-cost allowance for backup storage.

### 7.3 Payments
Recommendation: a PCI DSS–compliant processor with strong UK support for cards, Apple Pay and Google Pay at launch, with PayPal and Klarna addable later (e.g. Stripe, or equivalent) — final choice confirmed before build starts. Note: standard card-processing fees are charged by the processor per transaction and are a pass-through cost to MAI_ISHA, not a fee charged by the developer.

### 7.4 Delivery / Shipping
Recommendation: a shipping aggregator/platform that connects to multiple couriers from one integration, covering **Royal Mail, DPD, Evri, and DHL**, so MAI_ISHA isn't locked into a single courier and can compare rates per order.

### 7.5 Notifications
Email (transactional email provider) and SMS (transactional SMS provider) integrations for order confirmations, shipping updates, and account notifications.

---

## 8. Future Roadmap (Phase 2+, not in current scope/pricing)

- Additional currencies and international delivery zones (architecture supports this at launch; activation is a Phase 2 exercise).
- Additional payment methods: PayPal, Klarna.
- Secondary brand direction / product line expansion within 3–5 years (client is still researching this — to be scoped once defined).
- Possible brand rename to "Mai'sha" (pending client decision) — would require asset/copy updates across the site.

---

## 9. Assumptions & Open Items

- Final payment processor and shipping platform to be confirmed with the client before integration begins (client has no fixed preference; recommendations above are subject to final sign-off).
- Client will provide product content (photos, descriptions, pricing, initial stock counts) ahead of catalogue build-out.
- Logo: not yet supplied — brand colours (black & gold) confirmed. Wordmark fallback to be used if no logo is provided by design phase.
- A recurring **service/transaction fee** (beyond standard payment-processor fees) was raised in discussion but not finalised — to be confirmed before contract signing.
- Maintenance rate after the free 3-month post-launch period is not yet fixed and will be quoted based on actual request volume/complexity once the site is live.
- Server sizing (§7.2) starts at 2GB+ RAM based on running app, queue, scheduler and database together; this will be reviewed and scaled up if order/traffic volume grows.

---

## 10. Glossary

- **PCI DSS** — Payment Card Industry Data Security Standard, the security standard payment processors must meet to handle card data.
- **VAT** — Value Added Tax, the UK sales tax applied at checkout.
- **SKU** — Stock Keeping Unit, a unique identifier per product variant.
- **VPS** — Virtual Private Server, a dedicated cloud server (here, a DigitalOcean droplet) the app and database run on.
- **CI/CD** — Continuous Integration/Continuous Deployment, an automated pipeline that deploys code changes to the server without manual steps.
