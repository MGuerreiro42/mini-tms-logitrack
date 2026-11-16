# Feature Specification: Foundations

**Feature**: `foundations` — `ShipmentsModule`, `SellersModule`, `CarriersModule`, `IntegrationsModule`, `SimulatorModule` (seed) and `apps/web` (shared lib, auth, error boundaries, shipments and tracking features)
**Created**: 2026-11-06
**Status**: Implemented
**Design reference**: `DESIGN.md` §10 (data model), §11 (auth), §14 (shipments, matching normalization), §15 (tracking), §16 (dashboards, monitoring); `SCREENS.md` (Public Tracking, Shipment Detail, Global Monitoring); `FLOW.md` Frame 23; `.claude/research/ux-briefs.md` §1, §2.4, §9 step 1, §10

## Summary

Small, mostly invisible corrections that the enrichment phases depend on: SLA dates stored on the shipment, people's names and the actor of each timeline event, validated and normalized Brazilian identifiers, accent-insensitive coverage matching, a webhook log that fills for every seller, an admin shipment detail reachable from monitoring, a sign-in that returns to the requested page, an explicit "service unavailable" state, and a few visual fixes. Two additional demo carriers make the carrier choice at shipment creation a real decision.

## User Stories *(mandatory)*

Stories 1–5 form the API pull request (migrations and seed included); stories 6–9 form the web pull request, which depends on the API one.

### User Story 1 - SLA dates that every screen agrees on (Priority: P1) — API

A seller, a carrier and an admin looking at the same shipment see the same due date, and a delivered shipment carries the moment it was delivered, so "on time" and "late" can be computed from stored facts.

**Why this priority**: the due date is recomputed in three places today (mapper, SLA summary, raw late query), and delivered shipments have no delivery timestamp on the record, which is why the seller list shows "Delivered" instead of an SLA verdict (ux-briefs SE-1). Risk badges, the SLA strip and urgency sorting in later phases filter and sort on these columns.

**Independent test**: create a shipment with the Express modality and confirm `dueAt` equals creation + 24 h; advance it to `DELIVERED` and confirm `deliveredAt` is set; run the migration against a database seeded before it and confirm both columns are filled for existing rows.

**Acceptance scenarios**:

1. **Given** a modality with `slaHours`, **when** a shipment is created, **then** `dueAt` is stored as creation time + `slaHours` and never changes afterwards, even if the modality's `slaHours` is edited.
2. **Given** a modality without `slaHours`, **when** a shipment is created, **then** `dueAt` is null.
3. **Given** a shipment moving to `DELIVERED`, **when** the transition is written, **then** `deliveredAt` equals the `createdAt` of that `TrackingEvent`.
4. **Given** shipments that existed before the migration, **when** it runs, **then** `dueAt` is backfilled from creation + the modality's current `slaHours` and `deliveredAt` from the first `DELIVERED` event.

---

### User Story 2 - Know who did what (Priority: P1) — API

Demo users have display names, and each timeline event records the user who caused it, so "Collected by Ana Souza" or "Cancelled by Lucas Pereira" can be shown.

**Why this priority**: carriers are multi-user, and a manager acting on an operator's shipment is invisible today (po-carrier §8). Owner chips, the team table and the activity log of later phases all read these two fields.

**Independent test**: sign in as `operator1@demo.minitms.dev`, advance an owned shipment, and confirm the event in `GET /shipments/queue/:id` carries `actorName: "Ana Souza"`; confirm `GET /public/tracking/:code` exposes no actor.

**Acceptance scenarios**:

1. **Given** a seller creates or cancels a shipment, **when** the event is written, **then** its actor is that seller's user.
2. **Given** a carrier user claims or advances a shipment (including through the simulator), **when** the event is written, **then** its actor is that carrier user's user.
3. **Given** an authenticated detail (seller, carrier or admin), **when** it returns the timeline, **then** each event carries `actorName` (the actor's `name`, or null when the actor has none or is unknown).
4. **Given** the public tracking response, **when** it is returned, **then** it contains no actor field.

---

### User Story 3 - Identifiers that are valid and unique (Priority: P1) — API

A visitor signing up, a seller creating a shipment and a carrier editing coverage get a clear validation error for an invalid CEP, UF, CNPJ or CPF, and the same tax ID typed with or without punctuation is recognised as the same company.

**Why this priority**: free-text UF and unmasked CEP accept "zz" and "abc" (ux-briefs SE-6), and a formatted tax ID bypasses the `@unique` constraint on `document` (AD-8).

**Independent test**: sign up a seller with `12.345.678/0001-95`-style input that has a wrong check digit and get `400`; sign up with a valid CNPJ, then sign up again with the same digits formatted differently and get the existing generic `409`.

**Acceptance scenarios**:

1. **Given** a request with `addressZipCode` that is not 8 digits after removing `-` and spaces, **when** it is validated, **then** the API answers `400`.
2. **Given** a UF in any case with surrounding spaces, **when** it is validated, **then** it is uppercased and accepted only if it is one of the 27 federative units.
3. **Given** a seller signup, **when** `document` is validated, **then** it is accepted as an 11-digit CPF or a 14-digit CNPJ with valid check digits; a carrier signup accepts only a valid CNPJ.
4. **Given** stored documents and zip codes written before this change, **when** the migration runs, **then** they hold digits only.

---

### User Story 4 - Coverage matches the city however it is typed (Priority: P1) — API

A carrier that covers "São Paulo" is offered for an address typed "Sao Paulo" or "SÃO PAULO", and the reverse.

**Why this priority**: an accent difference silently removes a carrier from the eligible list (ux-briefs CA-10), which reads as "no carrier covers this address".

**Independent test**: with coverage `SP / São Paulo`, call `GET /shipments/eligible-carriers?state=sp&city=Sao%20Paulo&modalityId=…` and get that carrier; create a shipment to the same address and get `201`.

**Acceptance scenarios**:

1. **Given** coverage for a city, **when** the eligible-carriers preview or shipment creation compares a city that differs only in accents, case or surrounding spaces, **then** they match.
2. **Given** a carrier saving coverage rows that differ only in accents or case for the same state, **when** the list is saved, **then** they are treated as one row.

---

### User Story 5 - The demo works on first visit (Priority: P1) — API

A visitor opening Integrations as a demo seller sees deliveries already logged; the admin can open any monitored shipment; the create wizard offers more than one carrier for the demo addresses; the public tracking page says who sent the parcel.

**Why this priority**: each of these looks broken or empty in front of a recruiter today (ux-briefs SE-2, AD-1, SE-7; decision §10.4 and §10.8).

**Independent test**: after a fresh seed and reset with the simulator on, open `/seller/integrations` as the demo seller without having visited it before and confirm the log lists deliveries created by simulator events; call `GET /admin/shipments/:id` as admin; call the eligible-carriers preview for each demo address and modality.

**Acceptance scenarios**:

1. **Given** a seller without a webhook endpoint, **when** an event of one of its shipments is dispatched, **then** the endpoint is provisioned (own test inbox, all events, active) and the delivery is logged.
2. **Given** an admin, **when** `GET /admin/shipments/:id` is called, **then** it returns the shipment with its timeline, seller, carrier and owner; a non-admin gets `403`, an unknown id `404`.
3. **Given** the demo seed, **when** the eligible-carriers preview is called for a demo address, **then** at least two approved carriers are returned for at least one modality per address.
4. **Given** a public tracking lookup, **when** it is returned, **then** it includes `sellerName` and `carrierName` (company names only).

---

### User Story 6 - Land where you were going (Priority: P1) — Web

A user opening a deep link (e.g. `/seller/shipments/abc`) while signed out signs in and lands on that page, provided their role may open it.

**Why this priority**: shared links currently dump the user on the role home (ux-briefs X-1, S1).

**Independent test**: signed out, open `/carrier/queue/<id>`, sign in as the demo manager (form or demo button) and land on the same URL; repeat with `?next=https://evil.example` and `?next=//evil.example` and land on the role home.

**Acceptance scenarios**:

1. **Given** a signed-out request to a role page, **when** it is redirected to login, **then** the login URL carries `next` with the original path and query.
2. **Given** a successful sign-in with a `next` that is a same-origin path whose segment the role may enter, **when** the session is set, **then** the user is sent there; otherwise to the role home.
3. **Given** a session that expires during client-side use, **when** the user is sent to login, **then** `next` holds the page they were on.

---

### User Story 7 - A clear message when the service is down (Priority: P2) — Web

When the API cannot be reached on a page load, the user sees "We can't reach the Mini TMS service right now" with a "Try again" button, instead of "Something went wrong".

**Why this priority**: the generic error blames the page and offers nothing useful (ux-briefs X-2).

**Independent test**: stop the API, hard-load `/seller`, see the unavailable state; start the API, press "Try again", and see the overview.

**Acceptance scenarios**:

1. **Given** an error boundary renders, **when** the API health check fails or answers `5xx`, **then** the boundary shows the unavailable state; otherwise it keeps the existing generic error.
2. **Given** the unavailable state, **when** "Try again" is pressed, **then** the segment re-renders through the existing retry.

---

### User Story 8 - Read the record, not the raw data (Priority: P1) — Web

The timeline says who acted, delivered shipments show "On time" or "Late by 8 h", forms reject a bad CEP, UF or tax ID before submitting and show them masked, the admin opens a shipment from monitoring, and public tracking shows "From Loja Demo · carried by Transportadora Demo".

**Why this priority**: it makes stories 1–5 visible; without it the API changes cannot be demonstrated.

**Independent test**: open a delivered-late demo shipment as the seller and read "Late by …" in the SLA column; open monitoring as admin and click a row; type `abc` in the zip field of the create wizard and see an inline error.

**Acceptance scenarios**:

1. **Given** a timeline event with `actorName`, **when** it renders on an authenticated detail, **then** it reads "by <name>"; without `actorName` nothing is added.
2. **Given** a delivered shipment with `dueAt` and `deliveredAt`, **when** its SLA cell renders, **then** it reads "On time" or "Late by <span>" with the late tone.
3. **Given** a monitoring row, **when** it is clicked or its code link activated, **then** the admin shipment detail opens.
4. **Given** a tax ID or CEP, **when** it is displayed anywhere, **then** it is masked (`00.000.000/0000-00`, `000.000.000-00`, `00000-000`).

---

### User Story 9 - Visual fixes (Priority: P3) — Web

Input borders are visible against cards in both themes, tracking codes never break across lines on mobile, and chart value labels are readable in dark mode.

**Why this priority**: polish approved in ux-briefs §10.5, §10.7 and §10.10, and the dark-mode label loss in X-7 (confirmed in `.claude/research/screens/seller-overview-dark.png`: the 67% / 60% / 67% labels of the vertical SLA chart are missing, while the horizontal charts keep theirs).

**Independent test**: in dark mode, open the seller overview and read the bar values; at 375 px width, open the carrier queue and the seller shipments list and confirm every code is on one line.

**Acceptance scenarios**:

1. **Given** dark mode, **when** the SLA-by-modality chart renders, **then** its value labels use the foreground colour.
2. **Given** a 320 px viewport, **when** any list, header or feed shows a tracking code, **then** the code stays on one line.

---

### Edge Cases

- A shipment created under a modality later edited keeps its stored `dueAt`; the backfill uses the modality's `slaHours` at migration time, which is the only value available.
- A `RETURNED` shipment has no `deliveredAt`; `FAILED_DELIVERY` never sets it.
- A tax ID made of one repeated digit (`00000000000000`, `11111111111`) passes the check-digit arithmetic and MUST be rejected.
- The migration finds two rows whose documents become equal after normalization: it fails with the unique violation and is not rewritten; the duplicate is resolved by hand first. Coverage rows that become duplicates by city key within a carrier are merged by the migration, keeping the oldest.
- The demo documents in `demo-dataset.ts` do not pass the CNPJ check; they are seeded directly, never through the DTO, and stay unchanged so existing deployments are not duplicated by the seed's upsert-by-document.
- Users with no `name` (signups, the admin): `actorName` is null and the web shows no "by" text.
- An endpoint the seller disabled stays disabled: provisioning creates a missing endpoint only.
- `next` pointing to a segment the role cannot enter (a seller with `next=/admin`) lands on the role home, never on `/forbidden`.
- The session expires during a server render: the user lands on the login page without `next` (the server redirect does not know the page path) and, after signing in, on the role home.
- The health check itself is rate limited or times out: treated as unavailable after 5 s.

## Functional Requirements *(mandatory)*

### PR A — API (migrations and seed included)

**SLA dates**

- **FR-001**: `Shipment` MUST store `dueAt` (nullable) set at creation as `createdAt + modality.slaHours` h, and `deliveredAt` (nullable) set in the same transaction as the `DELIVERED` `TrackingEvent`, to that event's `createdAt`.
- **FR-002**: One migration MUST add both columns and backfill them for existing rows (FR-001 rules, `deliveredAt` from the earliest `DELIVERED` event).
- **FR-003**: Every read of the due date or delivery time MUST use the columns: the response mappers, `slaSummaryForSeller` and the late-shipments query (which becomes a typed Prisma query on `dueAt`, replacing the raw SQL). `computeDueAt` remains only where the value is first written. Seller, carrier and admin shipment responses MUST add `deliveredAt`.
- **FR-004**: `buildDemoShipments` MUST set `dueAt` and `deliveredAt` on demo shipments, so the seed and the daily reset produce the same columns as live creation.

**Names and actors**

- **FR-005**: `User` MUST gain a nullable `name`; `TrackingEvent` MUST gain a nullable `actorId` referencing `User`.
- **FR-006**: Every `TrackingEvent` written by `ShipmentsService` (create, claim, status update, cancel) MUST record the acting user. Demo dataset events MUST record the seller's user for `PENDING` and `CANCELLED` and the owner's user for every other status.
- **FR-007**: The seed MUST set names on the demo users and the admin, and MUST update `name` on an existing user (the current `update: {}` would leave deployed databases unnamed): `seller@` Lucas Pereira, `seller2@` Marina Costa, `carrier@` Carlos Mendes, `operator1@` Ana Souza, `operator2@` Bruno Lima, admin "Admin".
- **FR-008**: `TrackingEventDto` MUST add `actorName: string | null`. The public tracking response MUST NOT expose actors.

**Validation and normalization**

- **FR-009**: Address DTOs (`CreateShipmentDto`, used by the web and by `/v1`) and the eligible-carriers query MUST strip `-` and spaces from `addressZipCode` and require exactly 8 digits; state fields (`addressState`, `state` in the eligible-carriers query and in `CoverageAreaInputDto`) MUST be trimmed, uppercased and one of the 27 UFs.
- **FR-010**: Signup DTOs MUST strip every non-digit from `document` and validate check digits: seller CPF (11) or CNPJ (14), carrier CNPJ (14), rejecting repeated-digit sequences. Validators MUST be shared custom `class-validator` decorators under `src/shared/`.
- **FR-011**: `Seller.document`, `Carrier.document` and `Shipment.addressZipCode` MUST be stored as digits only; the migration MUST normalize existing rows.

**Coverage matching**

- **FR-012**: `CarrierCoverageArea` MUST gain a nullable `cityKey` (trimmed, lowercased, diacritics removed; null when `city` is null), written by `setCoverageAreas` and the seed, and backfilled by the migration with `translate()` over the Portuguese accented letters (no extension). The unique constraint and the reverse index MUST move from `city` to `cityKey`; `city` keeps its display casing.
- **FR-013**: `eligibleCarrierWhere` MUST match `cityKey` against the same key computed from the requested city (one shared helper), for both the preview and creation.

**Demo and admin**

- **FR-014**: The webhook endpoint provisioning (own test inbox, all events, active) MUST live in one place keyed by `sellerId`, used by the Integrations reads and by `WebhookDispatcher.handleShipmentUpdated` when the seller has no endpoint. An existing inactive endpoint MUST NOT be reactivated.
- **FR-015**: The seed MUST add two `APPROVED` carriers, "Rápido Paulista" (CNPJ `11222333000181`; coverage SP cities São Paulo, Guarulhos, Campinas, Santos; modalities Express and Full) and "EconoLog" (CNPJ `44555666000181`; coverage all SP; modalities Standard and Full), idempotently. The daily reset MUST leave them in place (it already scopes its deletes to the demo sellers' shipments). Each extra carrier MUST get one seeded manager user, and the simulator MUST claim and advance the demo sellers' shipments of all three carriers the same way (carrier list instead of one `carrierId`, claim user per carrier).
- **FR-016**: `GET /admin/shipments/:id` (`ADMIN` only) MUST return the admin shipment shape plus `trackingEvents` (with `actorName`), reusing `adminShipmentInclude` and the timeline include; no live map fields.
- **FR-017**: `GET /public/tracking/:code` MUST add `sellerName` (`Seller.companyName`) and `carrierName` (`Carrier.companyName`); the DTO comment on public identity MUST be updated accordingly.

### PR B — Web

- **FR-018**: `proxy.ts` MUST add `next=<pathname+search>` when redirecting a signed-out request to login. A shared `safeNext(value, role)` MUST accept only a path starting with a single `/` (not `//`, not `/\`), whose first segment the role may enter (`canEnterSegment`), and otherwise return `ROLE_HOME[role]`. `useLoginMutation` (form and demo buttons) and the signed-in `/login` redirect in `proxy.ts` MUST use it. The client-side session-expiry redirect MUST append the current path as `next`.
- **FR-019**: `SegmentError` and the root `error.tsx` MUST probe `GET <API_URL>/health` (5 s timeout) on mount; on network failure or `5xx` they MUST render the unavailable state ("We can't reach the Mini TMS service right now. Your data is safe; try again in a moment.") with the existing "Try again" (`retry`, stable since Next 16.3; `unstable_retry` is no longer passed) button. While probing, the generic copy is not flashed (render the shared title only).
- **FR-020**: `TrackingTimeline` MUST append "by <actorName>" to an event when `actorName` is present (authenticated details only; the public page has no actor).
- **FR-021**: `slaState` MUST accept `deliveredAt` and, for `DELIVERED` shipments with a `dueAt`, return "On time" (muted) or "Late by <span>" (late tone), keeping the existing `span` formatting. Types MUST add `deliveredAt` and `actorName`.
- **FR-022**: The address form MUST use a UF select fed by `lib/br-states.ts` and a CEP input masked `00000-000` that validates 8 digits; signup forms MUST mask and validate the tax ID (seller CPF or CNPJ, carrier CNPJ) with the same check-digit rules as FR-010, sending digits only. One `lib/br-documents.ts` MUST hold the format and check helpers used by forms and displays.
- **FR-023**: Every display of a tax ID or zip code (seller and carrier lists, details, profile cards, shipment details) MUST use the mask helpers.
- **FR-024**: `/admin/shipments/[id]` MUST render a read-only detail: breadcrumb back to monitoring (keeping its query string), header with code, status and modality/due line, stepper, a "Parties" panel (seller, carrier, owner, destination), and the timeline. It MUST stay live through the admin monitoring subscription (`useShipmentTracking()` with no id) invalidating its query. No actions, no map.
- **FR-025**: Admin monitoring rows MUST link to that detail: the code cell is a real link and the row is clickable, as in the carrier queue.
- **FR-026**: Public tracking MUST show "From <sellerName> · carried by <carrierName>" under the destination line.
- **FR-027**: `globals.css` MUST set `--input` to `#8e938f` (light) and `#6e7571` (dark).
- **FR-028**: Every tracking code display MUST carry `whitespace-nowrap` (one shared class or component where the code is rendered in lists, headers, the feed and the attention row).
- **FR-029**: `MetricBarChart` value labels MUST render in `--foreground` (vertical) and `--muted-foreground` (horizontal) in both themes, set so Recharts' own `fill` attribute cannot override them; the stage-duration chart's category labels MUST break only after the arrow ("Collected →" / "In transit").

### Docs

- **FR-030**: `SCREENS.md` Public Tracking and Shipment Detail (Seller view) carry the sender line and the failure-reason visibility rule (amended with this spec). On completion, `DESIGN.md` §10 MUST mention `dueAt`/`deliveredAt`, `User.name` and `TrackingEvent.actorId`, and §14 "Matching normalization" MUST describe `cityKey` and digits-only identifiers.

### Key Entities

- **`Shipment`** (`schema.prisma`): gains `dueAt`, `deliveredAt`; `addressZipCode` becomes digits only.
- **`User`**: gains `name`.
- **`TrackingEvent`**: gains `actorId → User`. It stays immutable; the actor is written with the row.
- **`CarrierCoverageArea`**: gains `cityKey`; unique and index move to it.
- **`Seller`, `Carrier`**: `document` digits only.
- **`WebhookEndpoint`**: no schema change; provisioned on first dispatch.

## Success Criteria *(mandatory)*

- **SC-001**: For every demo shipment, the due date shown by the seller, carrier and admin views is identical, and the seller SLA summary, the late count and the SLA column agree on which delivered shipments were late.
- **SC-002**: After a fresh reset with the simulator on, a demo seller's first visit to Integrations shows at least one logged delivery within 30 s.
- **SC-003**: Every demo address returns at least two eligible carriers for at least one modality; "Sao Paulo" and "São Paulo" return the same carriers.
- **SC-004**: No request with an invalid CEP, UF or tax ID creates or updates a row (e2e: one `400` case each).
- **SC-005**: Signing in from a deep link lands on it in 100% of same-role cases; no `next` value leaves the origin (unit tests for `safeNext` cover absolute URLs, `//`, `/\`, foreign segments, and the empty value).
- **SC-006**: With the API stopped, no hard load of a role page shows "Something went wrong".
- **SC-007**: The `--input` border reaches ≥ 3:1 contrast against `--card` in both themes.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`) — PR A**:
  - `prisma/schema.prisma` + one migration `phase0_foundations` (FR-002, FR-005, FR-011, FR-012); backfills in SQL inside the migration.
  - `src/modules/shipments/`: `shipments.service.ts` (`create` writes `dueAt` and actor; `transitionWithEvent` takes `actorId` and writes `deliveredAt`; `findLateIds` typed; `slaSummaryForSeller` on columns; `findPublicByTrackingCode` adds names; new `findOneForAdmin`), `shipment.mappers.ts` (columns, `actorName`, admin detail mapper, actor include on the timeline), `admin-shipments.controller.ts` (`GET shipments/:id`, `@Auth(GlobalRole.ADMIN)`, `ParseUUIDPipe`), DTOs (`tracking-event`, `shipment-response`, `carrier-shipment-response`, new admin detail DTO, `public-tracking-response`, `create-shipment`, `eligible-carriers-query`).
  - `src/modules/carriers/`: `coverage-area-input.dto.ts` (UF), `carriers.service.ts` `setCoverageAreas` (`cityKey`), `create-carrier.dto.ts` (CNPJ).
  - `src/modules/sellers/dto/create-seller.dto.ts` (CPF/CNPJ).
  - `src/shared/validation/` (new): `IsUf`, `IsCep`, `IsTaxId({ cpf, cnpj })` decorators and their pure checks; `src/shared/transforms/normalize.ts` gains `toDigits`; a `cityKey()` helper next to them.
  - `src/modules/integrations/`: provisioning extracted from `WebhooksService.findOrCreateEndpoint` to a `sellerId`-keyed method both it and `WebhookDispatcher` call (placement chosen to avoid a provider cycle: the dispatcher is already injected into `WebhooksService`).
  - `src/modules/simulator/demo-dataset.ts` (names, extra carriers and their managers, `dueAt`/`deliveredAt`, actors; `DemoTenant` gains seller user ids and member user ids), `demo-tenant.service.ts` and `simulator.service.ts` (all demo carriers), `prisma/seed.ts`.
- **Web (`apps/web`) — PR B**:
  - `src/proxy.ts`, `src/lib/session.ts` (`safeNext`), `src/features/auth/hooks/use-login.ts`, `src/lib/query-client.ts` / `end-session.ts` (FR-018).
  - `src/components/common/segment-error.tsx`, `src/app/error.tsx`, a small `useApiHealth` hook (FR-019).
  - `src/features/tracking/components/tracking-timeline.tsx`, `public-tracking-details.tsx`, `src/features/tracking/types.ts` (FR-020, FR-026).
  - `src/lib/sla.ts`, `src/features/shipments/types.ts`, `shipment-columns.tsx` (FR-021).
  - `src/lib/br-documents.ts` (new), `shipment-address-form.tsx`, `features/companies/components/company-signup-form.tsx`, the list/detail/profile components that print `document` or `addressZipCode` (FR-022, FR-023).
  - `src/app/admin/shipments/[id]/page.tsx` (new), `features/shipments/components/admin-shipment-detail.tsx` (new, reusing `shipment-detail-parts.tsx`, `ShipmentStepper`, `TrackingTimeline`), `api/index.ts` + a `useAdminShipment` hook, `admin-monitoring-table.tsx`, `lib/routes.ts` (FR-024, FR-025).
  - `src/app/globals.css`, `components/common/charts/metric-bar-chart.tsx`, `features/carriers/components/stage-duration-chart.tsx` (FR-027–FR-029).
- **Prisma models touched**: `Shipment`, `User`, `TrackingEvent`, `CarrierCoverageArea`, `Seller`, `Carrier` (new columns and normalization, one migration); `WebhookEndpoint` (write).
- **Real-time**: no new event or room; the admin detail reuses `admin:monitoring`.
- **New dependencies**: none. Masks and check digits are a few lines each; a mask library is not justified.
- **Configuration**: none.

## Out of Scope

- The full SLA vocabulary and risk tones of ux-briefs §2.4 (due soon, at risk, SLA strip); this spec covers only the delivered verdict.
- `OwnerChip`, `ownerName` on list DTOs, names in the operator ranking, and collecting a name at signup or invite acceptance.
- The admin detail's map, webhooks tab and peek sheet (ux-briefs §5.3); the admin joining `shipment:{id}`.
- A city combobox for coverage and addresses; per-carrier simulator profiles and the wizard scorecard.
- Reattempt after a failed delivery and failure reason codes; the public "the carrier will try again" copy (SCREENS.md amendment) is implemented with reattempt, since `FAILED_DELIVERY` only leads to `RETURNED` today.
- Auto-retry with countdown on the unavailable page; a dedicated `/unavailable` route or HTTP 503.
- The alphanumeric CNPJ format (Receita Federal, 2026): tax IDs are digits only and a CNPJ with letters is rejected for now.

## Assumptions and Dependencies

- PR B depends on PR A (new response fields, admin endpoint). PR A is backward compatible for the current web: fields are only added, and zip codes and documents change format but are displayed as received.
- `/v1` consumers (spec 02) start receiving digits-only `addressZipCode` and new fields; the OpenAPI document reflects it.
- The webhook test inbox is internal, so provisioning endpoints for sellers that never visited Integrations delivers nothing outside the platform.
- The simulator drives the extra carriers with the demo carrier's timing; per-carrier speed and failure profiles belong to the scorecard phase.
- Normalizing documents to digits could collide with an existing row in a deployed database; the migration then fails on the unique constraint and the duplicate is resolved by hand before redeploying.

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above. Ship as two PRs: A (FR-001–FR-017, API, migration, seed) then B (FR-018–FR-029, web).
- Never edit an applied migration; the migration must run cleanly on a database seeded by the current `main`.
- Existing unit and e2e fixtures send `01310-100` and random 14-digit documents through Prisma directly; the zip is still valid input. Add e2e cases for the `400`s, the admin detail (`403`/`404`), accent-insensitive matching and webhook provisioning.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`.
- Record the decisions in `DESIGN.md` (FR-030) and set `Status` here on completion.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-06 | Spec created from the UX briefs (§1, §9 step 1, §10) and the PO reports; every item verified against `main`. `SCREENS.md` amended for the public sender line and failure-reason visibility |
| 2026-11-06 | Implemented: PR A (API, FR-001–FR-017) and PR B (web, FR-018–FR-029); `DESIGN.md` §9, §10 and §14 updated (FR-030) |
| 2026-11-09 | Review fixes: FR-019 names `retry`; one unavailable mapping (network, timeout or `5xx`) also drives client-loaded queries; `FAILED_DELIVERY` stops the SLA countdown. Judgment call: delivered-late rows are not tinted in lists (the tint asks for action), only their SLA cell reads "Late by …" |
