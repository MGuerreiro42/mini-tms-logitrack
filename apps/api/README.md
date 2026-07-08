# Mini TMS — API

Backend of [Mini TMS](../../README.md), in NestJS. Full architecture-decision reasoning in [`DESIGN.md`](../../DESIGN.md) at the repo root — this README only covers what's specific to this app.

## Stack

- NestJS 11
- PostgreSQL via Prisma 7, with a driver adapter (`@prisma/adapter-pg`)
- Redis (pub/sub, cache, BullMQ) — integration still pending
- Socket.io — real-time gateway still pending

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
│   ├── sellers/         # signup + admin approval implemented (see DESIGN.md § 16); onboarding still pending
│   ├── carriers/        # signup + admin approval implemented (see DESIGN.md § 17); invites/ still a skeleton
│   ├── shipments/       # skeleton
│   ├── tracking/        # skeleton — will become the WS Gateway + Redis adapter
│   └── notifications/   # skeleton — will become BullMQ workers
├── shared/
│   ├── prisma/          # PrismaModule + PrismaService — @Global()
│   └── password/        # PasswordService (bcrypt hash/compare) — @Global()
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma     # 11 models — see DESIGN.md § 10
├── seed.ts           # creates the Admin — `pnpm exec prisma db seed`
└── migrations/       # versioned in git, applied via `prisma migrate deploy`
```

Grouped by domain, not by technical layer — same philosophy as the frontend (`DESIGN.md` § 9). Only `auth/` has real logic so far; the rest are skeletons ready to receive implementation module by module.

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

`GET /sellers` and `GET /carriers` share the same shape: `?status=` filters, `?page=`/`?limit=` paginate (default `page=1&limit=20`, `limit` capped at 100). Response is always `{ data: [...], meta: { total, page, limit, totalPages } }`, never a bare array — documented in Swagger via a reusable `ApiPaginatedResponse` decorator (`src/shared/pagination/`). Why offset-based instead of cursor/keyset pagination, and the reasoning behind every index added to support these queries at scale: [`DESIGN.md` § 18](../../DESIGN.md#18-scale--pagination-and-indexing).

```bash
curl "http://localhost:3333/sellers?limit=2&page=1" -H "Authorization: Bearer <adminAccessToken>"
```

## Tests

```bash
pnpm test        # unit (vitest run)
pnpm test:watch  # unit, watch mode
pnpm test:cov    # with coverage (@vitest/coverage-v8)
pnpm test:e2e    # boots the whole AppModule + a real Postgres, via supertest
```

Vitest, not Jest — its default transform doesn't implement `emitDecoratorMetadata` (used by Nest to resolve DI), so there's an SWC plugin configured in both `vitest.config*.ts` files specifically for that. Details and reasoning in [`DESIGN.md` § 12](../../DESIGN.md#12-code-quality).

## Lint & format

```bash
pnpm lint     # biome check --write .
pnpm format   # biome format --write .
```

Biome, not ESLint/Prettier — NestJS-specific gotchas (parameter decorators, `useImportType` breaking DI) in [`DESIGN.md` § 12](../../DESIGN.md#12-code-quality). Runs automatically on `pre-commit` (lefthook, configured at the repo root).

## API documentation

```bash
pnpm start:dev
# open http://localhost:3333/docs
```

Swagger/OpenAPI via `@nestjs/swagger`. Only `auth/` is documented — the skeleton modules have no real contract yet, so documenting them wouldn't make sense. Details in [`DESIGN.md` § 15](../../DESIGN.md#15-openapi-swagger-and-node-version).

## Technical note — Prisma 7

The generator uses `moduleFormat = "cjs"` in `schema.prisma` — v7's default generates an ESM-only client (`import.meta.url`), incompatible with Nest's CommonJS build. The client also requires an explicit driver adapter in the constructor (`PrismaService` passes `new PrismaPg({ connectionString: ... })`), instead of implicitly resolving the connection from `DATABASE_URL`. Details in [`DESIGN.md` § 8](../../DESIGN.md#8-running-locally).

## Environment variables

Validated at boot via Zod (`src/shared/config/env.validation.ts`) — a missing or invalid value crashes the application with a clear message instead of a confusing error down the line. Details in [`DESIGN.md` § 14](../../DESIGN.md#14-environment-validation-and-cors).

| Var | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string (see `docker-compose.yml` at the root) |
| `PORT` | `3333` | server port — Next.js defaults to 3000 |
| `JWT_SECRET` | — | signs the tokens — change it in production, minimum 16 characters |
| `CORS_ORIGIN` | `http://localhost:3000` | the single origin allowed for CORS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@minitms.dev` / `admin12345` | Admin seed credentials |
