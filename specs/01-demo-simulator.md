# Feature Specification: Demo Simulator and Daily Reset

**Feature**: `demo-simulator` — module `SimulatorModule`
**Created**: 2026-11-03
**Status**: Implemented
**Design reference**: `DESIGN.md` §10 (status machine), §15 (carrier queue and real-time tracking); `apps/api/src/modules/simulator/demo-dataset.ts` (demo dataset, shared with `apps/api/prisma/seed.ts`)

## Summary

A background process that operates the public demo on its own: the demo carrier claims and advances shipments, the demo sellers create new ones, and once a day the demo tenant is restored to a fresh seed. A visitor opening any dashboard sees live activity within seconds, without opening a second tab or knowing which buttons to press, and never finds the demo in a state left behind by a previous visitor.

## User Stories *(mandatory)*

### User Story 1 - Live activity without doing anything (Priority: P1)

A visitor signs in as a demo seller (or opens the carrier queue, the admin monitoring screen or a public tracking page) and, within a few seconds, sees a shipment change status on screen: a row moves, the activity feed gains an entry, a stat updates.

**Why this priority**: the real-time architecture is the project's technical core (`DESIGN.md` §5), and today it is only visible to someone who drives two sessions at once. This is the single change with the largest effect on what a visitor perceives.

**Independent test**: with `DEMO_SIMULATOR=true`, sign in as `seller@demo.minitms.dev`, keep the overview open without interacting for 30 s, and confirm a shipment status change arrives over the socket and renders within the first seconds, with more following while the page stays open.

**Acceptance scenarios**:

1. **Given** the simulator is enabled and at least one client is connected, **when** a tick runs, **then** it performs one or more domain actions (claim, advance, create) through the same service methods a human uses, producing the same `TrackingEvent` rows and socket events.
2. **Given** no client is connected to either socket namespace, **when** a tick runs, **then** it performs no action and writes nothing.
3. **Given** a shipment reaches `OUT_FOR_DELIVERY` through the simulator, **when** it is next advanced, **then** it ends `DELIVERED` in most cases and `FAILED_DELIVERY` in a minority, and a `FAILED_DELIVERY` shipment is later advanced to `RETURNED`.

---

### User Story 2 - The demo is clean every day (Priority: P1)

The shipments of the two demo sellers are restored to the seed once a day: shipments created or advanced by visitors disappear, and the seeded shipments get fresh timestamps relative to the reset time, so SLA figures are plausible instead of "103 d late".

**Why this priority**: the seed computes timestamps relative to when it ran and skips shipments that already exist, so without a reset the demo decays over time and visitor-created data accumulates on the demo accounts. Both are visible on the first screen a visitor sees.

**Independent test**: create a shipment as the demo seller, run the reset, and confirm the shipment is gone, the seeded tracking codes exist with timestamps relative to now, and non-demo data is untouched.

**Acceptance scenarios**:

1. **Given** the reset runs, **when** it completes, **then** every shipment (and its tracking events) belonging to a demo seller is deleted and the demo shipment plan from the seed is recreated with timestamps relative to the reset time.
2. **Given** a seller or carrier that is not part of the demo tenant, **when** the reset runs, **then** none of its rows are read for deletion or modified.
3. **Given** clients are connected when the reset completes, **when** they receive the reset event, **then** the web app refetches its data and, in the signed-in app, shows a short notice that the demo data was reset.
4. **Given** the API was not running at the scheduled time (sleeping or redeploying), **when** it starts and no reset is recorded or the last successful one is older than 24 h, **then** it runs the reset once at startup.

---

### User Story 3 - The admin can reset on demand (Priority: P3)

The platform admin can trigger the same reset through the admin API, to restore the demo before showing it to someone.

**Why this priority**: convenience for the project owner; the daily reset already covers the visitor-facing need.

**Independent test**: as admin, call the reset endpoint and confirm the same outcome as User Story 2.

**Acceptance scenarios**:

1. **Given** an authenticated admin, **when** they trigger the reset, **then** it runs through the same job as the scheduled one and the response reports when it finished.
2. **Given** any non-admin role, **when** it calls the reset endpoint, **then** it receives 403.

---

### Edge Cases

- A tick picks a shipment that a visitor advanced or cancelled a moment earlier: the existing conditional write (`transitionWithEvent`, 409 on conflict) rejects it, and the tick skips that action.
- A visitor cancels a pending shipment the simulator was about to claim: same as above.
- Several API instances run at once: each tick and each reset is executed by exactly one instance.
- Redis is unavailable: ticks and resets do not run; the API keeps serving requests (same fail-fast behavior as `RedisModule`).
- The demo tenant does not exist (seed ran without `SEED_DEMO=true`): the simulator logs once and stays idle; it never creates demo accounts itself.
- The number of non-terminal demo shipments reaches the cap: ticks only advance and claim; they do not create.
- The reset overlaps a tick: ticks and the reset share one queue limited to one job at a time, so no tick runs while the tenant is being rebuilt.

## Functional Requirements *(mandatory)*

- **FR-001**: The simulator MUST run only when `DEMO_SIMULATOR=true`. With the variable unset, no queue, worker or scheduled job is registered.
- **FR-002**: The simulator MUST act only on the demo tenant: shipments whose seller is one of the demo sellers and whose carrier is the demo carrier, identified by the demo account emails in `demo-dataset.ts`.
- **FR-003**: Every simulated action MUST go through the existing `ShipmentsService` methods (`create`, `claim`, `updateStatus`) as the corresponding demo user, so authorization rules, the status machine (`ALLOWED_TRANSITIONS`), `TrackingEvent` history and `SHIPMENT_UPDATED` events are identical to human actions.
- **FR-004**: A tick MUST run every 10 s, and once more right after a client connects to either namespace, at most once per 10 s for those extra ticks. Every tick MUST skip all work when no client is connected to the default or the `/public` namespace on any API instance.
- **FR-005**: Each active tick MUST, in this order: advance the owned non-terminal shipment updated longest ago by one step; claim the oldest pending shipment for a random demo operator; and, with a probability of 1/3, create one shipment for a random demo seller to a random seed address with a random demo modality and the demo carrier — subject to FR-006. Each step acts on at most one shipment.
- **FR-006**: Creation MUST stop while the demo tenant has 24 or more non-terminal shipments.
- **FR-007**: From `OUT_FOR_DELIVERY`, the simulator MUST choose `FAILED_DELIVERY` with a probability of 0.08 and `DELIVERED` otherwise. A `FAILED_DELIVERY` shipment MUST be advanced to `RETURNED`.
- **FR-008**: Simulated status changes MUST carry the same note texts the seed uses per status (`STATUS_NOTES` in `demo-dataset.ts`).
- **FR-009**: The simulator MUST NOT cancel shipments; cancellation stays a seller-only human action (`DESIGN.md` §14).
- **FR-010**: The reset MUST run daily at 04:00 `America/Sao_Paulo`, and at startup when no reset is recorded or the last successful one is older than 24 h.
- **FR-011**: The reset MUST delete, in one batched transaction, all `TrackingEvent` and `Shipment` rows whose seller is a demo seller (whatever the carrier), then bulk-recreate the seed's demo shipment plan with timestamps relative to the reset time. Demo users, sellers, carrier, coverage areas and modalities are kept.
- **FR-012**: Ticks and the reset MUST never run concurrently, and each scheduled run MUST execute on exactly one API instance.
- **FR-013**: After a reset, the API MUST emit `demo:reset` to every connected client of both namespaces. The web app MUST invalidate all queries on that event and, in the signed-in app, show a toast "Demo data was reset".
- **FR-014**: The admin API MUST expose `POST /admin/demo/reset` (`ADMIN` only), answering 204 once the reset has finished; the route does not exist (404) when `DEMO_SIMULATOR` is off. It MUST enqueue the reset job and wait for its result.
- **FR-015**: `prisma/seed.ts` and the reset MUST build the demo shipment plan from the same code, so the seeded dataset and the reset dataset cannot drift.

### Key Entities

- **`Shipment`**, **`TrackingEvent`** (`schema.prisma`): read and written through `ShipmentsService`; deleted and recreated by the reset.
- No new model. The last reset time lives in Redis; jobs and schedules live in BullMQ's Redis keys.

## Success Criteria *(mandatory)*

- **SC-001**: A client that connects sees its first status change within 3 s; while it stays connected, a status change reaches it within 15 s in 95% of 15 s windows observed over 10 minutes.
- **SC-002**: With no client connected, the simulator performs zero database writes over a 10 minute window.
- **SC-003**: After a reset, no demo shipment is more than its modality's SLA late unless the seed plan defines it as late.
- **SC-004**: Reset of the demo tenant completes in under 5 s against the production database.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/shared/queue/queue.module.ts`: `BullModule.forRootAsync` with `REDIS_URL`. BullMQ opens its own connections, since workers need `maxRetriesPerRequest: null` and `REDIS_CLIENT` fails fast.
  - `src/modules/simulator/`, loaded through `ConditionalModule.registerWhen` only when `DEMO_SIMULATOR=true` (FR-001):
    - `simulator.scheduler.ts`: at bootstrap, global concurrency 1 on the `demo` queue, job schedulers `tick` (every 10 s) and `reset` (`0 4 * * *`, `America/Sao_Paulo`), and the startup catch-up (FR-010); `tickSoon()` on `VIEWER_CONNECTED`, deduplicated for 10 s (FR-004); `resetNow()` for the admin route.
    - `simulator.processor.ts`: BullMQ worker dispatching `tick` and `reset`.
    - `simulator.service.ts`: the tick (FR-004–FR-009), acting through `ShipmentsService`.
    - `demo-reset.service.ts`: the reset as one batched transaction (two `deleteMany`, two `createMany`, ids generated in the service), the last-reset mark in Redis and the `DEMO_RESET` domain event.
    - `demo-tenant.service.ts`: loads the demo sellers, carrier users and modalities by the seed emails and codes; `null` when they were never seeded.
    - `demo-dataset.ts`: the demo accounts, addresses, notes and `buildDemoShipments`, shared with `prisma/seed.ts` (FR-015).
    - `demo-reset.controller.ts`: `POST /admin/demo/reset`, `@Auth(GlobalRole.ADMIN)`.
- **Viewer detection (FR-004)**: `TrackingPresence` in `TrackingModule`, `fetchSockets()` on both namespaces through the Redis adapter, so the count covers every instance. Both gateways emit the `VIEWER_CONNECTED` domain event on each connection.
- **Mutual exclusion (FR-012)**: `queue.setGlobalConcurrency(1)` on the `demo` queue; ticks, scheduled resets and manual resets all go through it. BullMQ delivers each job to a single worker.
- **Web (`apps/web`)**: `lib/demo-reset.ts` invalidates every query and shows a single toast (shared id); `services/websocket-client.ts` registers it on each socket when created. The toast renders where the `Toaster` is mounted (the signed-in app shell); the public tracking page refetches only.
- **Prisma models touched**: `Shipment`, `TrackingEvent` (read, write, delete). No migration.
- **Real-time**: new server-to-client event `demo:reset` on `/` and `/public`, emitted by `TrackingListener` from the `DEMO_RESET` domain event. Existing events unchanged.
- **New dependencies**: `bullmq` and `@nestjs/bullmq` in `apps/api`. Repeatable jobs with single execution across instances and global concurrency are what this needs; `@nestjs/schedule` runs on every instance and would need its own coordination.
- **Configuration**:
  - `DEMO_SIMULATOR` (`true` / `false`, validated): `.env.example` (on), Railway production (on). Requires `SEED_DEMO=true`.
  - BullMQ reuses `REDIS_URL`.

## Out of Scope

- Deleting accounts created by visitors through public signup (sellers and carriers outside the demo tenant). They are not demo data and are left for the admin approval flow.
- Simulated activity for non-demo tenants.
- Movement on a map (spec `03-live-map`) and outbound webhooks (spec `02-public-api-webhooks`); both consume the events this spec produces.
- A visual marker distinguishing simulated from human actions.

## Assumptions and Dependencies

- The API service runs always on (Railway sleep disabled): the BullMQ worker keeps a Redis connection open, and an always-on API answers the first visit without a cold start. Idle cost stays low because ticks write nothing without viewers (FR-004). FR-010's startup catch-up still covers redeploys.
- The demo tenant is identified by the emails in `demo-dataset.ts`, which the seed and the simulator both read.
- The seed's deterministic PRNG (`mulberry32(42)`) is kept for the dataset plan; simulator choices use `Math.random`.

## Notes for the AI Agent

- The demo plan lives in `demo-dataset.ts`; a change to it changes the seed, the reset and the golden values in `demo-dataset.spec.ts`.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`.
- Record the BullMQ adoption and the "simulator acts through the domain service" decision in `DESIGN.md`.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created |
| 2026-11-03 | Mutual exclusion through the queue's global concurrency instead of a hand-rolled Redis lock (FR-012) |
| 2026-11-03 | Reset scope narrowed to shipments of demo sellers, so non-demo sellers are never touched (FR-011) |
| 2026-11-03 | Creation chance per active tick (1/3) instead of every third tick, so ticks keep no state (FR-005) |
| 2026-11-03 | Reset schedule expressed in `America/Sao_Paulo` (FR-010) |
| 2026-11-03 | Simulated shipments use the demo carrier directly; `ShipmentsService.create` still validates coverage and modality |
| 2026-11-03 | Toast limited to the signed-in app, where the `Toaster` lives; the public page refetches only (FR-013) |
| 2026-11-03 | Implemented |
| 2026-11-03 | Tick every 10 s plus one right after a client connects, so a visitor sees movement within seconds (FR-004, SC-001) |
| 2026-11-03 | Reset as a batched transaction with bulk inserts, so it stays within the transaction limits on a remote database (FR-011) |
