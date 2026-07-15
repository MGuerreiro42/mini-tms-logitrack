# Mini TMS — Design Doc

> Simplified Transportation Management System (TMS), covering seller onboarding, multi-tenant carrier management, and real-time delivery tracking.

---

## 1. Project Goal

Build a full-stack system that reflects, in a simplified but architecturally honest way, the real challenges of a logistics platform: multiple organization types interacting (sellers and carriers), controlled approval and onboarding, real-time delivery tracking, and genuine multi-tenancy — not a generic CRUD app with authentication bolted on.

The project doesn't aim to be a commercializable product, but a technical artifact that demonstrates:

- Domain modeling with real relationships (not a tutorial schema).
- Multi-layer authorization (RBAC enforced in the backend, not just hiding a button in the front end).
- A real-time architecture that scales horizontally (WebSocket + Redis pub/sub), not a loose `socket.emit`.
- Justified technical decisions — every stack choice has a documented reason, not "because it's what everyone uses."

## 2. System Roles

| Role | Who they are | How they enter the system |
|---|---|---|
| **Admin** | Platform owner | Created via seed, never through a public screen |
| **Seller** | Merchant who needs to ship products | Public self-signup → onboarding → approval |
| **Carrier (manager)** | Responsible for the carrier company | Company registration → admin approval |
| **Carrier (operator)** | Executes day-to-day deliveries | Invited via token, sent by the carrier's manager |

The decision to split Carrier into company + operators (instead of a single login per carrier) was deliberate: it reflects how real B2B systems handle multiple employees from the same organization, and it's what makes multi-tenancy genuine instead of just a `role` column on the user table.

## 3. User Journey

Full flow per role, including entry points (self-signup vs. invite vs. seed) and the screens at each step.

```mermaid
flowchart TD
    subgraph ENTRADA["🔑 System Entry"]
        Login[/"Login"/]
        SignupSeller[/"Seller Signup (public)"/]
        InviteAccept[/"Invite Acceptance (token)"/]
        PublicTracking[/"Public Tracking (no login)"/]
    end

    Login -->|"role: admin"| AdminDash
    Login -->|"role: seller"| SellerCheck{"Approved status?"}
    Login -->|"role: carrier_manager / carrier_operator"| CarrierDash

    SignupSeller --> SellerOnboarding
    InviteAccept -->|"creates account linked to the token's carrier_id"| CarrierDash

    subgraph ADMIN["👤 Admin"]
        AdminDash["General Dashboard"]
        SellersList["Sellers List"]
        SellerDetail["Seller Detail"]
        CarriersList["Carriers List"]
        CarrierDetail["Carrier Detail"]
        OperatorsMgmt["Operator Management"]
        GlobalMonitor["Global Monitoring"]

        AdminDash --> SellersList --> SellerDetail
        SellerDetail -->|"approve / reject"| SellersList
        AdminDash --> CarriersList --> CarrierDetail --> OperatorsMgmt
        CarrierDetail -->|"approve / reject company"| CarriersList
        OperatorsMgmt -->|"invite operator"| InviteAccept
        AdminDash --> GlobalMonitor
    end

    subgraph SELLER["🏪 Seller"]
        SellerOnboarding["Multi-step Onboarding<br/>(data → docs → modalities)"]
        SellerPending["Awaiting Approval"]
        SellerDash["Dashboard"]
        CreateShipment["Create Shipment"]
        ShipmentsList["Shipments List"]
        ShipmentDetail["Shipment Detail"]
        DeliveryConfig["Modality Config"]

        SellerOnboarding --> SellerPending --> SellerCheck
        SellerCheck -->|"yes"| SellerDash
        SellerCheck -->|"no"| SellerPending
        SellerDash --> CreateShipment --> ShipmentsList
        SellerDash --> ShipmentsList --> ShipmentDetail
        SellerDash --> DeliveryConfig
    end

    subgraph CARRIER["🚚 Carrier (Company)"]
        CarrierOnboarding["Company Registration"]
        CarrierPendingApproval["Awaiting Approval"]
        CarrierDash["Dashboard / Shared Queue<br/>(everyone sees everything)"]
        ClaimCheck{"Does the shipment already have an owner?"}
        Claim["Claim Shipment"]
        ViewOnly["View only"]
        UpdateStatus["Update Status"]
        Performance["Carrier Performance"]

        CarrierOnboarding --> CarrierPendingApproval
        CarrierDash --> ClaimCheck
        ClaimCheck -->|"no owner"| Claim
        ClaimCheck -->|"I'm the owner"| UpdateStatus
        ClaimCheck -->|"another operator owns it"| ViewOnly
        Claim --> UpdateStatus
        CarrierDash --> Performance
    end

    ShipmentDetail -.->|"real time (SSE/WebSocket)"| GlobalMonitor
    UpdateStatus -.->|"status event"| ShipmentDetail
    UpdateStatus -.->|"status event"| GlobalMonitor
    UpdateStatus -.->|"assignment event"| GlobalMonitor
    ShipmentDetail -.->|"public link"| PublicTracking
```

**Product decision — delivery assignment:** the shipment queue is shared within each carrier (every operator sees everything), but each shipment has an optional "owner." With no owner, any operator can claim it (`self-assign`); with an owner, only that owner (or the manager, to unblock operations) can act on it. This prioritizes operational transparency over strict queue isolation — it better reflects how small/medium carriers actually work in practice.

## 4. System Screens

**Admin:** Dashboard, Sellers List, Seller Detail, Carriers List, Carrier Detail (with a sub-list of operators and invites), Global Monitoring.

**Seller:** Onboarding (multi-step with draft), Dashboard, Create Shipment, Shipments List, Shipment Detail, Modality Configuration.

**Carrier:** Company Registration, Operator Management (manager only), Invite Acceptance, Dashboard/Queue, Status Update, Performance.

**Public:** Invite Acceptance, Tracking without login.

Detailed screen-by-screen specification — role, displayed data (real schema fields), actions, and states — in [`SCREENS.md`](./SCREENS.md).

## 5. Technical Architecture

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Client"]
        Browser["Browser<br/>React + Next.js (App Router)<br/>shadcn/ui + Tailwind + Zustand"]
    end

    subgraph EDGE["🌐 Edge / Deploy"]
        Vercel["Next.js Frontend<br/>(Vercel)"]
        LB["Load Balancer<br/>(Railway/Fly.io — if scaling)"]
    end

    Browser -->|"HTTPS (REST)"| Vercel
    Browser -->|"WSS (Socket.io)"| LB
    Vercel -->|"REST API calls"| LB

    subgraph API["⚙️ Backend — NestJS"]
        RestModules["REST Modules<br/>(Auth, Sellers, Carriers,<br/>Shipments, Invites)"]
        Guards["Guards / RBAC<br/>(@Roles decorator)"]
        Gateway["WebSocket Gateway<br/>(Socket.io)"]
        RedisAdapter["Redis Adapter<br/>(@socket.io/redis-adapter)"]
    end

    LB --> RestModules
    LB --> Gateway
    RestModules --> Guards
    Gateway --> RedisAdapter

    subgraph DATA["💾 Data"]
        Postgres[("PostgreSQL<br/>via Prisma ORM<br/><br/>seller, carrier,<br/>carrier_user, shipment,<br/>tracking_event, invite")]
        Redis[("Redis<br/><br/>• Pub/Sub (WS events)<br/>• Cache (zones, config)<br/>• BullMQ (queues)")]
    end

    RestModules -->|"CRUD / transactions"| Postgres
    RestModules -->|"enqueues job"| Redis
    RedisAdapter <-->|"cross-instance pub/sub"| Redis

    subgraph WORKERS["🔄 Async Workers (BullMQ)"]
        EmailWorker["Worker: Email<br/>(invite, approval)"]
        NotifyWorker["Worker: Notification<br/>(SLA breach)"]
    end

    Redis -->|"consumes queue"| EmailWorker
    Redis -->|"consumes queue"| NotifyWorker

    subgraph EXTERNAL["📡 External"]
        MapAPI["Mapbox / Google Maps API<br/>(geocoding + route)"]
        EmailProvider["Email Provider<br/>(Resend/SendGrid)"]
    end

    RestModules -.->|"geocoding"| MapAPI
    EmailWorker -.->|"send"| EmailProvider

    RestModules -->|"1. operator updates status"| Postgres
    RestModules -->|"2. writes tracking_event"| Postgres
    RestModules -->|"3. publishes event"| Redis
    Redis -->|"4. propagates"| RedisAdapter
    RedisAdapter -->|"5. emits via WSS"| Gateway
    Gateway -.->|"6. real-time push"| Browser
```

### Real-time flow (the project's technical core)

1. An operator updates a shipment's status via REST.
2. The backend writes a new `tracking_event` to Postgres (immutable history — it never overwrites the previous status).
3. The backend publishes the event on a Redis channel.
4. Redis propagates the event to every subscribed API instance (this is what allows horizontal scaling without losing messages between different servers).
5. The Redis adapter delivers the event to the corresponding WebSocket Gateway.
6. The Gateway emits it via WSS to connected clients (the seller following the shipment, the admin on the global monitor).

## 6. Stack Decisions — Why

| Layer | Choice | Alternative considered | Why |
|---|---|---|---|
| Backend | NestJS (Node) | Spring Boot (Java) | Real-time is the core of the project — WebSocket is native to Node, without requiring WebFlux for non-blocking I/O. It's also where I have the most day-to-day fluency; I can work with Java but without production depth. NestJS mirrors the module/DI structure Spring offers, which keeps the door open to discuss architecture in an interview even with someone coming from Java. |
| Database | PostgreSQL + Prisma | MongoDB | Domain with strong relationships (seller → shipment → tracking_event → carrier) and a need for transactional integrity. NoSQL would solve a massive horizontal-scale or flexible-schema problem that this project doesn't have. |
| Real-time | WebSocket (Socket.io) + Redis pub/sub | Plain SSE / polling | Socket.io with the Redis adapter allows scaling to multiple instances without losing messages between servers — an architecture designed for real production, not just a single-process demo. |
| Queue | BullMQ (on top of Redis) | RabbitMQ/SQS | Reuses the same Redis infra already needed for pub/sub, avoiding an extra service just for lightweight queues (invite emails, SLA alerts). |
| Frontend | React + Next.js | — | Market standard, App Router for role-based routes (admin/seller/carrier) with distinct layouts. |
| Design system | shadcn/ui + Tailwind (Radix underneath) | MUI | MUI is already a day-to-day tool at work — reusing it wouldn't show anything new. shadcn/ui has become the de facto standard in modern React/Next.js projects, and building dense table/dashboard components on top of headless primitives proves an understanding of design systems, not just consumption of a ready-made library. |
| Infra | Local Docker Compose, deploy on Railway/Fly.io | Full AWS | Cost and setup speed appropriate for a portfolio project, without giving up real containerization. |

## 7. Roadmap (Advanced Features / Next Steps)

Items out of MVP scope but documented as planned evolution — signals product vision beyond what's been delivered:

- Automatic rule-based assignment (round-robin or operator coverage zone).
- Routing engine (suggesting the optimal delivery order).
- Delay prediction via a simple model over historical data.
- Natural-language assistant querying metrics ("how many late deliveries this week").
- Multi-tenancy with data isolation via dedicated rate limiting.

## 8. Running Locally

### Repository Structure

```
tms/
├── DESIGN.md
├── docker-compose.yml       # local infra: Postgres + Redis
└── apps/
    ├── api/                 # NestJS — backend
    │   ├── prisma/schema.prisma
    │   ├── src/prisma/      # PrismaModule + PrismaService (global)
    │   └── .env             # DATABASE_URL (not versioned)
    └── web/                 # Next.js — frontend
```

Simple folder-based "monorepo" (`apps/api`, `apps/web`), each with its own `package.json`/lockfile — no monorepo tooling (Turborepo/Nx) for now, since the two apps don't share any code with each other yet. Revisited if/when a real need for a shared package emerges (e.g., DTO types between front and back).

### Infra (Postgres + Redis)

```bash
docker compose up -d
```

Brings up two services with healthchecks and a named volume (data survives a `down`/`up`):

| Service | Port | Credentials (dev) |
|---|---|---|
| `postgres` (postgres:16-alpine) | `localhost:5432` | `tms` / `tms` / db `tms` |
| `redis` (redis:7-alpine) | `localhost:6379` | no password |

### Backend (`apps/api`)

```bash
cd apps/api
pnpm install       # postinstall runs `prisma generate` on its own
pnpm start:dev     # prestart:dev runs `prisma migrate deploy` on its own — http://localhost:3333
```

`.env` already points at the compose infra (`DATABASE_URL="postgresql://tms:tms@localhost:5432/tms?schema=public"`) and fixes `PORT=3333`, since Next.js also defaults to 3000 — both dev servers run at the same time without conflict.

**Migrations — what's automatic and what isn't.** `docker-compose.yml` only brings up an empty Postgres; it knows nothing about Prisma. Prisma is what applies the schema, and that's automated via npm/pnpm hooks in `apps/api`'s `package.json`:
- `postinstall` → `prisma generate` (whenever dependencies are installed, the client stays up to date).
- `prestart` / `prestart:dev` / `prestart:prod` → `prisma migrate deploy` (applies migrations already committed under `prisma/migrations/`, non-interactively and safely — never creates a new migration or resets data).

This covers "empty database → schema applied automatically when running `pnpm start:dev`." What **stays manual, on purpose**: changing `schema.prisma` and generating a new migration is always `pnpm exec prisma migrate dev --name <name>` — a deliberate, non-automated step, since it involves deciding the migration's name/content.

**Technical note — Prisma 7 and driver adapters:** starting with v7, Prisma replaced the generated client's implicit Rust engine with a *driver adapter* architecture: `PrismaClient` explicitly receives an adapter (`@prisma/adapter-pg`, on top of `pg`) built with the connection string, instead of resolving the connection on its own from `DATABASE_URL`. Two practical implications recorded here because they aren't obvious coming from earlier Prisma versions:
- The generator needs explicit `moduleFormat = "cjs"` in `schema.prisma` — v7's default generates an ESM-only client (uses `import.meta.url`), incompatible with Nest's default CommonJS build.
- `PrismaService` (`src/prisma/prisma.service.ts`) extends `PrismaClient`, passing the adapter in the `constructor`, and implements `OnModuleInit`/`OnModuleDestroy` to connect/disconnect along with Nest's lifecycle. It's a `@Global()` module, so any future module injects `PrismaService` without re-importing it.

### Frontend (`apps/web`)

```bash
cd apps/web
pnpm install
pnpm dev                    # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` (in `.env.local`) points to the API at `http://localhost:3333`. Still without the final design system (shadcn/ui) — that's the next step after the folder structure described below.

## 9. Frontend Architecture

Structure inspired by [bulletproof-react](https://github.com/alan2207/bulletproof-react), adapted to the TMS domain. The core idea: organize by **business domain**, not by technical file type — the `features/sellers` folder has everything related to sellers (components, hooks, API calls, types); there's no generic `hooks/` folder full of hooks from different features mixed together.

```
apps/web/src/
├── app/                      # ONLY routing (App Router) — layouts, pages, route groups
│   ├── (admin)/              # dashboard, sellers, carriers, monitoring
│   ├── (seller)/             # dashboard, shipments, onboarding
│   ├── (carrier)/            # dashboard, operators
│   ├── invite/accept/        # invite acceptance (public, via token)
│   ├── track/                # public tracking (no login)
│   └── providers.tsx         # the only client component at the root — QueryClientProvider
├── features/                 # the project's core — one domain per folder
│   ├── auth/
│   ├── sellers/
│   ├── carriers/
│   ├── shipments/
│   ├── invites/
│   └── tracking/
│       ├── components/
│       ├── hooks/
│       ├── api/              # calls + response types for that domain
│       └── types.ts
├── components/                # truly shared UI (ui/ and common/)
├── hooks/                     # generic hooks, not tied to any domain
├── lib/                       # domain-agnostic utilities
│   ├── utils.ts               # cn() — clsx + tailwind-merge
│   └── query-client.ts        # QueryClient factory (App Router pattern: singleton in the browser, new one per request on the server)
├── services/                  # external infrastructure clients
│   ├── api-client.ts          # typed fetch wrapper over NEXT_PUBLIC_API_URL
│   └── websocket-client.ts    # socket.io-client singleton (autoConnect: false)
├── store/
│   └── ui-store.ts            # Zustand — only genuinely global UI state
└── types/                     # types shared across features
```

### The Rule That Prevents Chaos: Unidirectional Dependency

`shared (components/, lib/, hooks/) → features/ → app/`. In other words: `components/` and `lib/` never import from `features/`; a feature can import from shared but never directly from another feature; `app/` imports from `features/` to compose pages. This is what keeps `sellers/` from depending on `carriers/`, which depends on `shipments/`, which depends on `sellers/` again — the tangle that turns "modular" into "modular in name only."

Planned exception: `shipments` will be consumed both by `sellers` (creates and tracks a shipment) and by `carriers` (updates status) — in that case it's a "more shared" feature that the other two depend on, which is acceptable as long as the dependency stays one-way. **Pending:** worth enforcing this rule with a lint plugin (`eslint-plugin-boundaries` or `import/no-restricted-paths`) once the features start having real content — today they're still just skeletons, so the linter wouldn't have anything to check.

### Where State Lives

Fixed rule: if the data comes from the server, it's **TanStack Query**; if it's pure client-side UI state, it's **Zustand** (or local `useState` when it doesn't even need to be global). Never store an API response inside Zustand — that turns into manual synchronization that Query already solves (caching, revalidation, invalidation after mutation). In the TMS: shipments list, seller approval status, carrier data → all Query, via the `features/*/api/` files. Selected table filter, sidebar open/closed, theme → `store/ui-store.ts`.

### Server vs. Client Components

By default, everything is a Server Component — `'use client'` only exists where there's real interactivity (form, WebSocket, state hooks). The adopted practice is to push `'use client'` to the leaves of the tree: today only `app/providers.tsx` is a client component (because `QueryClientProvider` needs React context), and the root `layout.tsx` stays a Server Component, only wrapping `{children}` with `<Providers>`. As features gain interactive components (e.g., the component that listens to the tracking WebSocket), only those become client components — not the whole page or layout around them.

### Current Status

Folder skeleton created and validated (`pnpm build` and `pnpm dev` running clean). `@tanstack/react-query` and `zustand` installed and wired up (`Providers`, `ui-store.ts`). `features/*` are still empty (`types.ts`, `api/index.ts`, `index.ts` placeholders) — modeling each domain is the next step, feature by feature.

## 10. Data Model

11 tables in `apps/api/prisma/schema.prisma`, applied via `prisma migrate dev` against the compose Postgres. Auth (`User`) separated from domain profile (`Seller`, `CarrierUser`) — Admin is just a `User` with `role: ADMIN`, with no table of its own.

```
User ──1:1── Seller ──1:N── Shipment ──N:1── DeliveryModality
  └──1:1── CarrierUser ──N:1── Carrier ──1:N── Invite
                                  ├──1:N── CarrierCoverageArea
                                  ├──1:N── CarrierModality ──N:1── DeliveryModality
                                  └──1:N── Shipment (optional owner via CarrierUser)

Seller ──1:N── SellerModality ──N:1── DeliveryModality
Shipment ──1:N── TrackingEvent (immutable history, never UPDATE)
```

### Decisions That Weren't Obvious at First

- **Address as loose columns, not `Json`** — `Shipment.addressCity`/`addressState`/etc. as real columns. Loses the convenience of a single blob, but gains indexing and search by city/state — which is exactly what coverage-based carrier assignment (below) needs.
- **`ShipmentStatus` with 9 states**, not 4 — `COLLECTED` marks physical pickup (without it, there's no way to distinguish "created" from "already left the seller"); `FAILED_DELIVERY` + `RETURNED` cover a failed attempt (without them, a shipment that fails delivery would stay stuck in `IN_TRANSIT` forever). `CANCELLED` is only possible before `COLLECTED` — after that, the only exception path is `FAILED_DELIVERY → RETURNED`.
- **Carrier assignment by city/state coverage, not geospatial** — `CarrierCoverageArea` (`carrierId`, `state`, `city` nullable = "entire state"). When creating a shipment, it filters approved carriers whose coverage matches the address; the seller picks among the ones that show up. Geocoding/PostGIS is left for the roadmap (section 7) — not MVP scope.
- **Modalities as a configurable catalog, not a fixed enum** — the existence of the "Modality Configuration" screen (section 4) only makes sense if there's something to configure. `DeliveryModality` is the catalog (`code`, `name`, `slaHours` — the latter meant for the roadmap's SLA-breach alert); `CarrierModality` and `SellerModality` are N:N join tables — the carrier declares what it operates, the seller declares what it enables. **Deliberate decision:** the seller's configuration is independent of carriers' actual offering (the seller toggles the whole catalog on/off, without knowing whether a compatible carrier currently exists in their region) — simpler, and it avoids coupling the config screen to carrier onboarding state. No compatible carrier at shipment-creation time becomes an empty state handled there, not a restriction on the config screen.
- **`Shipment` points to a single `Carrier`** — the shared queue (section 3) is *within* an already-assigned carrier; "no owner" is only about which *operator* claims it via `CarrierUser.ownedShipments` (`ownerId` nullable), not about which carrier.

### `GlobalRole` vs. `CarrierRole` — splitting a shared enum

`User.role` and `CarrierUser.role` originally shared a single `Role` enum (`ADMIN`, `SELLER`, `CARRIER_MANAGER`, `CARRIER_OPERATOR`). Split in migration `20260708154940_split_role_into_global_and_carrier_role` into `GlobalRole` (the identity role held once per `User`, driving the JWT/`RolesGuard`) and `CarrierRole` (`MANAGER`, `OPERATOR`, scoped to one `CarrierUser` within one `Carrier`).

**Why:** sharing one enum meant a `CarrierUser` could be typed `ADMIN`/`SELLER` with nothing but app-level discipline stopping it — an invalid state the schema itself should rule out, not just convention. It also meant the same fact (manager vs. operator) risked living in two places (`User.role` and `CarrierUser.role`) with no constraint keeping them in sync. Splitting makes the invalid combination a compile-time impossibility instead of a runtime risk. Since no `CarrierUser` row existed yet in any environment (the carriers module has no real logic yet), the migration renamed the enum in place — `ALTER TYPE "Role" RENAME TO "GlobalRole"`, preserving `User.role` data with zero cast — and safely dropped/recreated the empty `CarrierUser.role` column against the new type.

**Seller has no equivalent split, on purpose:** `Seller.userId` is `@unique` (`User ──1:1── Seller`), so a seller company is a single-user account by design — there's no sub-role to distinguish because there's no "inside" to have sub-roles within. `Carrier` is explicitly multi-user (no such uniqueness on `CarrierUser.carrierId`) because the shared-queue model (§3) already requires a manager plus several operators — that's what actually justifies `CarrierRole` existing. If sellers ever need multiple logins per company, the analogous move would be a `SellerUser` join table (dropping today's `@unique`) plus a `SellerRole` enum — not a need the current scope has.

A visual draft (full ER + status flow) was documented separately during the modeling discussion — this document reflects the final version applied in migration `20260707213521_init_domain`.

## 11. Backend Module Architecture

```
apps/api/src/
├── modules/
│   ├── auth/            # implemented — Passport + JWT + bcrypt
│   │   ├── auth.module.ts / .controller.ts / .service.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   ├── guards/jwt-auth.guard.ts, roles.guard.ts
│   │   ├── decorators/roles.decorator.ts, current-user.decorator.ts
│   │   └── dto/login.dto.ts
│   ├── sellers/         # skeleton — empty module/controller/service
│   ├── carriers/        # skeleton, with invites/ as a nested sub-module
│   ├── shipments/       # skeleton
│   ├── tracking/        # skeleton — will become the WS Gateway + Redis adapter
│   └── notifications/   # skeleton — will become BullMQ workers
├── shared/
│   └── prisma/          # PrismaModule/PrismaService, moved from src/prisma — @Global()
└── main.ts
```

Grouped by domain, not by technical layer — same philosophy as the frontend architecture (§9): each module owns what belongs to it, `common/` (cross-cutting filters/interceptors/pipes) stays out until there's a real need for it — creating that folder empty today would be unused abstraction. `EventEmitterModule` (`@nestjs/event-emitter`) is already registered globally in `AppModule`, but with no fake listener — the pattern of decoupling modules via events (`ShipmentsService` emits, `TrackingModule`/`NotificationsModule` listen) only makes sense once those modules have real logic.

### AuthModule — Why Passport, Not a Hosted Provider

Passport (`@nestjs/passport` + `@nestjs/jwt` + `bcrypt`) instead of Auth0/Clerk/Supabase Auth or NextAuth: it's the official NestJS pattern and the most common one in real Node backend job postings, and it doesn't outsource the part that's the project's own goal (RBAC enforced in the backend, §1). A hosted provider would take exactly that logic out of the codebase; NextAuth would fit poorly because it assumes Next.js owns the session — here, what authorizes every request is the NestJS API (and, in the future, the WebSocket Gateway), not the front end.

**How it works:**
- `POST /auth/login` — validates email/password (`bcrypt.compare` against `User.passwordHash`), signs a JWT (`sub`, `email`, `role`) via `JwtModule`.
- `JwtStrategy` (Passport) validates the token on every protected request and reloads the `User` from the database — this guarantees that a deleted user doesn't stay "authenticated" just because the token hasn't expired yet.
- `JwtAuthGuard` — requires a valid token. `RolesGuard` + `@Roles(...)` — requires a specific `role`, reading metadata via `Reflector`. The two combine via `@UseGuards(JwtAuthGuard, RolesGuard)` in the other modules' controllers.
- `@CurrentUser()` — a parameter decorator that extracts the authenticated user from the request, avoiding repeating `request.user` in every handler.

**Validated end-to-end** (not just compiled): seeded an Admin (`prisma/seed.ts`, run via `tsx` — `ts-node` failed because of `.js`→`.ts` module resolution on the client generated by Prisma 7, a gotcha recorded here so the investigation isn't repeated), login returning a real JWT, protected `GET /auth/me` responding 200 with a token and 401 without one, the global `ValidationPipe` rejecting an invalid DTO with 400.

**Prisma seed on v7:** the seed command no longer goes in `package.json#prisma.seed` (the old convention) — now it's `migrations.seed` inside `prisma.config.ts`.

## 12. Code Quality

### Biome — Why, Not ESLint + Prettier

A single binary (Rust), format + lint with one config, orders of magnitude faster than ESLint+Prettier running separately — and it resolves an inconsistency that already existed between the two apps (`apps/api` had Prettier, `apps/web` had no formatter at all). Trade-off consciously accepted: Biome has no equivalent to `eslint-config-next` or to the ESLint setup the NestJS community uses — it loses framework-specific rules (correct use of `next/image`/`next/link`, some Nest decorator rules). Not a big loss at the project's current stage, and "one fast tool, one config, a justified choice" is a better portfolio signal than two tools with diverging configs between the apps.

**A real gotcha, not a cosmetic one — parameter decorators:** Biome's parser doesn't accept parameter decorators (`@Body() dto: LoginDto`) by default, which is practically every NestJS controller. Needs `javascript.parser.unsafeParameterDecoratorsEnabled: true` in `apps/api`'s `biome.json` — "unsafe" in the sense of "outside the finalized TC39 standard," not "dangerous for your code" (it's exactly the model NestJS's `experimentalDecorators`/`emitDecoratorMetadata` already uses).

**A more serious gotcha — `useImportType` breaks Nest's dependency injection:** Biome's default rule automatically converts any import used only in a type position to `import type` — but NestJS needs the real class reference at runtime to resolve DI via `design:paramtypes` (`emitDecoratorMetadata` reflection). `import type { PrismaService }` in an injected constructor compiles without error, but breaks at runtime with `Nest can't resolve dependencies (?, Function)` — the class turns into `Function` in the metadata because the import was erased. This **doesn't show up in the build, only when actually running the application** (which is why we test with real curl requests, not just `nest build`). Fix: `style.useImportType: "off"` in `apps/api`'s `biome.json`. Not an issue in `apps/web` (React doesn't depend on decorator reflection to work).

**`apps/web`:** enabled `linter.domains: { next: "recommended", react: "recommended" }` (framework-specific rules Biome 2.x has for these) and `css.parser.tailwindDirectives: true` (Tailwind v4 uses `@theme` in CSS, which Biome's CSS parser doesn't recognize by default). Static SVGs under `public/` excluded from lint — they're assets, not UI markup, so the accessibility rule (`noSvgWithoutTitle`) doesn't apply.

### Pre-commit — lefthook, Not Husky

The repo has no unified pnpm workspace — `apps/api` and `apps/web` are independent projects, with no root `package.json` until now. Husky wants to live in a root `package.json` with a heavier setup; **lefthook** is a standalone (Go) binary configured via `lefthook.yml`, with native support for running commands per sub-directory — it fits better with this "two independent apps" shape without forcing a unified workspace just to host tooling.

Created a root `package.json` **only for repository tooling** (`lefthook`, `lint-staged`, `commitlint`) — not a workspace aggregating `api`/`web`'s dependencies, which remain 100% independent.

- **`lint-staged.config.js`** — maps `apps/api/**` and `apps/web/**` to `pnpm --dir <app> exec biome check --write`, each using the Biome installed in its own `node_modules` (no need to duplicate it anywhere beyond that).
- **`lefthook.yml`** — `pre-commit` runs `lint-staged`; `commit-msg` runs `commitlint --edit`.
- **`commitlint.config.js`** — Conventional Commits (`@commitlint/config-conventional`).

Tested end-to-end (not just configured): a commit with a non-conforming message was rejected (`subject-empty`, `type-empty`); a commit with a valid message went through; a deliberately malformed staged file (`{a:1,b:2,c:3}`) was automatically reformatted by Biome before the commit landed.

### Repository Structure — Neither a Unified Workspace nor Separate Repos

Two questions we discussed and deliberately resolved in the same direction: "no." Recorded here because both tend to come back up as the project grows.

**Why not turn it into a real monorepo (unified pnpm workspace, Turborepo/Nx, shared `packages/`):** today `apps/api` and `apps/web` don't share any code — each has its own `node_modules`/lockfile, and the root `package.json` exists only to host tooling (above). Adding real monorepo tooling without shared code is solving a problem the project doesn't have (slow cross-package builds, code duplication) — it's the most common mistake in portfolio projects in this area: Turborepo/Nx on top of two apps that exchange nothing is cargo culting, not maturity.

**Where this will actually get tested:** the day `features/*/types.ts` on the front end need the shape of `Shipment`/`Seller`/`Carrier`. At that point the answer isn't "turn into a unified workspace and import `.ts` from `apps/api` directly into `apps/web`" — it's generating a **contract** (OpenAPI via `@nestjs/swagger`, types generated on the front via `openapi-typescript`/orval) and not sharing TypeScript source. Reason: the two apps have explicitly independent deploys (Vercel + Railway/Fly, section 6) — coupling via a workspace two services that go up at different times, potentially in different versions, is more fragile than syncing via a contract.

**Why not split into two git repos, then:** the most obvious reason to do that — "I need independent deploys" — is already solved without separating anything: Vercel and Railway both support pointing at a subfolder of a monorepo ("root directory" / one service per directory). Splitting the repo would cost something real right now: this `DESIGN.md` is a single narrative spanning front+back+infra (turning it into 2 repos means duplicating it or electing one as "primary"); `docker-compose.yml` orchestrates both apps together for local dev; and there's no team/access boundary to protect (solo project). At this stage, end-to-end changes (schema + front-end type/form in the same session) are still common — 2 repos becomes 2 PRs for one single thing, friction with no gain.

**Trigger to revisit:** most changes start being one-sided (front OR back, not both together — a sign the contract has stabilized), or someone shows up who should only see half the code. Unlike a schema decision (expensive to change once applied), splitting the repo is reversible at any time with no retroactive cost — it's not a door that needs to stay open "just in case."

### Vitest, Not Jest

`apps/api` swapped Jest for Vitest — and that resolved, as a side effect, a problem we had just documented here as a "known gap": running `pnpm test:e2e` with Jest, Nest would hang at `PrismaService.$connect()` with `TypeError: A dynamic import callback was invoked without --experimental-vm-modules`, because Prisma 7's WASM query compiler uses dynamic `import()` and `ts-jest` (CommonJS) doesn't support that without a Node experimental flag. Vitest's transform is native to ESM/Vite — e2e now runs clean, with no extra config for this.

**What actually needed attention — decorator metadata, again.** Same warning as Biome (above): Vitest's default transform (esbuild/Oxc) **doesn't implement `emitDecoratorMetadata`**, which is exactly what NestJS uses to resolve DI via `design:paramtypes`. Using Vitest "out of the box" on a Nest project would break dependency injection the same way Biome's `useImportType` did — silently, only at runtime. Fix: `unplugin-swc` as a Vitest plugin, with `jsc.transform.decoratorMetadata: true` explicit (SWC, unlike esbuild, implements this). Also needed to explicitly disable `esbuild`/`oxc` in the config (`esbuild: false, oxc: false`) — otherwise Vitest 4 tries to run its default transform on top of SWC's.

- `vitest.config.ts` — unit tests (`src/**/*.spec.ts`).
- `vitest.config.e2e.ts` — e2e tests (`test/**/*.e2e-spec.ts`), same plugin/decorator config.
- Coverage via `@vitest/coverage-v8`, excluding the generated Prisma client and the test files themselves from the report.
- `tsconfig.json` got `"types": ["vitest/globals"]` — `describe`/`it`/`expect`/`vi` without imports, validated with a real `tsc --noEmit` (not just "the tests run").

**New unit test, with real substance:** `src/modules/auth/auth.service.spec.ts` — mocks `PrismaService`/`JwtService` via `Test.createTestingModule`, covers `AuthService.login()`'s three paths: valid credentials (returns token + user), wrong password, and non-existent user (both throw `UnauthorizedException`, without calling `signAsync`). It's not the "`AppController` should be defined" placeholder — it's the only piece of real business logic that exists so far, and now it has a test.

## 13. CI — GitHub Actions

`.github/workflows/ci.yml`, running on `push`/`pull_request` against `main`. It exists because local tooling (Biome, lefthook, commitlint) only protects whoever goes through their own machine — someone can commit with `--no-verify`, clone the repo without running `pnpm install` at the root (hooks never installed), or simply use a different machine. CI is what guarantees that whatever lands on the main branch went through the same checks, independent of local hooks.

**Three parallel jobs:**
- **`commitlint`** — only runs on PRs (`if: github.event_name == 'pull_request'`), validates the PR's commit range against the root `commitlint.config.js` via `wagoid/commitlint-github-action`. Reinforces in CI what the `commit-msg` hook already does locally — without it, the local hook is just a "gentleman's agreement," not a guarantee.
- **`api`** — `apps/api`: install → `lint:ci` (Biome **without** `--write` — CI should fail on a problem, not fix and mask it) → build → unit tests → e2e. E2e needs a real Postgres (`PrismaService.$connect()` really runs), so the job spins up a **service container** `postgres:16-alpine` with the same credentials as `docker-compose.yml` (`tms`/`tms`/`tms`) — not a secret, just ephemeral CI infra. `pretest:e2e` (a new hook in `package.json`, same pattern as `prestart:dev`) automatically runs `prisma migrate deploy` before e2e, both in CI and locally.
- **`web`** — `apps/web`: install → `lint:ci` → build (which already includes Next's type-check).

**Why `lint:ci` and not `lint`:** the local `lint` script uses `biome check --write .` (fixes on the spot, good for day-to-day work). In CI that would mask problems — the job would pass "green" even with badly formatted code, just because Biome silently fixed it during the job (and that fix doesn't make it back into the repo). `lint:ci` runs `biome check .` without `--write`, failing if there's anything to fix.

**Not validated end-to-end yet** (unlike the rest of this project): there's no way to run GitHub Actions locally — every command in the workflow was tested individually in the terminal (`lint:ci`, `build`, `test`, `test:e2e` against local Postgres), and the YAML was syntactically validated, but the workflow itself only runs for real on the first push/PR.

### PR Flow, Even Solo

A single-developer repo, but the workflow is still branch → PR → green CI → merge, not direct pushes to `main`. Branch protection on `main` requires the status checks (`api`, `web`, `commitlint`) — deliberately **without** requiring review approval, because GitHub doesn't let the author approve their own PR, and that would block every merge in a solo repo. `.github/PULL_REQUEST_TEMPLATE.md` auto-fills the description on every new PR: what/why, type of change (mapped to the categories `commitlint` already validates), how it was validated (the same "actually ran it" habit from the rest of the project), and a checklist (local lint/test/build, `DESIGN.md` updated if it's an architecture decision, no committed secret, migration included if the schema changed).

## 14. Environment Validation and CORS

Two "pre-config" gaps identified during a deliberate review of what was missing before moving on to business logic: CORS had never been enabled (would break the frontend's first real call to the backend), and env vars were read straight from `process.env` with no validation — if one were missing, the error would show up late and confusing (e.g., JWT signing with `undefined`), not at application boot.

### Zod, Not Joi

`@nestjs/config` has an official recipe for Joi (`validationSchema: Joi.object({...})`), and that's its only real advantage here — `@nestjs/config` doesn't restrict you to Zod either, it's just that the path is the `validate` option (a custom function) instead of `validationSchema`. Zod wins on everything that matters more for the project: TS type inference (`z.infer<typeof envSchema>` gives you the type ready-made; Joi requires manual annotation) and it's the tool already used by default. Real, non-cosmetic gotcha: an env var always arrives as a string — `z.number()` would reject `"3333"`; the schema explicitly uses `z.coerce.number()` for `PORT`.

`src/shared/config/env.validation.ts` — schema with `DATABASE_URL` (url), `PORT` (coerced, default 3333), `JWT_SECRET` (minimum 16 characters), `CORS_ORIGIN` (url, default `http://localhost:3000`), `NODE_ENV` (enum, default `development`). `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` in `AppModule` — fails to boot with a clear message (`Invalid environment variables: - JWT_SECRET: Too small...`) instead of leaving it to be discovered later.

**Full adoption, not halfway:** the places that read `process.env` directly (`PrismaService`, `JwtStrategy`, `AuthModule`'s `JwtModule`, `main.ts`) were migrated to `ConfigService` via DI (`JwtModule.registerAsync` instead of `.register`, since the secret now comes from async injection). `prisma.config.ts` still reads `process.env.DATABASE_URL` directly via `dotenv` — it runs outside Nest's container (it's the Prisma CLI), there's no `ConfigService` to inject there, and that's correctly so.

**Validated in both directions, not just "it compiles":** with a deliberately short `JWT_SECRET` in `.env`, the application refused to boot with Zod's exact error message; once the correct value was restored, it worked again. Also confirmed that Vitest loads `.env` automatically (inherited from Vite) — unlike the old `ts-jest` setup, which required manually importing `dotenv/config` in every entrypoint.

### CORS

`app.enableCors({ origin: <CORS_ORIGIN>, credentials: true })` in `main.ts`. Tested with `curl -X OPTIONS` simulating an allowed origin and a disallowed one — both return the same `Access-Control-Allow-Origin` header (the configured value), because **it's the browser, not the server, that enforces the policy**: it compares that header against the page's own origin and blocks reading the response if they don't match. `curl` doesn't reproduce that enforcement — it's just a way to confirm the returned header is the expected one, not proof of an actual block (that would require a test running in a real browser).

## 15. OpenAPI (Swagger) and Node Version

### Swagger — Just the Base, No Invented Contract

`@nestjs/swagger` configured in `main.ts` (`DocumentBuilder` + `SwaggerModule.setup('docs', ...)`, with `addBearerAuth()` for the authentication scheme). Deliberately **did not** document the modules that were still skeletons at the time (`carriers`, `shipments`, `tracking`, `notifications` remain so — `sellers` got its first real endpoint in section 16) — there's no real contract there yet, and documenting an endpoint that does nothing would be a lie in the spec. What existed at the time (`AuthController`) got full decorators: `@ApiTags`, `@ApiOperation`, `@ApiResponse` (200/400/401) on every route, `@ApiBearerAuth()` on `/auth/me`, and `@ApiProperty()` on `LoginDto` and the new response DTOs (`AuthenticatedUserDto`, `LoginResponseDto` — created just to give the login response a typed shape, which used to be a loose object with no class). The idea is for this to become the default habit on every new controller, not a retrofit after 20 undocumented endpoints.

Validated by actually booting the application: `/docs` responds 200, and `/docs-json` shows the 2 auth paths, the 3 schemas with the right fields, and `securitySchemes.bearer` registered — not just "Nest didn't complain at compile time."

**Small gotcha, same family as "approving a build script without thinking":** `@nestjs/swagger` brings in `@scarf/scarf` (install telemetry) as a transitive dependency, which pnpm blocks by default (`ERR_PNPM_IGNORED_BUILDS`). Instead of approving it (running the script), configured `allowBuilds: { '@scarf/scarf': false }` in `pnpm-workspace.yaml` — permanently declines it without blocking every future install with a fresh prompt.

### `.nvmrc` and `engines`

Recorded earlier as a conscious discrepancy: CI pinned to Node 24, local environment running 26 (outside Prisma's list of officially supported versions, even though it works fine). `.nvmrc` at the root (`24`) and `"engines": { "node": ">=24.0.0" }` in both `package.json` files — aligns the "official" value with whatever any `nvm use`/fresh install will pick up, even though the current development machine keeps running 26 for convenience.

## 16. Sellers — First Domain Module with Real Logic

`sellers` was chosen to come out of skeleton status first (instead of `carriers`) for being the simplest flow to close end-to-end: public self-signup → `status: PENDING`, without the extra complexity of `CarrierUser`/`Invite`. `POST /sellers` implemented, plus the admin approval loop (§16.1) — multi-step onboarding is left for later.

### Ownership-Based Authorization, Not Just Role-Based

Before writing the first endpoint, it was worth separating two things that looked like the same one: the RBAC **mechanism** (`JwtAuthGuard`/`RolesGuard`, already in place and generic — it knows nothing about seller/carrier specifically) and **ownership-based authorization** (a seller can only see their own record, not someone else's). The second one has no possible generic guard — every entity has a different owner FK (`Shipment.sellerId`, `Seller.userId`, etc.) — so that check lives in each module's service, not in a reusable piece. `POST /sellers` itself doesn't need this check (it's public, no authenticated user yet), but the pattern is recorded here because `GET /sellers/:id` (a seller's own view) and the carrier endpoints will need it.

### `PasswordService` Extracted from `AuthModule`

`bcrypt.hash`/`bcrypt.compare` now live in `src/shared/password/` (`PasswordService`, a `@Global()` module like `PrismaModule`) — before, only `compare` existed inside `AuthService` for login; signup needs `hash`. Extracting it avoids duplicating the magic salt-rounds number in two places, and it's ready for when `carriers` needs the same thing. `AuthService` was migrated to inject `PasswordService` instead of calling `bcrypt` directly — `auth.service.spec.ts` adjusted to provide a real `PasswordService` (not mocked, same spirit as already using real bcrypt in the test).

### `SellersService.signup`

- A transaction (`prisma.$transaction`) creates `User` (`role: SELLER`) and `Seller` together — both have to exist or neither does; there's no room for an orphaned `User` with no `Seller` if the second write fails.
- Duplicate email and document are caught via `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` (the database's unique constraint) and converted into a `ConflictException` (409) — the client-facing message is deliberately generic (see security review below), instead of leaking Prisma's raw error to the client.
- The return value is an explicitly built object (`SellerResponseDto`), not the raw Prisma record — guarantees `passwordHash` can never show up in the response, even if the query/relations change later.
- `@IsNotEmpty()` on `companyName`/`document` in addition to `@IsString()` — found by testing on purpose with an empty string: `@IsString()` alone accepts `""`.

**Validated end-to-end, not just unit tests with mocks:** booted the real application, created a seller via `curl`, confirmed in Postgres (`psql`) that `User` and `Seller` were written correctly with the right relationship; tested duplicate email and duplicate document (two separate `curl` calls, both 409); tested a DTO with every field invalid at once (400 with all 4 messages); confirmed in `/docs-json` that `/sellers` and the new schemas show up in the contract. Test data removed from the database afterward.

### Security review — user enumeration via the signup conflict message

A deliberate security pass on the login/signup flow (multi-agent review: one pass to find issues, a separate pass per finding to filter false positives against a strict confidence bar) surfaced one real, confirmed issue: the original `ConflictException` message echoed back *which* field collided (`Email or document already registered (email)` vs `(document)`), read straight from `error.meta.target`. On a public, unauthenticated signup endpoint, that's a working account-enumeration oracle — hold the document constant and vary the email, and the response tells you whether that email is already registered on the platform, useful for credential stuffing or targeted phishing lists. Fixed by making the client-facing message generic (`"Email or document already registered"`, no field named) while still logging the specific field server-side (`Logger.warn`) for debugging — the fix, not just the report, is what's committed. A second candidate finding — a timing side-channel from `AuthService.login()` short-circuiting on `!user` before the `bcrypt.compare` call — was reviewed and explicitly rejected: distinguishing tens-of-milliseconds of bcrypt cost from ordinary internet jitter isn't practically exploitable over a real deployment, so it was left as-is rather than "fixed" for a theoretical threat.

**A second, unrelated Prisma 7 gotcha found while fixing the first:** the field-detection logic above was originally written against the *old* Prisma error shape (`error.meta.target: string[]`), which is what every public Prisma example still shows. Testing the fix for real (not trusting the mock) revealed that Prisma 7 with driver adapters (`@prisma/adapter-pg`) reports the colliding field somewhere else entirely — `error.meta.driverAdapterError.cause.constraint.fields` — and leaves `target` `undefined`. The debug log was silently logging `"undefined"` until this was caught by actually reading server logs after a real `curl`, not just asserting the unit test passed. Same family as the other Prisma-7-driver-adapter surprises in this project (§8, §12): the newer, faster architecture changes shapes that tutorials/AI training data still assume are stable. The unit test mock was corrected to match the real shape so it actually exercises the production code path, not a plausible-looking fiction.

### 16.1 Admin endpoints — closing the seller approval loop

Four endpoints, all `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(GlobalRole.ADMIN)` — the first real usage of `@Roles()` with an actual value anywhere in the codebase (`/auth/me` is open to any authenticated role, so this is where the RBAC mechanism from §11 gets exercised for real, not just unit-tested against a mock guard):

- `GET /sellers` — list, with an optional `?status=` query filter (`ListSellersQueryDto`, validated against the real `ApprovalStatus` enum via `@IsEnum`).
- `GET /sellers/:id` — single seller, 404 if it doesn't exist.
- `PATCH /sellers/:id/approve` / `PATCH /sellers/:id/reject` — state transition, not a raw field update: both go through a shared `updateStatus` helper that throws `ConflictException` (409) if the seller isn't currently `PENDING`. Approving an already-approved seller is a 409, not a silent no-op or a second success — the API should say something changed only when something actually did.

**Where the email comes from:** `Seller` has no `email` column — it's `User.email` via the `userId` relation. Every read path (`findAll`, `findOne`, the post-update response) queries with `include: { user: true }` and a shared `toResponseDto(seller: SellerWithUser)` mapper, instead of duplicating the field-by-field mapping in four places — `SellerWithUser` is `Prisma.SellerGetPayload<{ include: { user: true } }>`, not a hand-written interface, so it stays correct if the schema changes.

**Validated end-to-end, including the RBAC denial paths, not just the happy path:** seeded the admin, signed up two real sellers via `curl`, logged in as admin and hit `GET /sellers` (both `PENDING`) and `GET /sellers/:id` (200) and a nonexistent id (404); approved one seller (200), rejected the other (200), confirmed re-approving the now-`APPROVED` seller returns 409; filtered `GET /sellers?status=REJECTED` and got exactly the rejected one back. Then — the part that actually proves the guard works, not just that the happy path compiles — logged in as the now-approved seller and confirmed `GET /sellers` and `PATCH .../approve` both return 403 for that token, and confirmed no token at all returns 401. Confirmed `/docs-json` lists all 4 paths with `security: [{ bearer: [] }]`. Test data removed from the database afterward.

## 17. Carriers — Second Domain Module

`carriers` follows the exact shape of `sellers` (§16): public self-signup + admin approval loop, with the one structural difference the data model always implied (§10) — a carrier's "owner" is a `CarrierUser`, not the `Carrier` itself, so signup writes **three** rows instead of two.

### `CarriersService.signup`

Same `prisma.$transaction` shape as `SellersService.signup`, extended by one step: `User` (`role: CARRIER_MANAGER`) → `Carrier` (`status: PENDING`) → `CarrierUser` (`role: CarrierRole.MANAGER`, linking the two). All three or none — a failed third write rolls back the first two, so there's no orphaned `User`/`Carrier` pair with no `CarrierUser` to link them. The P2002-to-generic-409 fix and the driver-adapter error-shape handling (both from §16's security review) were replicated here from the start, not rediscovered — a second unauthenticated signup endpoint with a field-naming conflict message would have been the exact same account-enumeration oracle.

### Reading a carrier back — `managerInclude`

`Carrier` has no direct link to a `User`; the manager's email comes from `CarrierUser` (`role: MANAGER`) → `User`. A shared Prisma include object (`managerInclude`, built with `satisfies Prisma.CarrierInclude` so it stays type-checked against schema changes) is reused across `findAll`/`findOne`/`updateStatus` — `include: { users: { where: { role: CarrierRole.MANAGER }, include: { user: true }, take: 1 }, _count: { select: { users: true } } }`. `_count.users` also satisfies `SCREENS.md`'s "Carriers List" spec, which asks for a `CarrierUser` count per row (not needed by `SellerResponseDto`, since a seller has exactly one owner by definition — see §10's `GlobalRole`/`CarrierRole` split entry for why this asymmetry exists). `toResponseDto` reads `carrier.users[0].user.email` directly, no fallback — trusting the invariant that `signup` is the only path that creates a `Carrier`, and it always creates exactly one `MANAGER` in the same transaction.

### Scoped out of this slice, on purpose

Mirroring the same honesty `SCREENS.md`'s "Known Gaps" section already practices for sellers: this slice does **not** implement `invites/` (operator invitation, token/expiry), `CarrierCoverageArea`, or `CarrierModality` — none of them have real logic yet, so `GET /carriers/:id` returns only the `Carrier`'s own fields plus the manager's email, not the fuller "Carrier Detail" admin screen described in `SCREENS.md` (which also lists coverage areas, modalities, the full `CarrierUser` sub-list, and pending invites). There's also no "manager views their own company" endpoint yet (e.g. `GET /carriers/me`), matching the precedent that sellers don't have a self-view endpoint either — both wait for their respective Dashboard slices.

**Validated end-to-end, including RBAC denial, same habit as §16.1:** signed up two carriers via `curl`, confirmed in Postgres that `User` + `Carrier` + `CarrierUser` (role `MANAGER`) were all written with the right relationships; tested duplicate document (409, generic message) and a fully-invalid DTO (400, all 4 messages); logged in as admin and exercised `GET /carriers` (both `PENDING`), `?status=PENDING` filter, `GET /carriers/:id` (200) and a nonexistent id (404), approved one carrier and rejected the other, confirmed re-approving returns 409; logged in as the now-approved carrier manager and confirmed `GET /carriers` and `PATCH .../approve` both return 403, confirmed no token returns 401; confirmed `/docs-json` lists all 5 `/carriers*` paths. Test data removed from the database afterward.

## 18. Scale — Pagination and Indexing

Both prompted by the same question: two custom code-review subagents were written for this project (`.claude/agents/nextjs-reviewer.md`, `.claude/agents/nestjs-reviewer.md`), and running the NestJS one against the `sellers`/`carriers` diff surfaced two sub-80-confidence observations — no pagination on `GET /sellers`/`GET /carriers`, and no index backing the `?status=` filter. Correctly scored low for a portfolio project's *current* data volume, but the project's own stated goal (§1) is demonstrating seniority and scale-awareness, not shipping the smallest thing that works today — so both were built anyway, and the "why" is worth recording precisely because a reviewer (human or agent) would otherwise read them as premature optimization.

### Pagination — offset-based, deliberately not cursor-based

`GET /sellers` and `GET /carriers` now accept `?page=`/`?limit=` (default 20, capped at 100 via `@Max(100)` — a client can't request the whole table in one call), returning `{ data: T[], meta: { total, page, limit, totalPages } }`. Shared, not duplicated per module: `PaginationQueryDto` (`src/shared/pagination/`) is `extend`ed by each module's list-query DTO alongside its own `status` filter; `paginate()` builds the response envelope; `ApiPaginatedResponse(Model)` is a reusable Swagger decorator (`ApiExtraModels` + a manual `allOf`/`$ref` schema) so the generated OpenAPI spec correctly documents the generic `{ data: [...], meta: {...} }` shape per model, instead of lying about the response being a bare array.

**Why offset, not cursor/keyset pagination:** cursor pagination exists specifically to solve problems this project doesn't have yet — stable pagination under high write concurrency, and avoiding `OFFSET`'s cost on very large tables. These are admin list screens with page-number navigation in the UI (`SCREENS.md`), not an infinite-scroll feed, and the realistic row count (registered companies, not user-generated content) stays small enough that `OFFSET` cost is a non-issue. Building cursor pagination here would be solving an imagined problem instead of the real one — the same anti-pattern already rejected once in this project for a different reason (§12's monorepo-tooling decision). **Trigger to revisit:** if `Shipment` (expected to actually grow) ever needs a paginated list, that's the one where cursor-based pagination would earn its complexity — not `sellers`/`carriers`.

**`Promise.all` for the count, not sequential `await`s:** `findMany` and `count` are independent reads against the same `where` — awaiting them one after another would double the round-trip for no reason.

### Indexing — audited the whole schema, not just the two flagged columns

Once auditing indexes, doing it schema-wide (not patching only what a reviewer happened to flag) is what actually demonstrates the scale-thinking this section is about. Nine indexes added in migration `20260708175740_add_scale_indexes`, each tied to a real, already-documented access pattern — not a blanket "index everything":

- **`Seller.status` / `Carrier.status`** — the exact `?status=` filter in §16.1/§17.
- **`CarrierUser(carrierId, role)`** — composite matching the literal shape of `managerInclude`'s query (`where: { carrierId, role: MANAGER }`), run on every carriers list/detail/approve/reject call, not a generic guess.
- **`Invite(carrierId, status)`** — anticipates Operator Management (`SCREENS.md`) before it's built; `token` already gets its own index via `@unique` for the accept-flow lookup.
- **`CarrierCoverageArea(state, city)`** — the one genuinely non-obvious case: the existing `@@unique([carrierId, state, city])` only serves lookups that *start* with `carrierId` (btree leftmost-prefix rule), but the real query at shipment-creation time (§10) runs in the opposite direction — "given this address's state/city, which carriers cover it?" — `carrierId` is what's being solved for, not a known filter. Without this index, that query sequential-scans the whole table on every shipment created.
- **`CarrierModality(modalityId)`** — same leftmost-prefix reasoning, for "carriers offering modality Y" at shipment-creation time. **Deliberately not added to `SellerModality`** — there's no documented "sellers using modality Y" query, and an index with no real access pattern behind it is its own anti-pattern (write overhead, storage, no read ever benefits).
- **`Shipment(sellerId, status)` / `Shipment(carrierId, status)` / `Shipment(ownerId)`** — the two highest-traffic reads in the product (Seller's own Shipments List, Carrier's shared queue), on the one table §12 already singled out by name as the one expected to actually grow.
- **`TrackingEvent(shipmentId, createdAt)`** — composite, not just `shipmentId`: Shipment Detail always reads one shipment's full timeline pre-sorted by time, so this index serves the filter *and* the sort order in the same index scan, no separate sort step.

**Validated for real, not just "the migration applied":** ran `\di` in `psql` to confirm all 10 indexes exist (9 new + reused `Seller_status_idx` naming), then `EXPLAIN` on the exact `?status=PENDING` query and confirmed the planner actually chooses `Bitmap Index Scan on "Seller_status_idx"` — an index existing and an index being *used* are two different claims, only the second one is worth anything. Re-tested pagination end-to-end via `curl` (5 seeded sellers, `?limit=2&page=1` vs `page=2` return disjoint sets, `meta.totalPages` correct, `?limit=500` rejected with 400 by the `@Max(100)` cap). Test data removed afterward.

## 19. Shipments — the Core Business-Logic Slice

Before touching `POST /shipments` itself, its real dependency chain had to exist: the "most business-logic-loaded screen" (`SCREENS.md`) cross-references `SellerModality`, `CarrierModality`, and `CarrierCoverageArea` — none of which had an endpoint yet, and two of which (`CarrierModality`/`CarrierCoverageArea`) had no speced screen at all (a real gap, not a deliberate one — closed in `SCREENS.md` alongside this slice). Rather than fake the data or hand-wave the matching logic, the whole chain was built first, same vertical-slice discipline as every prior domain.

### The prerequisite chain

- **`DeliveryModality` catalog** — seeded (`prisma/seed.ts`: `STANDARD`/`FULL`/`EXPRESS`), not CRUD'd — it's reference data with no speced management screen, so a write endpoint would be inventing a contract nobody asked for (same principle as §15's Swagger restraint). A simple authenticated `GET /delivery-modalities` exists because the frontend needs to read it (populate dropdowns/toggles).
- **Ownership-based `GET /sellers/me` and `GET /carriers/me`** — the pattern promised back in §16 ("the carrier endpoints will need it") finally has a real caller. `Seller` is reached directly from `userId` (`@unique`); `Carrier` goes through `CarrierUser` first (`findCarrierIdForUserOrThrow`), since a `Carrier` has no direct FK to a `User`. `GET /carriers/me` is open to both `CARRIER_MANAGER` and `CARRIER_OPERATOR` — viewing your own company isn't a manager-only action, only *changing* it is (see below).
- **`SellerModality` / `CarrierModality` / `CarrierCoverageArea` self-service** — `GET`/`PUT` under `/sellers/me/modalities`, `/carriers/me/modalities`, `/carriers/me/coverage-areas`. **Mutation is `CARRIER_MANAGER`-only** for the carrier side (mirrors Operator Management's existing manager-only precedent — operators execute deliveries, they don't configure the company), while reads stay open to both roles. All three `PUT`s use **full-replace semantics** — the client always submits the complete desired set (a checkbox list, a coverage-area list), not incremental enable/disable calls — which removes any risk of client/server state drifting apart from a missed intermediate request. `SetCoverageAreasDto` uses `skipDuplicates: true` on the recreate step since nothing stops a client from submitting the same `(state, city)` pair twice in one request, which would otherwise hit `@@unique([carrierId, state, city])` on the second insert.

### `POST /shipments` — re-validating everything, not trusting the preview

`GET /shipments/eligible-carriers?state=&city=&modalityId=` cross-references `CarrierCoverageArea` + `CarrierModality` + `Carrier.status = APPROVED` and returns the matching carriers for the seller to pick from manually (§10's already-documented decision: not automatic assignment). **`city` is required on this query, not optional** — it mirrors `Shipment.addressCity`, which is never optional on the real record, so the preview can't promise something the real create wouldn't accept.

The critical design point: `GET /shipments/eligible-carriers` and `POST /shipments` are two independent HTTP calls. Nothing enforces that a client actually used the preview's result before submitting a `carrierId` — a malicious or buggy client could submit any `carrierId` directly. So `SellersService.create` re-runs every constraint the preview represents, server-side, against the exact submitted request: seller exists and is `APPROVED`; the chosen `modalityId` is in that seller's own enabled `SellerModality` set; the chosen `carrierId` is `APPROVED`, covers the submitted address, and offers the submitted modality. Only after all of that does it write the `Shipment` row. This is the same "don't trust the client's prior step" instinct as re-validating a JWT's claims against the database (§11) — a read endpoint's result is a suggestion to the UI, not a security boundary.

**Tracking code**: `TMS-` + 12 hex chars from `crypto.randomBytes(6)` (Node's built-in `node:crypto`, not a dependency). No collision-retry loop — at this entropy (16^12 combinations) the collision probability is astronomically below the point where handling it would be anything but theater, same reasoning already applied to trusting UUIDs elsewhere in this project.

### Reading shipments back — ownership violations return 404, not 403

`GET /shipments` (paginated, optional `?status=`) and `GET /shipments/:id` are both scoped to `sellerId` **inside the query itself** (`findFirst({ where: { id, sellerId } })`), not fetched-then-checked. A shipment belonging to a different seller produces the exact same `404 Shipment not found` as one that doesn't exist at all — deliberately not a `403`, which would confirm the id refers to a real record owned by someone else. Same enumeration-avoidance principle as the signup conflict-message fix (§16), applied to ownership instead of uniqueness.

### Scoped out of this slice, on purpose

The carrier-side queue (claim an unowned shipment, update `status` through the state machine, write `TrackingEvent`s) is a distinct, real-time-flavored slice — it needs the WebSocket/Redis pub-sub infrastructure (§5) that doesn't exist yet, plus its own ownership rule (`ownerId` claim semantics, §3). Building it against a fake/polling stand-in now would mean rebuilding it once tracking exists for real. Also out of scope: shipment cancellation (already an open product decision per `SCREENS.md`'s "Known Gaps").

**Validated end-to-end, the established habit:** seeded/approved a real seller and carrier via `curl`, set the carrier's `CarrierModality`+`CarrierCoverageArea` for `SP`/`São Paulo`/`STANDARD` and the seller's enabled modality; confirmed `GET /shipments/eligible-carriers` returns the carrier for a matching address and an empty array for a non-covered one (`RJ`); created a real shipment and confirmed the response and a follow-up `GET /shipments/:id` match; confirmed a second `POST /shipments` for a non-covered address returns 400 from the server-side re-validation (not the preview); confirmed a `PENDING` (not yet approved) seller gets 400 on create; confirmed a *different* seller gets 404 (not 403) on the first seller's shipment, and their own list is correctly empty; confirmed a carrier manager gets 403 on `POST /shipments` (role-gated to `SELLER`) and no token gets 401; confirmed `/docs-json` lists all 3 `/shipments*` paths. Test data removed from the database afterward.

### Case-sensitivity bug, found during frontend testing — normalize at write, not compare loosely everywhere

Found through actual use, not a code review: a carrier registered coverage for `"ARARAQUARA"` (caps), and a seller's shipment address typed `"Araraquara"` (title case) matched nothing — `state`/`city` comparisons were a plain Postgres exact-string match, case-sensitive by default. First fix attempt was `mode: 'insensitive'` on both fields in the Prisma query — functionally correct, but the wrong instinct for `state`, and worth recording why.

**The real question this raised: normalize at write time, or compare loosely at query time?** The two fields aren't the same kind of field, so the answer isn't uniform:

- **`state` (a UF code) — normalize to uppercase on write.** No display value is lost (`SP` has no "nicer" casing to preserve), and doing it at the DTO boundary (`@Transform(toUpperTrimmed)` on `CoverageAreaInputDto.state`, `CreateShipmentDto.addressState`, `EligibleCarriersQueryDto.state` — all three entry points, or normalization drifts) means the comparison in `ShipmentsService` stays a **plain, indexable equality** instead of a case-insensitive one.
- **`city` — keep it case-insensitive at query time, don't normalize on write.** Unlike a UF code, a city name has real display casing worth preserving ("São Paulo" shown back to a user beats "SÃO PAULO" or "são paulo"). Forcing a canonical case here would mean either losing that, or maintaining a second display-only column — not worth it at this scale.
- **`email` — same reasoning as `state`, applied elsewhere:** a case-varied duplicate account (`User@Example.com` vs. `user@example.com`) is a real, not theoretical, bug given `email` is `@unique` — normalized to lowercase at the same three-DTO pattern (`LoginDto`, `CreateSellerDto`, `CreateCarrierDto`), via a shared `toLowerTrimmed`/`toUpperTrimmed` pair in `src/shared/transforms/normalize.ts` rather than four near-identical inline lambdas (the duplication itself was already a small smell before the fix — one call site getting the transform and another not is exactly how this class of bug reappears).

**Verified the index story wasn't quietly undone by the case-insensitive `city` filter** (the `@@index([state, city])` composite from § 18): `EXPLAIN` on the real table confirms the planner still uses `Bitmap Index Scan on "CarrierCoverageArea_state_city_idx"` for the (now plain, normalized) `state` equality, applying the `city ILIKE` check only as a `Filter` step on that already-narrowed row set — not a full sequential scan. Normalizing `state` is what restored this; leaving `city` case-insensitive doesn't cost the index, since it's the second, non-leading column being filtered post-scan, not the entry point into the index.

## 20. Carrier Queue & Real-Time Tracking (backend)

The slice §19 deliberately deferred: claiming an unowned shipment, advancing it through the `ShipmentStatus` state machine, and pushing every change live over WebSocket + Redis pub/sub — the architecture §1/§5/§6 call the project's technical core. **Backend only in this pass** — the carrier queue UI and the seller/carrier live timeline are the next slice.

### The state machine, and a bug the map alone can't prevent

`src/modules/shipments/shipment-status.util.ts` — `ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]>`, forward-only plus the one documented failure branch (`OUT_FOR_DELIVERY → DELIVERED | FAILED_DELIVERY → RETURNED`). `CANCELLED` has no inbound transition here on purpose — cancellation rules are still an open product decision (`SCREENS.md`'s Known Gaps), not this slice's call.

A real authorization/state-machine interaction bug surfaced while designing `ShipmentsService.updateStatus`, not while coding it defensively after the fact: the map alone says `PENDING → ACCEPTED` is "valid" (needed for `isValidTransition`'s own exhaustive unit test and as the frontend's future UI mirror), and a `CARRIER_MANAGER` is allowed to act on *any* shipment in their carrier to unblock operations. Combined naively, a manager could call `PATCH /shipments/:id/status {status: ACCEPTED}` on a still-unowned `PENDING` shipment — passing both checks individually, but flipping `status` without ever setting `ownerId`, corrupting the "`ACCEPTED` implies owned" invariant the whole queue depends on. Fixed with an explicit guard in `updateStatus` that rejects a `PENDING` shipment outright (400, pointing at `/claim` instead), independent of role or the transition map's own answer. Covered by a dedicated unit test for both actor roles, and re-confirmed live via `curl` (manager `PATCH .../status {ACCEPTED}` on a fresh `PENDING` shipment → 400, row left untouched).

### Ownership rule: claim is open, update is owner-or-manager

Mirrors DESIGN.md § 3 exactly, and is a **deliberate departure** from the manager-only-mutation convention used for `CarrierModality`/`CarrierCoverageArea` (§19): those are company-wide config, this is a per-shipment operational action. `claim()` — any `CARRIER_MANAGER` or `CARRIER_OPERATOR` of the carrier, only if `ownerId` is still null (409 if already claimed, same "re-deciding is a conflict, not a silent no-op" precedent as §16.1). `updateStatus()` — the owning `CarrierUser`, or any manager; a non-owning operator gets 403. No unique constraint stops two operators from both reading `ownerId: null` before either writes — a real double-claim race exists at this pre-check-then-write shape, accepted as a known, documented limitation at this project's scale rather than silently assumed airtight.

New routes on the existing `ShipmentsController` (`GET queue`, `GET queue/:id`, `PATCH :id/claim`, `PATCH :id/status`), declared before `findOne(':id')` — same house style `carriers.controller.ts` already established (`me`/`me/modalities` before `:id/*`). `CarrierShipmentResponseDto` is a distinct class from the seller-facing `ShipmentResponseDto` (seller contact + owner info the seller's own view has no business seeing about itself); both response shapes' single-record read gets an **optional** `trackingEvents` field, deliberately left off the paginated list mapper to avoid pulling a full event history onto every row of a 20-row page (same over-fetch-avoidance instinct as § 18).

### Real-time: WebSocket + Redis, for real, not a single-instance stand-in

`EventEmitterModule.forRoot()` has been globally registered since `app.module.ts`'s first commit with zero consumers — this is that first consumer. `ShipmentsService` emits `shipment.status-changed` after both `claim()`/`updateStatus()` commit; a separate `TrackingListener` (kept apart from the gateway so the fan-out logic is unit-testable without a real socket) relays it to two Socket.IO rooms per event: `shipment:{id}` (the seller and carrier viewing that one shipment) and `carrier:{carrierId}` (the queue list view). New `TrackingModule` (`imports: [AuthModule]`, reusing its already-exported `JwtModule` rather than a second `registerAsync`) hosts `TrackingGateway` + `TrackingListener`; the previously-empty `tracking.service.ts` stub is gone, replaced by real logic instead of being kept around unused.

**A race condition found through actual connection, not a code read.** The first working version verified a socket's JWT inside Nest's `handleConnection` lifecycle hook — which looked right and passed unit tests, but manual testing (a script opening a real socket and subscribing immediately) showed messages sent right after the client's `'connect'` event would arrive with `client.data` still empty. Root cause: Socket.IO emits `'connect'` client-side as soon as the handshake itself completes, *without* waiting for `handleConnection`'s promise (two DB round-trips: reload the user, resolve their seller/carrier) to settle — a client subscribing immediately after connecting can race ahead of its own auth resolution. Guards don't help here either: `CanActivate` only wraps `@SubscribeMessage` handlers, never `handleConnection`. Fixed by moving auth into a Socket.IO **connection middleware** (`server.use(...)`, registered in `afterInit`) — Socket.IO awaits middleware before ever emitting `'connect'`, closing the race at its source instead of adding a synthetic ready-signal round-trip. Reconfirmed with the same script: a valid token now always has `client.data` populated by the time any message could possibly arrive; a bad/missing token surfaces as `'connect_error'` and never reaches `'connect'` at all.

Room-membership checks (`@SubscribeMessage('subscribe:shipment')`/`'subscribe:queue'`) re-run the same ownership scoping as every REST endpoint — a seller subscribing to another seller's shipment room, or a carrier user to another carrier's queue, is silently rejected (no join), not just relied upon to never be attempted.

**Redis, built for the reason § 1/§ 6 state, not skipped as premature for a single dev instance.** `src/shared/websocket/redis-io.adapter.ts` (`RedisIoAdapter extends IoAdapter`) connects two `ioredis` clients (pub/sub, via `.duplicate()`) and installs `@socket.io/redis-adapter`'s `createAdapter(...)` on the Socket.IO server — every `.to(room).emit(...)` call now publishes to Redis, and every instance subscribed to the same channel delivers to its own local sockets, which is the actual cross-instance mechanism a horizontally-scaled deployment needs (§5's diagram), not a manual pub/sub side-channel. CORS for the gateway is resolved inside the adapter's `createIOServer` override via real `ConfigService` injection (the adapter already holds a reference to the Nest `app`) rather than reading `process.env` directly in the `@WebSocketGateway()` decorator, which is evaluated before `ConfigService` exists. New `REDIS_URL` env var (`z.url().default('redis://localhost:6379')`, matching the existing bare-no-auth Redis in `docker-compose.yml`).

**Validated end-to-end, including the parts a passing test suite can't confirm on its own:** seeded/approved a seller, a carrier manager, and (via a direct DB insert — no invite flow exists yet, same documented gap as testing `CARRIER_OPERATOR` elsewhere) two carrier operators on the same carrier. Confirmed via `curl`+`psql`: queue list/detail scoped correctly, cross-carrier access 404s, claim sets `ownerId`+writes a `TrackingEvent` and re-claiming 409s, a non-owning operator gets 403 on status update while the owner and the manager both succeed, an out-of-order transition 400s naming both statuses, and — the specific regression above — a manager can't silently flip a `PENDING` shipment to `ACCEPTED` without claiming it first. Confirmed via a real `socket.io-client` script (no frontend exists yet to drive this by hand): a valid token connects and an invalid one is rejected pre-`'connect'`; subscribing to another seller's shipment room or joining a foreign carrier's queue is silently refused; triggering a real status change over REST delivers `shipment:updated` to both the `shipment:{id}` and `carrier:{carrierId}` rooms; and, after a full process restart (simulating a second instance coming up), the Redis adapter reconnects cleanly and the same round-trip still works with no code change. Test data removed from the database afterward.

**Known gap, not yet closed:** Socket.IO event payloads (`shipment:updated`) aren't part of the `/docs-json` OpenAPI contract — Swagger has no equivalent for WS messages. Worth a manual note in whatever contract documentation the frontend slice ends up needing, not a blocker for this slice.
