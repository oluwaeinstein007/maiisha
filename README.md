# MAI_ISHA Fashion & Beauty Sphere

E-commerce web app for MAI_ISHA — see [docs/PRD.md](docs/PRD.md) for full product requirements.

## Structure

- [`backend/`](backend) — Laravel 13 API (auth, catalogue, cart, checkout, orders, admin) — see [backend/README.md](backend/README.md)
- [`frontend/`](frontend) — Next.js storefront + admin dashboard — see [frontend/README.md](frontend/README.md)
- [`docker/`](docker) — nginx config used to run the stack in containers
- [`docs/`](docs) — PRD, proposal, statement of work

## Running locally with Docker Compose

```sh
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# generate a Laravel app key before first run
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
# paste the output into backend/.env as APP_KEY=

docker compose up --build
docker compose exec backend php artisan migrate
```

The app is then reachable at `http://localhost:8080` (nginx routes `/api`, `/up`, and `/storage` to the backend; everything else to the Next.js frontend). Postgres is not published to the host, per PRD §7.2.

Storefront: `http://localhost:8080/` — Admin dashboard: `http://localhost:8080/admin`

To seed demo data (categories, products, a discount code, an admin + demo customer account, 10 realistic customers with addresses, and a spread of orders across the order lifecycle): the backend image is built with `composer install --no-dev`, so `fakerphp/faker` (used by `UserFactory`) isn't in it by default. Rebuild with the dev override first, which installs dev dependencies for `backend`/`queue`/`scheduler`:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
docker compose exec backend php artisan db:seed
```

| Role     | Email                   | Password   |
|----------|-------------------------|------------|
| Admin    | `admin@maiisha.test`    | `password` |
| Customer | `customer@maiisha.test` | `password` |

(Seeded customers in `CustomerSeeder` also use `password` — see that file for their emails.)

### Switching between the plain and dev-override builds

`docker-compose.yml` and `docker-compose.dev.yml` build the backend/queue/scheduler images to distinct tags (`:latest` vs `:dev`) specifically so that switching between them — e.g. running a plain `docker compose up --build` after having used the dev override, or vice versa — can't silently overwrite the other variant's image. If you're running several `docker compose build`/`up --build` invocations against this repo at once (e.g. multiple terminals, or automation), pipe them through `scripts/docker-compose.sh` instead of calling `docker compose` directly — it's a drop-in wrapper that serializes them with a file lock so two concurrent builds can't interleave:

```sh
scripts/docker-compose.sh -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

## Running locally without Docker

Follow [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) to run each app with `composer dev` / `pnpm dev` directly — this is faster for day-to-day development than rebuilding containers. In short:

```sh
# backend — http://localhost:8000
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# frontend — http://localhost:3000
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

## Testing

**Backend** (PHPUnit, SQLite in-memory — no database setup needed):

```sh
cd backend
php artisan test              # run the suite
vendor/bin/pint --test        # check code style (vendor/bin/pint to auto-fix)
```

Note: `docker compose exec backend php artisan test` won't work — the backend image is built with `composer install --no-dev`, so PHPUnit isn't installed in it. Run tests on the host as above instead.

**Frontend** (ESLint + production build):

```sh
cd frontend
pnpm lint
pnpm build
```

Both run automatically in CI (see below) on every push/PR — `backend-ci.yml` and `frontend-ci.yml` under [.github/workflows/](.github/workflows) are the source of truth for exact commands and versions.

## CI/CD

GitHub Actions (`.github/workflows/`):

- `backend-ci.yml` — Pint + PHPUnit on every push/PR touching `backend/**`
- `frontend-ci.yml` — ESLint + build on every push/PR touching `frontend/**`
- `deploy.yml` — manual (`workflow_dispatch`) SSH deploy to the production droplet; stubbed until the DigitalOcean droplet exists and `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` secrets are configured (PRD §7.2)
