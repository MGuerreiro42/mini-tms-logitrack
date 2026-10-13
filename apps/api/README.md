# Mini TMS — API

Backend of [Mini TMS](../../README.md), in NestJS. Full architecture-decision reasoning in [`DESIGN.md`](../../DESIGN.md) at the repo root — this README only covers what's specific to this app.

## Stack

- NestJS 11
- PostgreSQL via Prisma 7, with a driver adapter (`@prisma/adapter-pg`)
- Redis — Socket.io pub/sub adapter and rate-limit counters
- Socket.io — authenticated tracking gateway plus an unauthenticated `/public` namespace

## Running

```bash
# infra (at the repo root)
docker compose up -d

# here — postinstall runs `prisma generate`, prestart:dev runs `prisma migrate deploy`
pnpm install
pnpm start:dev   # http://localhost:3333
```

Changing `schema.prisma` and generating a new migration remains manual, on purpose: `pnpm exec prisma migrate dev --name <name>`.

## Structure

```
src/
├── modules/
│   ├── auth/            # implemented — Passport + JWT + bcrypt (see DESIGN.md § 11)
│   ├── sellers/         # signup + admin approval + own-modality config (see DESIGN.md § 12)
│   ├── carriers/        # signup + admin approval + own-modality/coverage config (see DESIGN.md § 13); invites/ still a skeleton
│   ├── modalities/      # DeliveryModality catalog read endpoint (seeded, no CRUD)
│   ├── shipments/       # creation, cancel, carrier queue, analytics (see DESIGN.md § 14–16)
│   ├── tracking/        # Socket.io gateways + event listener (see DESIGN.md § 15)
│   ├── health/          # GET /health — Postgres + Redis (terminus)
│   └── notifications/   # skeleton — will become BullMQ workers
├── shared/
│   ├── prisma/          # PrismaModule + PrismaService — @Global()
│   ├── password/        # PasswordService (bcrypt hash/compare) — @Global()
│   ├── redis/           # shared ioredis client — @Global()
│   ├── throttling/      # ThrottlerModule (Redis storage) + @RateLimit()
│   └── websocket/       # RedisIoAdapter
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma     # 11 models — see DESIGN.md § 10
├── seed.ts           # admin + modality catalog; demo data only with SEED_DEMO=true
└── migrations/       # versioned in git, applied via `prisma migrate deploy`
```

Grouped by domain, not by technical layer — same philosophy as the frontend (`DESIGN.md` § 9). `notifications/` and `carriers/invites/` are the only skeletons left.

## Demo seed

`pnpm exec prisma db seed` is idempotent and always upserts the admin and the modality catalog. Demo data is opt-in, since the demo password is public:

```bash
SEED_DEMO=true pnpm exec prisma db seed
```

That also upserts the demo accounts (password `demo12345`) and creates any of the 40 demo shipments (`TMS-DE0000000001`–`040`) that don't exist yet.

| Account | Role |
|---|---|
| `seller@demo.minitms.dev`, `seller2@demo.minitms.dev` | approved sellers |
| `carrier@demo.minitms.dev` | manager of Transportadora Demo |
| `operator1@demo.minitms.dev`, `operator2@demo.minitms.dev` | operators |

- Shipment dates are relative to the **first** run (spread over the previous ~30 days) and never move afterwards. To refresh them, delete the `TMS-DE…` shipments and their events, then seed again.
- Existing rows are never updated: changing `ADMIN_PASSWORD` later does not rotate an already-seeded admin.
- With `NODE_ENV=production`, the seed refuses to run without `ADMIN_PASSWORD`.

## Testing login

```bash
pnpm exec prisma db seed   # creates admin@minitms.dev / admin12345 (or ADMIN_EMAIL/ADMIN_PASSWORD)

curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@minitms.dev","password":"admin12345"}'

curl http://localhost:3333/auth/me -H "Authorization: Bearer <accessToken>"
```

## Testing seller self-signup

```bash
curl -X POST http://localhost:3333/sellers \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","password":"password12345","companyName":"Example Store LLC","document":"12345678000199"}'
```

Creates a `User` (role `SELLER`) + `Seller` (`status: PENDING`) in one transaction. A duplicate email/document returns 409.

## Testing admin approval

Requires an admin token (see login above) — these are `@Roles(GlobalRole.ADMIN)`-guarded, a non-admin token gets 403, no token gets 401. `GET /sellers` is paginated (`?page=`/`?limit=`, default 20, capped at 100) — see § "Pagination and filtering" below.

```bash
curl http://localhost:3333/sellers -H "Authorization: Bearer <adminAccessToken>"
curl "http://localhost:3333/sellers?status=PENDING" -H "Authorization: Bearer <adminAccessToken>"
curl http://localhost:3333/sellers/<id> -H "Authorization: Bearer <adminAccessToken>"
curl -X PATCH http://localhost:3333/sellers/<id>/approve -H "Authorization: Bearer <adminAccessToken>"
curl -X PATCH http://localhost:3333/sellers/<id>/reject -H "Authorization: Bearer <adminAccessToken>"
```

Approving/rejecting a seller that isn't `PENDING` returns 409 — it's a state transition, not a raw field overwrite.

## Testing carrier company registration + admin approval

Same shape as sellers, one extra row: signup creates `User` (role `CARRIER_MANAGER`) + `Carrier` (`status: PENDING`) + `CarrierUser` (`role: MANAGER`) in one transaction.

```bash
curl -X POST http://localhost:3333/carriers \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"password12345","companyName":"Fast Freight LLC","document":"12345678000199"}'

curl http://localhost:3333/carriers -H "Authorization: Bearer <adminAccessToken>"
curl "http://localhost:3333/carriers?status=PENDING" -H "Authorization: Bearer <adminAccessToken>"
curl http://localhost:3333/carriers/<id> -H "Authorization: Bearer <adminAccessToken>"
curl -X PATCH http://localhost:3333/carriers/<id>/approve -H "Authorization: Bearer <adminAccessToken>"
curl -X PATCH http://localhost:3333/carriers/<id>/reject -H "Authorization: Bearer <adminAccessToken>"
```

## Pagination and filtering

`GET /sellers` and `GET /carriers` share the same shape: `?status=` filters, `?page=`/`?limit=` paginate (default `page=1&limit=20`, `limit` capped at 100). Response is always `{ data: [...], meta: { total, page, limit, totalPages } }`, never a bare array — documented in Swagger via a reusable `ApiPaginatedResponse` decorator (`src/shared/pagination/`). The indexes backing these queries are annotated in `prisma/schema.prisma`.

## Testing your own modality/coverage config

Ownership-based (each user manages their own record — no `:id` param, resolved from the JWT):

```bash
curl http://localhost:3333/sellers/me -H "Authorization: Bearer <sellerAccessToken>"
curl http://localhost:3333/sellers/me/modalities -H "Authorization: Bearer <sellerAccessToken>"
curl -X PUT http://localhost:3333/sellers/me/modalities -H "Authorization: Bearer <sellerAccessToken>" -H "Content-Type: application/json" -d '{"modalityIds":["<uuid>"]}'

curl http://localhost:3333/carriers/me -H "Authorization: Bearer <carrierAccessToken>"
curl -X PUT http://localhost:3333/carriers/me/modalities -H "Authorization: Bearer <managerAccessToken>" -H "Content-Type: application/json" -d '{"modalityIds":["<uuid>"]}'
curl -X PUT http://localhost:3333/carriers/me/coverage-areas -H "Authorization: Bearer <managerAccessToken>" -H "Content-Type: application/json" -d '{"areas":[{"state":"SP","city":"São Paulo"}]}'
```

`PUT` on both modality and coverage endpoints is full-replace (submit the complete desired set every time). Carrier mutation is `CARRIER_MANAGER`-only; reads are open to `CARRIER_OPERATOR` too.

## Testing shipment creation

```bash
curl "http://localhost:3333/shipments/eligible-carriers?state=SP&city=São Paulo&modalityId=<uuid>" -H "Authorization: Bearer <sellerAccessToken>"

curl -X POST http://localhost:3333/shipments -H "Authorization: Bearer <sellerAccessToken>" -H "Content-Type: application/json" \
  -d '{"addressStreet":"Av. Paulista","addressNumber":"1000","addressNeighborhood":"Bela Vista","addressCity":"São Paulo","addressState":"SP","addressZipCode":"01310-100","modalityId":"<uuid>","carrierId":"<uuid>"}'

curl http://localhost:3333/shipments -H "Authorization: Bearer <sellerAccessToken>"
```

Every constraint from the eligible-carriers preview (seller approved, modality enabled, carrier approved+covers+offers) is re-validated server-side on `POST` — the preview is not trusted. `state` is normalized to uppercase and `email` to lowercase at the DTO boundary (so `"sp"`/`"SP"` and mixed-case emails behave identically); `city` is matched case-insensitively instead, since it has real display casing worth preserving. Full reasoning in [`DESIGN.md` § 14](../../DESIGN.md#14-shipments).

```bash
curl "http://localhost:3333/sellers?limit=2&page=1" -H "Authorization: Bearer <adminAccessToken>"
```

## Tests

```bash
pnpm test        # unit (vitest run)
pnpm test:watch  # unit, watch mode
pnpm test:cov    # with coverage (@vitest/coverage-v8)
pnpm test:e2e    # boots the whole AppModule against real Postgres + Redis
```

The e2e suite migrates and then truncates its database, so it refuses to start unless the database name ends with `_e2e`. It reads `E2E_DATABASE_URL`, falling back to `DATABASE_URL`:

```bash
E2E_DATABASE_URL="postgresql://tms:tms@localhost:5432/tms_e2e?schema=public" pnpm test:e2e
```

Vitest, not Jest — its default transform doesn't implement `emitDecoratorMetadata` (used by Nest to resolve DI), so there's an SWC plugin configured in both `vitest.config*.ts` files specifically for that. Details in [`DESIGN.md` § 17](../../DESIGN.md#17-code-quality--ci).

## Lint & format

```bash
pnpm lint     # biome check --write .
pnpm format   # biome format --write .
```

Biome, not ESLint/Prettier — NestJS-specific gotchas (parameter decorators, `useImportType` breaking DI) in [`DESIGN.md` § 17](../../DESIGN.md#17-code-quality--ci). Runs automatically on `pre-commit` (lefthook, configured at the repo root).

## API documentation

```bash
pnpm start:dev
# open http://localhost:3333/docs
```

Swagger/OpenAPI via `@nestjs/swagger`. Every implemented module is documented; the skeletons are left out on purpose. Details in [`DESIGN.md` § 17](../../DESIGN.md#17-code-quality--ci).

## Technical note — Prisma 7

The generator uses `moduleFormat = "cjs"` in `schema.prisma` — v7's default generates an ESM-only client (`import.meta.url`), incompatible with Nest's CommonJS build. The client also requires an explicit driver adapter in the constructor (`PrismaService` passes `new PrismaPg({ connectionString: ... })`), instead of implicitly resolving the connection from `DATABASE_URL`. Details in [`DESIGN.md` § 8](../../DESIGN.md#8-running-locally).

## Environment variables

Validated at boot via Zod (`src/shared/config/env.validation.ts`) — a missing or invalid value crashes the application with a clear message instead of a confusing error down the line. Details in [`DESIGN.md` § 17](../../DESIGN.md#17-code-quality--ci).

| Var | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string (see `docker-compose.yml` at the root) |
| `PORT` | `3333` | server port — Next.js defaults to 3000 |
| `JWT_SECRET` | — | signs the tokens — change it in production, minimum 16 characters |
| `CORS_ORIGIN` | `http://localhost:3000` | the single origin allowed for CORS |
| `REDIS_URL` | `redis://localhost:6379` | Socket.io adapter, rate-limit counters, health check |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@minitms.dev` / `admin12345` (password required in production) | Admin seed credentials |
| `SEED_DEMO` | unset | `true` makes the seed also create the demo accounts and shipments |
