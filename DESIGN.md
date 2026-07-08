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

`sellers` was chosen to come out of skeleton status first (instead of `carriers`) for being the simplest flow to close end-to-end: public self-signup → `status: PENDING`, without the extra complexity of `CarrierUser`/`Invite`. `POST /sellers` implemented; the rest of the flow (multi-step onboarding, admin approval) is left for the next steps.

### Ownership-Based Authorization, Not Just Role-Based

Before writing the first endpoint, it was worth separating two things that looked like the same one: the RBAC **mechanism** (`JwtAuthGuard`/`RolesGuard`, already in place and generic — it knows nothing about seller/carrier specifically) and **ownership-based authorization** (a seller can only see their own record, not someone else's). The second one has no possible generic guard — every entity has a different owner FK (`Shipment.sellerId`, `Seller.userId`, etc.) — so that check lives in each module's service, not in a reusable piece. `POST /sellers` itself doesn't need this check (it's public, no authenticated user yet), but the pattern is recorded here because `GET /sellers/:id` (a seller's own view) and the carrier endpoints will need it.

### `PasswordService` Extracted from `AuthModule`

`bcrypt.hash`/`bcrypt.compare` now live in `src/shared/password/` (`PasswordService`, a `@Global()` module like `PrismaModule`) — before, only `compare` existed inside `AuthService` for login; signup needs `hash`. Extracting it avoids duplicating the magic salt-rounds number in two places, and it's ready for when `carriers` needs the same thing. `AuthService` was migrated to inject `PasswordService` instead of calling `bcrypt` directly — `auth.service.spec.ts` adjusted to provide a real `PasswordService` (not mocked, same spirit as already using real bcrypt in the test).

### `SellersService.signup`

- A transaction (`prisma.$transaction`) creates `User` (`role: SELLER`) and `Seller` together — both have to exist or neither does; there's no room for an orphaned `User` with no `Seller` if the second write fails.
- Duplicate email and document are caught via `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` (the database's unique constraint) and converted into a `ConflictException` (409) with a readable message, including which field collided (`error.meta.target`) — instead of leaking Prisma's raw error to the client.
- The return value is an explicitly built object (`SellerResponseDto`), not the raw Prisma record — guarantees `passwordHash` can never show up in the response, even if the query/relations change later.
- `@IsNotEmpty()` on `companyName`/`document` in addition to `@IsString()` — found by testing on purpose with an empty string: `@IsString()` alone accepts `""`.

**Validated end-to-end, not just unit tests with mocks:** booted the real application, created a seller via `curl`, confirmed in Postgres (`psql`) that `User` and `Seller` were written correctly with the right relationship; tested duplicate email and duplicate document (two separate `curl` calls, both 409); tested a DTO with every field invalid at once (400 with all 4 messages); confirmed in `/docs-json` that `/sellers` and the new schemas show up in the contract. Test data removed from the database afterward.
