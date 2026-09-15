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

## Running locally without Docker

Follow [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) to run each app with `composer dev` / `pnpm dev` directly — this is faster for day-to-day development than rebuilding containers.

## CI/CD

GitHub Actions (`.github/workflows/`):

- `backend-ci.yml` — Pint + PHPUnit on every push/PR touching `backend/**`
- `frontend-ci.yml` — ESLint + build on every push/PR touching `frontend/**`
- `deploy.yml` — manual (`workflow_dispatch`) SSH deploy to the production droplet; stubbed until the DigitalOcean droplet exists and `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` secrets are configured (PRD §7.2)
