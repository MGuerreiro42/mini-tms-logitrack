# Feature Specification: Demo Showcase

**Feature**: `demo-showcase` — `SimulatorModule` (demo admin seed, Chaos Mode state, scenarios and routes, demo status), `IntegrationsModule` (webhook-down scenario), `TrackingModule` (`demo:chaos` event), `HealthModule` (pulse) and `apps/web` (demo picker, global banner, admin Demo card)
**Created**: 2026-11-11
**Status**: Draft
**Design reference**: `DESIGN.md` §5 (Demo simulator, Webhooks), §11 (auth), §16 (dashboards, pulse); `SCREENS.md` (Login, Seller Signup, General Dashboard); spec `01-demo-simulator` (queue, tick, drive, reset), spec `05-foundations` FR-015 and FR-018 (extra demo carriers, `next` on demo logins), spec `07-dashboards` FR-021, FR-027, FR-028 (two-column layout, pulse); `.claude/research/ux-briefs.md` §1.1, §5.1, §6.1, §7, §8.3, §9 step 5, §10.1; `po-admin-public.md` A2, §3.1, §3.3; `tms-benchmark.md` D5; prototypes `Login` (desktop and mobile), `AdminOverview` (Chaos running), `States` (GlobalBanner) and `Components` in the approved design canvas; design system tokens `--warning` / `--warning-foreground`

## Summary

A visitor picks a role on the login page and is signed in with one click, as seller, carrier manager, operator or a demo admin. The demo admin can start a short Chaos Mode scenario that the simulator plays on the demo tenant (failed-delivery storm, carrier outage, webhook endpoints down); every signed-in user sees a warning banner with a countdown while it runs, and the admin Overview gains a Demo card with the reset schedule, the scenario launcher and the last runs. The phase makes the real-time architecture visible in seconds without a second browser tab.

## User Stories *(mandatory)*

### User Story 1 - One click into any role (Priority: P1)

A visitor on `/login` reads "Explore the demo · one click, no signup", sees four cards (Seller, Carrier manager, Operator, Admin), each saying what that role does, and activates one to land signed in on that role's home.

**Why this priority**: the login is the first screen every visitor sees; today it offers three unlabelled buttons and no admin (ux-briefs §6.1, §7 "do first"; po-admin-public §3.3).

**Independent test**: with `NEXT_PUBLIC_DEMO_LOGIN=true`, press Tab until the Admin card is focused, press Enter, and land on `/admin`; at 390 px wide, read the four cards above the sign-in form; with the flag off, see no card.

**Acceptance scenarios**:

1. **Given** the demo is enabled, **when** a card is activated by click, tap, Enter or Space, **then** the corresponding demo account signs in and the browser lands on `safeNext(next, role)`.
2. **Given** a card sign-in in flight, **when** the page renders, **then** that card reads "Signing in…", the other cards and the form's submit button are disabled, and a failure shows in the existing form error.
3. **Given** `NEXT_PUBLIC_DEMO_LOGIN` is not `true`, **when** `/login` renders, **then** it has no demo card and keeps today's layout.

---

### User Story 2 - A demo admin with honest limits (Priority: P1)

The seeded account `admin@demo.minitms.dev` signs in with the public demo password and has the platform admin role, so a visitor sees approvals, monitoring, the pulse, the demo reset and Chaos Mode. Visitors who sign up on the demo deployment are told their data is visible to other visitors.

**Why this priority**: the admin is the only role that sees the whole live system and the only one that can start Chaos Mode (US 3). The user accepted that a demo admin can decide real signups on the demo deployment.

**Independent test**: seed with `SEED_DEMO=true`, sign in as the demo admin, approve a pending seller, call `POST /admin/demo/reset` twice within a minute and receive `429` on the second call; seed without `SEED_DEMO` and confirm the account does not exist.

**Acceptance scenarios**:

1. **Given** `SEED_DEMO=true`, **when** the seed runs twice, **then** exactly one `admin@demo.minitms.dev` user exists with role `ADMIN` and name "Demo admin", separate from the `ADMIN_EMAIL` account.
2. **Given** the demo is enabled on the web, **when** a visitor opens either signup page, **then** it shows the public-demo notice of FR-004 above the form.

---

### User Story 3 - Chaos Mode visible to everyone (Priority: P1)

The admin starts "Storm: failed deliveries" for 3 minutes from the Demo card. Within 2 s every signed-in user on the demo, in any role, sees a warning banner "Chaos Mode: Storm: failed deliveries" with a countdown; failed deliveries rise on the seller overview and the admin tiles; the banner disappears when the scenario expires or an admin presses "End now".

**Why this priority**: it turns the existing live features (risk phrases, pulse, webhooks log, dashboards) into something a visitor sees happen in seconds (ux-briefs §7; tms-benchmark D5).

**Independent test**: open the seller overview as `seller@demo.minitms.dev` in one window and `/admin` as the demo admin in another; start the storm for 1 minute; read the banner in both within 2 s; watch a `FAILED_DELIVERY` arrive; wait for expiry and see both banners disappear and a run "Expired" listed in the Demo card.

**Acceptance scenarios**:

1. **Given** no scenario is active and no cooldown, **when** an admin starts one, **then** the API answers `201` with the state, and every client of the default namespace receives `demo:chaos` with the scenario label and `endsAt`.
2. **Given** an active scenario, **when** anyone tries to start another, **then** the API answers `409` "A scenario is already running".
3. **Given** a scenario ended less than 60 s ago, **when** an admin starts one, **then** the API answers `409` "Chaos Mode is cooling down" and the Demo card shows "Available in m:ss".
4. **Given** an active scenario, **when** an admin presses "End now" in the banner or the card, **then** the scenario ends within 2 s for every client and the run is listed as "Ended by an admin".
5. **Given** an active scenario, **when** the API restarts or every instance is down past `endsAt`, **then** the scenario still ends once a worker runs again, emitting one `demo:chaos` null and one run record; no reader treats it as active after `endsAt`.
6. **Given** an active scenario, **when** the demo reset runs (scheduled or manual), **then** the scenario ends first with reason "Ended by the reset".
7. **Given** a non-demo seller with shipments, **when** any scenario runs, **then** none of its shipments, events or webhook endpoints change.

---

### User Story 4 - Admin Demo card (Priority: P2)

An admin on the Overview sees a "Demo" card under "Waiting for review": the simulator state, when the demo last reset and will next reset, a "Reset demo data…" button, the three scenarios with a duration choice, the running scenario with its progress and "End now", and the last five runs.

**Why this priority**: the reset is API-only today (po-admin-public A2) and Chaos Mode needs a launcher; the banner (US 3) already shows the running state to everyone.

**Independent test**: open `/admin` as the demo admin, reset the demo through the confirm dialog, read the new "last reset" time; start a scenario, read its countdown and progress; end it and find it first in the runs list; run the API with `DEMO_SIMULATOR` off and see no Demo card.

**Acceptance scenarios**:

1. **Given** `GET /admin/demo` answers `404`, **when** the Overview renders, **then** the Demo card is absent and the right column ends with the review panel.
2. **Given** a running scenario, **when** the card renders, **then** every Start button is disabled with "One scenario at a time" and the card carries the warning ring.
3. **Given** the reset was called less than a minute ago by the same account, **when** "Reset demo data" is confirmed, **then** the dialog shows "The demo was reset a moment ago. Try again in a minute." and nothing else changes.

---

### User Story 5 - Know it is a shared demo (Priority: P3)

A visitor signed in with a demo account reads one dismissible line "You're using the shared public demo. Data resets daily at <time>." while no scenario runs.

**Why this priority**: explains why a shipment created yesterday is gone and why someone else's actions appear; cheap once the banner exists.

**Independent test**: sign in as the demo operator, read the line with the reset time in the browser's time zone, dismiss it, reload within the same tab session and not see it; sign in as a visitor-created seller and never see it.

**Acceptance scenarios**:

1. **Given** a scenario is running, **when** the banner renders, **then** only the chaos variant shows.

---

### Edge Cases

- Two admins press Start at the same moment: the atomic write admits one; the other receives `409` and its card refetches.
- The demo admin is one account shared by every visitor: any visitor signed in as it can end a scenario another visitor started, and the per-user reset limit is shared by all of them.
- A visitor signed in as the demo operator keeps claiming and advancing during "carrier outage": the scenario pauses only the simulator; human actions follow the normal rules.
- A visitor pointed a demo seller's webhook endpoint at another URL: "webhook endpoints down" flips that seller's inbox flag, which has no visible effect until the endpoint points back at the inbox (the next reset restores it).
- A demo seller turned "Fail requests" on by hand before "webhook endpoints down": the scenario's end turns it off.
- The client's clock runs ahead of or behind the server's by a few seconds: the countdown hides the banner at its local `endsAt`; the `demo:chaos` null event hides it in any case.
- The socket is disconnected when the scenario ends: the banner hides at `endsAt` and the status refetches on reconnect.
- Failures and late shipments produced during a scenario are real domain events: they stay in the metrics windows and lists until the next reset. The Demo card's reset restores the dataset.
- `DEMO_SIMULATOR` is off while the web flag is on (misconfiguration): `GET /demo/status` answers `404`; the banner and the Demo card stay hidden.
- Redis is unavailable: start, end and status answer `503` through the existing error handling; the banner shows nothing; the pulse reports `chaos: null` by its per-part fallback.

## Functional Requirements *(mandatory)*

### Demo admin and access

- **FR-001**: `demo-dataset.ts` MUST define `DEMO_ADMIN` (`admin@demo.minitms.dev`, name "Demo admin"); `prisma/seed.ts` MUST upsert it with role `ADMIN` and `DEMO_PASSWORD`, updating `name` on an existing row, only when `SEED_DEMO=true`. It MUST stay out of `DEMO_EMAILS`, which loads the demo tenant, and separate from the `ADMIN_EMAIL` account, whose password stays private.
- **FR-002**: The demo admin MUST have the unrestricted `ADMIN` role (user decision; the briefs' optional `demo` JWT claim is not built). Its reach is documented in `DESIGN.md` §11 as follows:

  | It can | It cannot |
  |---|---|
  | read every seller and carrier, including visitor signups (company, e-mail, tax ID), and every shipment with its address, through the existing admin reads | approve or reject a decision already taken: decisions are final (`decide-approval.ts`) and the daily reset does not revert them |
  | approve or reject pending signups | change any password, user or tenant setting: no admin route exists for it |
  | reset the demo, start and end Chaos Mode, read the pulse | read API keys or webhook secrets, which only their seller reaches, or act as a seller or carrier |
  | — | touch the real admin account or any non-demo shipment through Chaos Mode (FR-020) |

- **FR-003**: `POST /admin/demo/reset` MUST carry `@RateLimit(1)` (one request per user per minute, `429` with `Retry-After` through the existing guard). Chaos start needs no rate limit: one scenario at a time and the cooldown (FR-011) bound it.
- **FR-004**: When `DEMO_LOGIN_ENABLED`, both signup pages MUST show above the form: "This is a public demo. Anything you enter can be read by other visitors signed in as the demo admin. Don't use real company data."

### Demo picker

- **FR-005**: `DEMO_ACCOUNTS` MUST list four entries in this order, each with `label`, `persona` and `description`: Seller (Lucas Pereira · Loja Demo; "Create a shipment, watch it move on the map, read its webhooks."), Carrier manager (Carlos Mendes · Transportadora Demo; "See the team's queue and on-time performance."), Operator (Ana Souza · Transportadora Demo; "Claim the most urgent shipment and move it to the doorstep."), Admin (Demo admin; "Approvals, platform pulse and Chaos Mode on demo data."). The comment excluding the admin MUST be replaced by one stating why the demo admin's password is public (FR-002).
- **FR-006**: A `DemoRoleCard` component (prototype `.tms-role`) MUST render as a `<button type="button">` with an icon, the label as title and the description below, accessible name equal to the label and description through `aria-describedby`; states default, hover, focus-visible (ring), pending ("Signing in…" in place of the description, `aria-busy`) and disabled. Minimum height 64 px.
- **FR-007**: Desktop (≥ `lg`): when `DEMO_LOGIN_ENABLED`, the left column of the login's `PublicPage` MUST show the headline, then the section "Explore the demo · one click, no signup" with the cards in a 2×2 grid, in place of the facts list; the right column keeps the sign-in form, whose "Or try the demo as" buttons are removed. The left-column footer reads "Portfolio project · demo data only, reset daily at 04:00 (São Paulo)". `PublicPage` gains one optional slot for this content; other public pages are unchanged.
- **FR-008**: Below `lg`: the headline (36 px), then the cards in one column, then the form.
- **FR-009**: A card MUST sign in through `useLoginMutation(next)` with its account, so the `next` handling of spec 05 FR-018 applies; while pending, every card and the form submit are disabled (US 1 scenario 2).

### Chaos Mode state (API)

- **FR-010**: `chaos-scenarios.ts` MUST define the catalog; the web never hard-codes labels:

  | id | Label | Description | Effect |
  |---|---|---|---|
  | `failed-deliveries` | Storm: failed deliveries | About half of the deliveries fail, then return to sender. | FR-021 |
  | `carrier-outage` | Transportadora Demo outage | The carrier stops claiming and moving shipments; the queue piles up. | FR-022 |
  | `webhook-down` | Webhook endpoints down | The demo sellers' webhook inbox answers 500; deliveries retry with backoff. | FR-023 |

- **FR-011**: The active scenario MUST live in Redis under `demo:chaos` as JSON `{ runId, scenario, startedAt, endsAt, startedBy }` (`startedBy` = the admin's e-mail), written with `SET … NX` so only one exists, and an expiry of `endsAt` + 1 h as a safety net only. A state whose `endsAt` has passed MUST be inactive for every reader. After a run ends, `demo:chaos:cooldown` MUST exist for 60 s. Ended runs MUST be prepended to `demo:chaos:runs` as `{ scenario, startedAt, endedAt, reason }`, trimmed to 10. Decision: Redis and not Postgres, since the state is ephemeral, shared by every instance and needs no migration.
- **FR-012**: Starting MUST accept `durationSec` of 60, 180 or 300 (default 180), refuse with `409` while a scenario is active or the cooldown key exists, and on success add a delayed `chaos-end` job to the `demo` queue (delay = duration, job id derived from `runId`) and emit the domain event `DEMO_CHAOS_CHANGED` with the state.
- **FR-013**: One routine `end(runId, reason)` with reason `expired`, `admin` or `reset` MUST end a run: it acts only when the stored state carries that `runId`, then deletes `demo:chaos`, sets the cooldown, records the run and emits `DEMO_CHAOS_CHANGED` with `null`. Each run therefore emits exactly one end, whichever of expiry, End now or reset comes first.
- **FR-014**: End now MUST promote the run's delayed `chaos-end` job with reason `admin` and wait for it, at most 30 s, as `resetNow` does; through the queue's global concurrency of 1 it never overlaps a tick, a drive or a reset.
- **FR-015**: The reset job MUST end the active run with reason `reset` before rebuilding the dataset.

### Routes and real-time

- **FR-016**: `GET /demo/status` (any authenticated role) MUST return `{ chaos: { scenario, label, description, endsAt } | null, nextResetAt }`.
- **FR-017**: `GET /admin/demo` (`ADMIN`) MUST return `{ lastResetAt, nextResetAt, chaos: (FR-016 fields + startedAt, startedBy) | null, cooldownUntil, scenarios: [{ id, label, description }], runs }` with the 5 newest runs. `lastResetAt` comes from `demo:last-reset`; `nextResetAt` from the `reset` job scheduler's next run, so no cron parsing is added.
- **FR-018**: `POST /admin/demo/chaos` `{ scenario, durationSec? }` (`ADMIN`) MUST answer `201` with the FR-017 `chaos` object, `400` for an unknown scenario or duration, `409` per FR-012. `DELETE /admin/demo/chaos` (`ADMIN`) MUST answer `204` once ended, `404` when no scenario is active. Every route of FR-016–FR-018 lives in `SimulatorModule`, so it answers `404` when `DEMO_SIMULATOR` is off (spec 01 FR-014).
- **FR-019**: `TrackingListener` MUST emit `demo:chaos` with the FR-016 `chaos` payload, or `null`, to every client of the default namespace on `DEMO_CHAOS_CHANGED`; the Redis adapter carries it to every instance. The `/public` namespace receives nothing.

### Scenario effects

- **FR-020**: Every effect MUST be limited to the demo tenant: shipments through `demoShipmentsWhere`, endpoints of the demo sellers only. `tick` and `drive` MUST read the state once per job.
- **FR-021**: `failed-deliveries`: the failure probability from `OUT_FOR_DELIVERY` (spec 01 FR-007) MUST be 0.5 while active.
- **FR-022**: `carrier-outage`: ticks MUST skip claims and advances of shipments whose carrier is Transportadora Demo; creation and the drive job continue, so road-stage vehicles stay parked at the end of their segment and new shipments wait in Pending. Rápido Paulista and EconoLog are unaffected.
- **FR-023**: `webhook-down`: on `DEMO_CHAOS_CHANGED`, `WebhooksService` MUST set the inbox "Fail requests" flag on every demo seller's endpoint when this scenario starts and clear it when it ends, through `WebhookInboxService.setFailing`.
- **FR-024**: `GET /admin/pulse` MUST add `chaos: { scenario, label, endsAt } | null`, read from `demo:chaos` with the existing per-part fallback (`null` on failure or with the simulator off). Metrics are not adjusted: scenario outcomes are real events and appear in every metric of spec 07 like any other.

### Global banner (web)

- **FR-025**: `globals.css` MUST add `--warning` / `--warning-foreground` (light `#edb98e` / `#1c201e`, dark `#d08548` / `#121614`, as the design system) and the `warning` color utility. The tone is reserved for Chaos Mode (decision ux-briefs §10.1).
- **FR-026**: A `GlobalBanner` MUST mount in `AppShell` between the header and `main`, for every role, only when `DEMO_LOGIN_ENABLED`. It reads `useDemoStatus` (`GET /demo/status`; `404` renders nothing), which `demo:chaos` updates with `setQueryData` and which refetches on socket reconnect and on `demo:reset`.
- **FR-027**: Chaos variant: full width, `bg-warning text-warning-foreground`, bolt icon, "**Chaos Mode: <label>.** <description> Everyone on the demo sees this banner.", a mono timer "m:ss left" updated every second through `useNow(1 s)`, hidden at the local `endsAt`; for `ADMIN` sessions an outlined "End now" button (`DELETE /admin/demo/chaos`, "Ending…" while pending). Wraps below 768 px; the button is at least 44 px tall on touch.
- **FR-028**: The banner's live region (`role="status"`) MUST announce only the start ("Chaos Mode started: <label>, ends at HH:MM") and the end ("Chaos Mode ended"); the timer is `aria-hidden`.
- **FR-029**: Demo info variant: for a session whose e-mail ends in `@demo.minitms.dev` and while no scenario runs, a neutral line (`bg-muted`) "You're using the shared public demo. Data resets daily at <HH:MM>." with `nextResetAt` in the viewer's time zone and a dismiss button; the dismissal is kept in `sessionStorage` (read and write in `try/catch`; without storage the line shows again). The existing `demo:reset` toast is unchanged.

### Admin Demo card (web)

- **FR-030**: The admin Overview MUST render a "Demo" panel (description "Demo deployment only") stacked under "Waiting for review" in the right column, last on mobile, keeping spec 07 FR-021 (columns end flush, no stretched card). It is absent when `GET /admin/demo` answers `404`, and shows the Simulator word from the pulse already polled on the page, and "Resets daily at 04:00 · last reset <HH:MM> · next <day HH:MM>".
- **FR-031**: "Reset demo data…" (destructive) MUST open `ConfirmDialog`: "This deletes the demo sellers' shipments, tracking history and webhook log, restores the seeded shipments and ends any running scenario. Other accounts and signups are kept." The button shows progress until `204`, then a success toast and the refreshed card; `429` shows the US 4 scenario 3 message in the dialog.
- **FR-032**: Chaos section: idle shows a segmented duration control (1 min, 3 min, 5 min; default 3 min) and one row per scenario (label, description, "Start"). Running shows the active block (label, "Running" in the caution tone, a progress bar of elapsed ÷ duration, "Started HH:MM · ends HH:MM", "End now"), every Start disabled with "One scenario at a time", and the panel ring in `--warning`. Cooldown disables Start with "Available in m:ss". A `409` race shows the API message as a toast and refetches.
- **FR-033**: "Last runs" MUST list up to 5 runs: "<label> · HH:MM–HH:MM · Expired | Ended by an admin | Ended by the reset", or "No scenario has run yet."
- **FR-034**: `PulseStrip` MUST show the Simulator item as "Chaos · <label>" with a warning dot while `pulse.chaos` is set.

### Docs

- **FR-035**: On completion, `SCREENS.md` Login, Seller Signup and General Dashboard MUST describe the picker, the notice and the Demo card, and a short "Global banner" note MUST cover every app shell; `DESIGN.md` §5 (Demo simulator) MUST describe Chaos Mode (Redis state, delayed end job, one-at-a-time and cooldown, `demo:chaos`), §11 the demo admin table of FR-002.

### Key Entities

- **`User`** (`schema.prisma`): one new seeded row (FR-001).
- **`Shipment`**, **`TrackingEvent`**, **`WebhookEndpoint`**: written only through the existing services, scoped to the demo tenant.
- No new model or migration. Chaos state, cooldown and runs live in Redis (FR-011); the end job lives in the `demo` queue.

## Success Criteria *(mandatory)*

- **SC-001**: From a cold `/login`, a visitor reaches any role's home with one activation and no typing, by mouse, keyboard or touch.
- **SC-002**: After Start, the banner appears on every connected signed-in client within 2 s, and disappears within 2 s of expiry or End now.
- **SC-003**: During "Storm: failed deliveries" with a viewer connected, at least one `FAILED_DELIVERY` occurs within 3 minutes on the demo dataset.
- **SC-004**: Across a full run of each scenario, a non-demo seller's shipments, events and webhook endpoint are byte-identical before and after (e2e).
- **SC-005**: Each run produces exactly one `demo:chaos` start and one `null`, and exactly one run record, with End now, expiry or reset (unit and e2e).
- **SC-006**: No pull request of the delivery plan exceeds about 500 changed lines including tests.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/modules/simulator/`: `demo-dataset.ts` (`DEMO_ADMIN`), `chaos-scenarios.ts` (catalog, FR-010), `chaos.service.ts` (start, end, state, cooldown, runs; FR-011–FR-015), `chaos-events.ts` (`DEMO_CHAOS_CHANGED`), `simulator.constants.ts` (`CHAOS_END_JOB`), `simulator.processor.ts` (dispatches `chaos-end`), `demo-reset.service.ts` (ends the run first), `simulator.service.ts` (reads the state per job; FR-021, FR-022), `demo.controller.ts` (`GET /demo/status`) and `demo-reset.controller.ts` grown into the admin demo controller (`GET /admin/demo`, `POST`/`DELETE /admin/demo/chaos`, reset rate limit), DTOs under `dto/`.
  - `src/modules/integrations/webhooks.service.ts`: `@OnEvent(DEMO_CHAOS_CHANGED)` for `webhook-down` (FR-023).
  - `src/modules/tracking/tracking.listener.ts`: `demo:chaos` emit (FR-019).
  - `src/modules/health/pulse.service.ts` and `dto/pulse-response.dto.ts`: `chaos` (FR-024), read from Redis by a small exported reader in `chaos.service.ts`, so the health module does not need the conditional simulator module.
  - `prisma/seed.ts`: demo admin.
- **Web (`apps/web`)**:
  - `features/auth/`: `lib/demo-accounts.ts` (FR-005), `components/demo-role-card.tsx`, `components/demo-picker.tsx`, `components/login-form.tsx` (buttons removed); `components/common/public-page.tsx` (optional slot); `app/(public)/login/page.tsx`; both signup pages (FR-004).
  - `features/demo/` (new): `api.ts`, `hooks/use-demo-status.ts`, `hooks/use-admin-demo.ts`, `components/global-banner.tsx`, `components/demo-card.tsx`, `components/chaos-controls.tsx`.
  - `components/common/app-shell.tsx` (banner), `features/admin/components/admin-dashboard.tsx` (card), `features/admin/components/pulse-strip.tsx` (FR-034), `app/globals.css` (FR-025).
- **Prisma models touched**: `User` (seed write). No migration.
- **Real-time**: new server-to-client event `demo:chaos` (`{ scenario, label, description, endsAt } | null`) on the default namespace, to every client, emitted from `DEMO_CHAOS_CHANGED`. No new room. Existing events unchanged.
- **Multi-instance**: the state is one Redis key written atomically; the end runs as one BullMQ job delivered to one worker and serialized with ticks, drives and resets by the queue's global concurrency; the socket event crosses instances through the Redis adapter.
- **New dependencies**: none.
- **Configuration**: no new variable. `SEED_DEMO=true` seeds the demo admin; `DEMO_SIMULATOR=true` loads the routes; `NEXT_PUBLIC_DEMO_LOGIN=true` (Vercel, `.env.example`) now also gates the banner and the signup notice, so it means "this deployment is the public demo".

## Delivery Plan

Each row is one pull request, stacked on its dependencies, at most about 500 changed lines including tests.

| # | Branch | Content | FRs | Apps | Size | Depends on |
|---|---|---|---|---|---|---|
| 1 | `feat/demo-admin-account` | `DEMO_ADMIN`, seed, reset rate limit, signup notice, e2e on `429` | FR-001–FR-004 | api, web | ~180 | — |
| 2 | `feat/demo-picker` | `DEMO_ACCOUNTS`, `DemoRoleCard`, picker, `PublicPage` slot, login desktop and mobile, form buttons removed | FR-005–FR-009 | web | ~380 | 1 |
| 3 | `feat/chaos-state` | catalog, `ChaosService`, `chaos-end` job and processor dispatch, reset ends the run, domain event; unit tests on one-at-a-time, cooldown, idempotent end | FR-010–FR-015 | api | ~450 | — |
| 4 | `feat/demo-routes` | `GET /demo/status`, `GET /admin/demo`, `POST`/`DELETE /admin/demo/chaos`, DTOs, `demo:chaos` emit, pulse `chaos`; e2e on codes, `403`, `404` with the simulator off | FR-016–FR-019, FR-024 | api | ~430 | 3 |
| 5 | `feat/chaos-scenarios` | storm and outage in `SimulatorService`, `webhook-down` listener; e2e that a non-demo tenant is untouched | FR-020–FR-023 | api | ~380 | 4 |
| 6 | `feat/global-banner` | warning tokens, `useDemoStatus`, `GlobalBanner` (chaos and info variants, countdown, End now, live region) in `AppShell` | FR-025–FR-029 | web | ~420 | 4 |
| 7 | `feat/admin-demo-card` | Demo card with schedule, reset dialog, `429` state; PulseStrip chaos word | FR-030, FR-031, FR-034 | web | ~320 | 4 |
| 8 | `feat/admin-chaos-controls` | scenario rows, duration, start/end, running, disabled and cooldown states, last runs | FR-032, FR-033 | web | ~420 | 6, 7 |
| 9 | `docs/spec-08-wrapup` | `SCREENS.md`, `DESIGN.md`, Status and Changelog | FR-035 | docs | ~80 | 1–8 |

PRs 1–2 and 3–5 form two independent chains; 6 and 7 can be reviewed in parallel once 4 is merged.

## Out of Scope

- A Chaos banner on public tracking and any `/public` payload. Decision: Defer; it needs a public status read and public wording, and recipients are not the visitors the story targets.
- Scenarios that change road speed ("Rush hour") or skip GPS pings ("GPS blackout"), and "Order surge". Speed changes need a per-shipment virtual clock so markers never move backwards; the other two add little that the three scenarios do not already show.
- Per-city or per-carrier scope selection: each scenario has one fixed scope.
- A `/admin/demo` page, an audit log of chaos and reset actions, and recent platform activity (po-admin-public A6).
- The "Just watch a live shipment" link and `GET /public/demo/featured-shipment`, and the live hero ticker. Decision: A follow-up PR after #2; it needs a new public endpoint and its rate limit.
- Cards for the extra demo carriers' managers (Rápido Paulista, EconoLog). Decision: No; four cards keep one per role, and their accounts stay reachable through the form.
- Guided tour or coach marks. The card descriptions and the banner carry the hints; a tour needs positioning, dismissal state and per-page copy for each role.
- Restricting the demo admin to the demo tenant through a `demo` JWT claim (FR-002).
- Deleting visitor signups on reset (spec 01 Out of Scope).
- Replacing the `demo:reset` toast with a banner variant.

## Assumptions and Dependencies

- Built on `docs/spec-07-wrapup` (PR stack #95–#146): demo reset and `demo:reset`, demo login buttons behind `NEXT_PUBLIC_DEMO_LOGIN`, extra demo carriers and their managers, the simulator driving all three demo carriers, the admin pulse and the metrics core.
- The deployment with `NEXT_PUBLIC_DEMO_LOGIN=true` is the public demo; signups there are visitors, so the demo admin deciding them is accepted (user decision). Visitors are warned before entering data (FR-004).
- Decision: Every signed-in user on the demo deployment, including visitor-created tenants, by broadcasting like `demo:reset`; targeting only demo accounts would need a new room joined at connection, for no visible gain on a demo-only deployment.
- A 60 s cooldown and 1–5 min durations keep the shared demo usable when several visitors hold the demo admin at once.
- The demo admin's e-mail is the reset limit's key, so all visitors on it share one reset per minute; the real admin has its own quota.

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above, one PR of the Delivery Plan at a time, each on its own branch stacked on its dependencies. Stop and re-split a PR that grows past about 500 changed lines.
- Register `GET /admin/demo` and `/admin/demo/chaos` in the existing `admin/demo` controller; the `chaos-end` job id must not contain `:` (BullMQ custom ids).
- Unit tests: `end` is a no-op for a stale `runId`; start with an active or cooling state is refused; a state past `endsAt` reads as inactive; the tick uses 0.5 during the storm and skips Transportadora Demo during the outage. e2e: each route's codes, `403` for non-admins on `/admin/demo*`, the non-demo tenant check (SC-004), the reset ending a run.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`.
- Record the Chaos Mode design (Redis state, delayed end job, cooldown) and the demo admin's reach in `DESIGN.md`.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-11 | Spec created from the UX briefs (§1.1, §5.1, §6.1, §7, §8.3, §9 step 5, §10.1), `po-admin-public.md` (A2, §3.1, §3.3), `tms-benchmark.md` D5 and the approved prototypes; every item verified against `docs/spec-07-wrapup` |
