# Feature Specification: Demo Simulator and Daily Reset

**Feature**: `demo-simulator` — module `SimulatorModule`
**Created**: 2026-11-03
**Status**: Draft — Not Implemented
**Design reference**: `DESIGN.md` §10 (status machine), §15 (carrier queue and real-time tracking); `apps/api/prisma/seed.ts` (demo dataset)

## Summary

A background process that operates the public demo on its own: the demo carrier claims and advances shipments, the demo sellers create new ones, and once a day the demo tenant is restored to a fresh seed. A visitor opening any dashboard sees live activity within seconds, without opening a second tab or knowing which buttons to press, and never finds the demo in a state left behind by a previous visitor.

## User Stories *(mandatory)*

### User Story 1 - Live activity without doing anything (Priority: P1)

A visitor signs in as a demo seller (or opens the carrier queue, the admin monitoring screen or a public tracking page) and, within half a minute, sees a shipment change status on screen: a row moves, the activity feed gains an entry, a stat updates.

**Why this priority**: the real-time architecture is the project's technical core (`DESIGN.md` §5), and today it is only visible to someone who drives two sessions at once. This is the single change with the largest effect on what a visitor perceives.

**Independent test**: with `DEMO_SIMULATOR=true`, sign in as `seller@demo.minitms.dev`, keep the overview open without interacting for 60 s, and confirm at least one shipment status change arrives over the socket and renders.

**Acceptance scenarios**:

1. **Given** the simulator is enabled and at least one client is connected, **when** a tick runs, **then** it performs one or more domain actions (claim, advance, create) through the same service methods a human uses, producing the same `TrackingEvent` rows and socket events.
2. **Given** no client is connected to either socket namespace, **when** a tick runs, **then** it performs no action and writes nothing.
3. **Given** a shipment reaches `OUT_FOR_DELIVERY` through the simulator, **when** it is next advanced, **then** it ends `DELIVERED` in most cases and `FAILED_DELIVERY` in a minority, and a `FAILED_DELIVERY` shipment is later advanced to `RETURNED`.

---

### User Story 2 - The demo is clean every day (Priority: P1)

The demo tenant (the two demo sellers and the demo carrier) is restored to the seed once a day: shipments created or advanced by visitors disappear, and the seeded shipments get fresh timestamps relative to the reset time, so SLA figures are plausible instead of "103 d late".

**Why this priority**: the seed computes timestamps relative to when it ran and skips shipments that already exist, so without a reset the demo decays over time and visitor-created data accumulates on the demo accounts. Both are visible on the first screen a visitor sees.

**Independent test**: create a shipment as the demo seller, run the reset, and confirm the shipment is gone, the seeded tracking codes exist with timestamps relative to now, and non-demo data is untouched.

**Acceptance scenarios**:

1. **Given** the reset runs, **when** it completes, **then** every shipment (and its tracking events) belonging to a demo seller or the demo carrier is deleted and the demo shipment plan from the seed is recreated with timestamps relative to the reset time.
2. **Given** a seller or carrier that is not part of the demo tenant, **when** the reset runs, **then** none of its rows are read for deletion or modified.
3. **Given** clients are connected when the reset completes, **when** they receive the reset event, **then** the web app refetches its data and shows a short notice that the demo data was reset.
4. **Given** the API was not running at the scheduled time (sleeping or redeploying), **when** it starts and the last successful reset is older than 24 h, **then** it runs the reset once at startup.

---

### User Story 3 - The admin can reset on demand (Priority: P3)

The platform admin can trigger the same reset from the admin area, to restore the demo before showing it to someone.

**Why this priority**: convenience for the project owner; the daily reset already covers the visitor-facing need.

**Independent test**: as admin, call the reset endpoint and confirm the same outcome as User Story 2.

**Acceptance scenarios**:

1. **Given** an authenticated admin, **when** they trigger the reset, **then** it runs through the same job as the scheduled one and the response reports when it finished.
2. **Given** any non-admin role, **when** it calls the reset endpoint, **then** it receives 403.

---

### Edge Cases

- A tick picks a shipment that a visitor advanced or cancelled a moment earlier: the existing conditional write (`transitionWithEvent`, 409 on conflict) rejects it, and the tick treats the conflict as a skipped action, not an error.
- A visitor cancels a pending shipment the simulator was about to claim: same as above.
- Several API instances run at once: each tick and each reset is executed by exactly one instance.
- Redis is unavailable: ticks and resets do not run; the API keeps serving requests (same fail-fast behavior as `RedisModule`).
- The demo tenant does not exist (seed ran without `SEED_DEMO=true`): the simulator logs once and stays idle; it never creates demo accounts itself.
- The number of non-terminal demo shipments reaches the cap: ticks only advance and claim; they do not create.
- The reset overlaps a tick: the reset holds the same lock as ticks, so no tick runs while the tenant is being rebuilt.

## Functional Requirements *(mandatory)*

- **FR-001**: The simulator MUST run only when `DEMO_SIMULATOR=true`. With the variable unset, no queue, worker or scheduled job is registered.
- **FR-002**: The simulator MUST act only on the demo tenant: shipments whose seller is one of the demo sellers and whose carrier is the demo carrier, identified by the demo account emails used in the seed.
- **FR-003**: Every simulated action MUST go through the existing `ShipmentsService` methods (`create`, `claim`, `updateStatus`) as the corresponding demo user, so authorization rules, the status machine (`ALLOWED_TRANSITIONS`), `TrackingEvent` history and `SHIPMENT_UPDATED` events are identical to human actions.
- **FR-004**: A tick MUST run every 20 s and MUST skip all work when no client is connected to the default or the `/public` namespace on any API instance.
- **FR-005**: Each active tick MUST perform, in order of preference: advance one non-terminal owned shipment one step; claim one pending shipment; every third active tick, create one shipment for a random demo seller to a random seed address with a random eligible modality — subject to FR-006.
- **FR-006**: Creation MUST stop while the demo tenant has 24 or more non-terminal shipments.
- **FR-007**: From `OUT_FOR_DELIVERY`, the simulator MUST choose `FAILED_DELIVERY` with a probability of 0.08 and `DELIVERED` otherwise. A `FAILED_DELIVERY` shipment MUST be advanced to `RETURNED`.
- **FR-008**: Simulated status changes MUST carry the same note texts the seed uses per status (`NOTES` in `seed.ts`).
- **FR-009**: The simulator MUST NOT cancel shipments; cancellation stays a seller-only human action (`DESIGN.md` §14).
- **FR-010**: The reset MUST run daily at 07:00 UTC (04:00 in São Paulo), and at startup when the last successful reset is older than 24 h.
- **FR-011**: The reset MUST delete, in one transaction, all `TrackingEvent` and `Shipment` rows of the demo tenant, then recreate the seed's demo shipment plan with timestamps relative to the reset time. Demo users, sellers, carrier, coverage areas and modalities are kept.
- **FR-012**: Ticks and the reset MUST share one distributed lock, so they never run concurrently, and each scheduled run MUST execute on exactly one API instance.
- **FR-013**: After a reset, the API MUST emit `demo:reset` to every connected client of both namespaces. The web app MUST invalidate all queries on that event and show a toast "Demo data was reset".
- **FR-014**: The admin API MUST expose `POST /admin/demo/reset` (`ADMIN` only), returning 404 when `DEMO_SIMULATOR` is off. It MUST enqueue the reset job and wait for its result.
- **FR-015**: `prisma/seed.ts` and the reset MUST build the demo shipment plan from the same code, so the seeded dataset and the reset dataset cannot drift.

### Key Entities

- **`Shipment`**, **`TrackingEvent`** (`schema.prisma`): read and written through `ShipmentsService`; deleted and recreated by the reset.
- No new model. The last reset time and the lock live in Redis.

## Success Criteria *(mandatory)*

- **SC-001**: With one client connected, a status change reaches that client within 30 s, in 95% of 30 s windows observed over 10 minutes.
- **SC-002**: With no client connected, the simulator performs zero database writes over a 10 minute window.
- **SC-003**: After a reset, no demo shipment is more than its modality's SLA late unless the seed plan defines it as late.
- **SC-004**: Reset of the demo tenant completes in under 5 s against the production database.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**: new `src/modules/simulator/`:
  - `simulator.module.ts` registers the queue and worker only when `DEMO_SIMULATOR=true` (FR-001).
  - `simulator.processor.ts`: BullMQ worker with two job names, `tick` (repeatable every 20 s) and `reset` (repeatable on cron `0 7 * * *` UTC, plus on-demand).
  - `simulator.service.ts`: picks the next action (FR-005–FR-009) and resolves the demo users; calls `ShipmentsService`.
  - `demo-dataset.ts`: the demo shipment plan moved out of `prisma/seed.ts`, taking a Prisma client as a parameter; imported by both the seed script and the reset (FR-015).
  - `admin-demo.controller.ts`: `POST /admin/demo/reset`, `JwtAuthGuard` + `RolesGuard` with `@Roles('ADMIN')`.
- **Viewer detection (FR-004)**: `fetchSockets()` on both namespaces through the existing Redis adapter (`redis-io.adapter.ts`), so the count covers every instance.
- **Lock (FR-012)**: a Redis key set with `NX` and an expiry (`SET demo:lock … NX PX`), held by ticks and the reset. BullMQ repeatable jobs already guarantee one execution per schedule across instances.
- **Web (`apps/web`)**: listen for `demo:reset` in `services/websocket-client.ts` for both namespaces; on receipt, `queryClient.invalidateQueries()` and a `sonner` toast.
- **Prisma models touched**: `Shipment`, `TrackingEvent` (read, write, delete). No migration.
- **Real-time**: new server-to-client event `demo:reset` on `/` and `/public`. Existing events unchanged.
- **New dependencies**: `bullmq` and `@nestjs/bullmq` in `apps/api`. Repeatable jobs with single execution across instances, retries and job history are what this needs; `@nestjs/schedule` runs on every instance and would need its own coordination. BullMQ is already the queue named for the `notifications` module (`DESIGN.md` §7).
- **Configuration**:
  - `DEMO_SIMULATOR` (`true` to enable): `.env.example` (on), Railway production (on). Requires `SEED_DEMO=true`.
  - BullMQ reuses `REDIS_URL`.

## Out of Scope

- Deleting accounts created by visitors through public signup (sellers and carriers outside the demo tenant). They are not demo data and are left for the admin approval flow.
- Simulated activity for non-demo tenants.
- Movement on a map (spec `03-live-map`) and outbound webhooks (spec `02-public-api-webhooks`); both consume the events this spec produces.
- A visual marker distinguishing simulated from human actions.

## Assumptions and Dependencies

- The API service runs always on (Railway sleep disabled): the BullMQ worker keeps a Redis connection open, and an always-on API answers the first visit without a cold start. Idle cost stays low because ticks write nothing without viewers (FR-004). FR-010's startup catch-up still covers redeploys.
- The demo tenant is identified by the emails seeded in `prisma/seed.ts`; renaming them requires updating the simulator in the same change.
- The seed's deterministic PRNG (`mulberry32(42)`) is kept for the dataset plan; simulator choices use `Math.random`.

## Notes for the AI Agent

- Before coding: moving the demo plan out of `seed.ts` (FR-015) touches the seed and its e2e expectations; validate the extraction shape with the user first.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`.
- Record the BullMQ adoption and the "simulator acts through the domain service" decision in `DESIGN.md`.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created |
