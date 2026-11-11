# Feature Specification: Dashboards

**Feature**: `dashboards` — `ShipmentsModule` (window, `late` view, seller and admin metrics, pulse), `CarriersModule` (performance and team by carrier id, admin carrier reads), `SellersModule` (admin seller reads, list stats) and `apps/web` (window selector, KPI tile, sparkline, pipeline bar, on-time rows, stage chart, the four dashboards and the two 360 pages)
**Created**: 2026-11-09
**Status**: Implemented
**Design reference**: `DESIGN.md` §9 (URL state), §16 (dashboards, carrier performance); `SCREENS.md` (Dashboard (Seller), Carrier Performance, General Dashboard, Sellers List, Seller Detail, Carriers List, Carrier Detail); `.claude/research/ux-briefs.md` §0, §2.2, §2.4, §2.7, §3.1, §4.3, §5.1, §5.4–§5.6, §8.2–§8.3, §9 step 7, §10.11; `po-seller.md` O1, O2, O5, O7; `po-carrier.md` P1–P4; `po-admin-public.md` A1, A3, A4, L3, S1, C1–C3; prototypes `Overview`, `Performance`, `AdminOverview`, `Seller360`, `Seller360Pending`, `Carrier360`, `SellersList` and `CarriersList` in the approved design canvas

## Summary

The seller Overview, the carrier Performance page, the admin Overview and two new admin tenant pages (Seller 360, Carrier 360) answer "how are we doing this period" with one shared time window held in the URL, KPI tiles that carry their sample size, target and trend, and a small set of shared charts. Every metric has one definition, computed once in the API with the on-time rule `deliveredAt ≤ dueAt`, so the same shipment set yields the same number on every screen. The admin Overview gains a live platform pulse.

## User Stories *(mandatory)*

### User Story 1 - One window for every aggregate (Priority: P1)

A user picks 7 d, 30 d or 90 d at the right of the page header, every windowed number on the page changes together, the choice survives reload and a shared link, and "now" numbers say "now" and do not move.

**Why this priority**: no dashboard has a window today (the API defaults silently to 90 days), so "64.7 %" has no period (ux-briefs §2.7; po-seller O1; po-carrier P2). Every later story reads the same control.

**Independent test**: on `/carrier/performance`, select 7 d, read `?window=7d` in the URL, reload and see 7 d selected and the same values; open the link in a new tab and see the same page.

**Acceptance scenarios**:

1. **Given** a dashboard without `window` in the URL, **when** it renders, **then** 30 d is selected and the API is called with `window=30d`.
2. **Given** the selector, **when** another option is chosen, **then** the URL `window` changes with replace semantics (no history entry), every windowed query refetches, and the previous values stay visible at reduced opacity until the new ones arrive.
3. **Given** an invalid `window` value in the URL, **when** the page renders, **then** 30 d is used and the value is dropped from the URL.
4. **Given** a tile labelled "now", **when** the window changes, **then** its value does not change.

---

### User Story 2 - Seller Overview that answers in five seconds (Priority: P1)

A seller sees four tiles (Active now, Late now, On time · window with sparkline, n and target, Delivered · window), a pipeline bar of the open stages, the Exceptions panel with the On time by modality rows under it, and an Activity panel grouped by shipment and capped at six entries.

**Why this priority**: the overview is the seller's home and today it is a static report with ambiguous "Needs attention" and "past SLA" numbers (po-seller §1; ux-briefs §3.1).

**Independent test**: as the demo seller, read "Late now" and click it to land on the Late tab with that many rows; click the In transit segment of the pipeline and land on `?status=IN_TRANSIT` with that many rows; switch to 7 d and see On time and Delivered change while Active and Late now stay.

**Acceptance scenarios**:

1. **Given** the seller overview, **when** a count tile or pipeline segment is activated, **then** the list opens filtered to exactly that number (FR-012 table).
2. **Given** fewer than 5 deliveries with an SLA in the window, **when** the On time tile renders, **then** its value reads "—" and its note "Not enough deliveries (n=<n>)", with no sparkline.
3. **Given** a status change over the socket, **when** it arrives, **then** tiles, pipeline, exceptions and activity refresh through the existing invalidation within 1 s.
4. **Given** no exception, **when** the panel renders, **then** it shows one line "Nothing needs you right now." and does not reserve height.

---

### User Story 3 - Carrier Performance that shows where time goes (Priority: P1)

A manager or operator sees On time (with sparkline, n and target), Median delivery, First attempt and Median claim for the window; a stage chart with the median bar, the p90 whisker and a budget tick per stage; and a Team table with every member by name and their active, claimed, delivered and on-time numbers.

**Why this priority**: the number every carrier is judged on (on-time) is missing, the averages are skewed by outliers, and the ranking shows e-mails and volume only (po-carrier §3 problems 1–6).

**Independent test**: as `carrier@demo.minitms.dev`, read the On time tile and compare it with the admin Carrier 360 of Transportadora Demo for the same window; read "Ana Souza" and "Bruno Lima" in the Team table and the manager under a "Manager" divider.

**Acceptance scenarios**:

1. **Given** the page, **when** it renders, **then** the status distribution, the "Avg. time between updates" tile and the operator ranking chart are gone.
2. **Given** a stage with fewer than 5 samples, **when** the chart renders, **then** that row reads "Not enough data (n=<n>)" with no bar.
3. **Given** "View as table", **when** it is pressed, **then** the chart is replaced by a table with stage, median, p90, budget and n, and the button reads "View as chart".
4. **Given** an operator, **when** the Team table renders, **then** their own row reads "You" and is highlighted.

---

### User Story 4 - Admin Overview with a pulse (Priority: P1)

An admin sees a pulse strip (events per minute, sockets, simulator, webhooks, queues, Postgres and Redis) refreshed every 5 s, four platform tiles for the window (On time, Late now, Failed, Median claim), the per-carrier on-time comparison and the review queue.

**Why this priority**: the admin page is static and two-thirds empty although it is the one role that sees the whole live system (po-admin-public §1.1).

**Independent test**: as admin, watch the Events value change while the simulator runs; stop Redis and see its dot read "down" without the rest of the page failing; compare the per-carrier rows with each Carrier 360 On time tile.

**Acceptance scenarios**:

1. **Given** the pulse request fails, **when** the strip renders, **then** it reads "Pulse unavailable · retrying" in place and the tiles, comparison and review queue still work.
2. **Given** `DEMO_SIMULATOR` is not `true`, **when** the pulse renders, **then** the Simulator item reads "Off" and no demo queue is listed.
3. **Given** a carrier with fewer than 5 deliveries in the window, **when** its comparison row renders, **then** it shows "n=<n>, not enough" and no bar.

---

### User Story 5 - Seller 360 (Priority: P2)

An admin opening a seller sees the header (name, approval badge, e-mail, masked tax ID, window selector, Approve/Reject when pending), and for an approved seller the KPI row (Shipments · window, On time, Active now, Late now), the ten most recent shipments, the status bar for the window and the enabled modalities.

**Why this priority**: the seller detail is a details card today, thinner than SCREENS.md "Seller Detail" (po-admin-public S1).

**Independent test**: open `/admin/sellers/<Loja Demo id>`, click "All <n> in Monitoring →" and land on monitoring filtered by that seller with the same total; open a pending seller and see the application details and Approve/Reject instead of KPIs.

**Acceptance scenarios**:

1. **Given** an approved seller with shipments, **when** the page renders, **then** the KPI tiles equal the seller's own overview for the same window (On time, Active, Late now).
2. **Given** a `PENDING` or `REJECTED` seller, **when** the page renders, **then** the existing company details panel replaces the KPI row and the panels, and the existing approve/reject actions stay where they are today.
3. **Given** an approved seller with no shipment, **when** the page renders, **then** it shows "No shipments yet" instead of zero tiles.

---

### User Story 6 - Carrier 360 (Priority: P2)

An admin opening a carrier sees the header, the carrier's KPI row (On time, Median delivery, First attempt, Active now), its stage chart and Team table read-only, its coverage and modalities, and its ten most recent shipments.

**Why this priority**: the admin cannot judge a carrier today, although the performance computation exists (po-admin-public C1–C3).

**Independent test**: for the same window, the Carrier 360 of Transportadora Demo and that carrier's `/carrier/performance` show identical KPI values, stage rows and team rows (e2e equality on the two endpoints).

**Acceptance scenarios**:

1. **Given** an admin, **when** `/admin/carriers/<id>` renders, **then** the Team table has no "You" row and no clickable rows.
2. **Given** a non-admin, **when** any `/carriers/:id/*` read is called, **then** it answers `403`; an unknown id answers `404`.

---

### User Story 7 - Tenant lists as scorecards (Priority: P3)

The admin Sellers list shows "Shipments · 30 d" and "On time" per row; the Carriers list shows "Shipments · 30 d", "On time" and "Failed".

**Why this priority**: the directory tells nothing about tenant health (po-admin-public L3); it is cheap once the metrics core exists.

**Independent test**: compare one row's numbers with that tenant's 360 page at 30 d.

**Acceptance scenarios**:

1. **Given** a page of the list, **when** it loads, **then** the stats come in the same response, computed with one query per page (no per-row request).
2. **Given** a tenant with fewer than 5 deliveries, **when** its On time cell renders, **then** it reads "n=<n>, not enough".

---

### Edge Cases

- A shipment without `dueAt` (modality without `slaHours`) counts in Delivered and Shipments but not in On time's `n`; the definition popover says so.
- The window is anchored on `createdAt` (FR-002): a shipment created 31 days ago and delivered yesterday is outside 30 d. 
- A `FAILED_DELIVERY` that later became `RETURNED` still counts as a failed first attempt (from history, as `performance` does today).
- Live demo shipments complete stages in minutes while seeded history spans hours; medians, not averages, are shown so neither dominates.
- A team member with no shipment in the window still has a row with zeros; on-time reads "—".
- The manager owns shipments: they appear in the manager row under the divider, not in the operator rows.
- A carrier signed up without users other than the manager: the Team table has only the manager section.
- A sparkline bucket with no delivery draws no point; with fewer than 3 buckets carrying data the sparkline is hidden.
- `window=30d` combined with `status=DELIVERED` on a list after the window's day boundary moves: counts are computed at request time, so a tile and the list opened a minute later can differ by shipments created exactly at the boundary; this is accepted.
- The pulse is called while the API runs several instances: socket counts come from `fetchSockets()` through the Redis adapter and include every instance.
- An admin opens `/admin/sellers/<id>` for an id that does not exist: the existing "Seller not found." state.

## Functional Requirements *(mandatory)*

### Window (API and web)

- **FR-001**: `StatsWindowQueryDto` MUST accept `window` ∈ `7d`, `30d`, `90d` (any other value `400`). When `window` is given, `since = now − <days>` and `since` is ignored; without either, the existing 90-day default stays (backward compatible). Every metrics endpoint of this spec, `GET /shipments/status-counts` and `GET /admin/shipments/status-counts` MUST accept it.
- **FR-002**: Windowed metrics MUST count shipments whose `createdAt ≥ since`, the existing contract of `createdSince` (`DESIGN.md` §16). Decision: Keep `createdAt` for every metric — one rule, one list filter, and the existing endpoints keep their meaning; the definition popovers say "created in the last 30 d".
- **FR-003**: `GET /shipments` (web seller list) and `GET /admin/shipments` MUST accept `window` as a filter `createdAt ≥ since`, combined by AND with the existing filters; view counts and status counts given the same `window` MUST apply it too.
- **FR-004**: A `late` view (open statuses with `dueAt < now`, the `attentionForSeller` late rule) MUST be added to `SELLER_VIEWS` (and so to `ADMIN_VIEWS` and both view-counts responses). Seller Shipments and Admin Monitoring MUST show a "Late" tab between Active and Exceptions. Decision: The Late tab, which keeps "every number is a door" exact.
- **FR-005**: A `WindowSelector` (segmented control, `role="radiogroup"` labelled "Time window", options "7 d · 30 d · 90 d", default 30 d) MUST read and write `window` through a `useStatsWindow()` hook (replace semantics, default omitted from the URL, invalid values dropped). It sits in the `PageHeader` action slot of the seller Overview, carrier Performance, admin Overview and both 360 pages, and keeps the segmented form at every width (three options fit at 320 px).
- **FR-006**: The lists MUST accept `window` as a URL key, pass it to the API, and show it as a removable chip "Created in the last <n> d" through `FilterChips`.

### Metrics core (API)

- **FR-007**: A pure `deliveryMetrics(rows, { since, now })` under `src/modules/shipments/metrics/` MUST compute every windowed metric of the table below from one row shape (`createdAt`, `status`, `dueAt`, `deliveredAt`, `modality`, first `ACCEPTED` time, ever-failed flag) and `percentile(values, p)` (nearest rank) MUST be added to `src/shared/stats/stats.ts`. Seller, carrier, admin and list endpoints MUST call it; no endpoint re-implements a rule. A rate with `n = 0` is `null`, never `0`.
- **FR-008**: Metric definitions (n is always the denominator; "in W" means `createdAt ≥ since`; open = the five statuses of `OPEN_STATUSES`):

| Metric | Value | n | Window |
|---|---|---|---|
| Active | count of open shipments | — | now |
| Late now | open and `dueAt < now` | — | now |
| Shipments | shipments in W | — | W |
| Delivered | `DELIVERED` in W | — | W |
| On time | `DELIVERED` in W with `dueAt` and `deliveredAt ≤ dueAt`, ÷ n, × 100 | `DELIVERED` in W with `dueAt` | W |
| On-time trend | On time per bucket, W split into 12 equal buckets by `createdAt`; `null` for an empty bucket | per bucket | W |
| Median delivery | p50 (nearest rank, as every median and p90 here) of `deliveredAt − createdAt` | `DELIVERED` in W | W |
| First attempt | outcomes without a `FAILED_DELIVERY` event ÷ n × 100 | in W and (`DELIVERED` or ever `FAILED_DELIVERY`) | W |
| Failed | 100 − First attempt; note carries failed and returned counts | as First attempt | W |
| Median claim | p50 (and p90) of first `ACCEPTED` event − `createdAt` | in W with an `ACCEPTED` event | W |
| Stage duration | p50 and p90 of the time spent in a status (next event − event) over consecutive happy-path pairs | pairs of that stage | W |

- **FR-009**: The web MUST treat a rate or median with `n < 5` as not enough data: value "—", note "Not enough <deliveries|data> (n=<n>)", no sparkline, no bar. The threshold and the 90 % target MUST live in one `lib/metrics.ts` (the target moves there from `sla-summary-chart.tsx`).

### Shared web primitives

- **FR-010**: `StatTile` MUST gain `scope` (rendered after the label in muted text: "now" or "30 d"), `definition` (an info button opening a Radix `Popover` from the installed `radix-ui` with the formula, `n` and window), `sparkline` (`(number|null)[]`) and `tone` (`critical` | `caution` on the value only, never on the card). Its accessible name MUST combine label, value and, for a link, the target ("Late now, 1. View late shipments"). The existing `problem` prop is replaced by `tone`.
- **FR-011**: A `Sparkline` (inline SVG 72×24, 2 px line in `--chart-1`, a dashed target line when given, gaps over `null` points joined to the next point, `aria-hidden`) MUST render the trend; the trend direction is stated in the definition popover text.
- **FR-012**: Drill-down targets (tile value = list total at request time):

| Screen | Tile / mark | Target |
|---|---|---|
| Seller Overview | Active now | `/seller/shipments?view=active` |
| | Late now | `?view=late` |
| | Delivered · W | `?status=DELIVERED&window=W` |
| | Pipeline segment S | `?status=S` |
| Admin Overview | Late now | `/admin/monitoring?view=late` |
| Seller 360 | Shipments · W | `/admin/monitoring?sellerId=X&view=ALL&window=W` (Monitoring lands on Active) |
| | Active now / Late now | `?sellerId=X&view=active` / `view=late` |
| Carrier 360 | Active now | `/admin/monitoring?carrierId=X&view=active` |

Rate and median tiles (On time, Median delivery, First attempt, Failed, Median claim) are not links (spec 06 FR-027 rule).
- **FR-013**: A `PipelineBar` MUST replace `StatusDistribution` on the seller Overview: one segment per open status in lifecycle order, width proportional to its count, a zero segment drawn as a 4 px stub, each segment a link (`aria-label` "<n> <status>"), labels inside when they fit and a legend below 768 px, status hues from `SHIPMENT_STATUS_DOT`.
- **FR-014**: An `OnTimeRows` component MUST render one row per item (label, rate, `n=`), a meter bar (6 px, same-ramp track) and a target tick at 90 %, with the n < 5 rule of FR-009; it is used by the seller On time by modality panel, the admin per-carrier comparison and nowhere else.
- **FR-015**: `StageDurationChart` MUST be rewritten as an HTML/SVG row chart: per stage a p50 bar, a p90 whisker, a dashed budget tick, the value text "<p50> · p90 <p90>" and "over budget" in the critical tone when p50 exceeds the budget; a shared hour axis; a legend line ("Bar = median · Whisker = p90 · Tick = stage budget · n=<n>"); a "View as table" toggle; a per-row tooltip on hover and focus. Recharts is no longer used by this chart.
- **FR-016**: Stage labels and budgets. Decision: Label each row by the status the shipment sits in — "Claim wait" (`PENDING`), "Pickup wait" (`ACCEPTED`), "At origin" (`COLLECTED`), "Line haul" (`IN_TRANSIT`), "Last mile" (`OUT_FOR_DELIVERY`) — and define the budget as a fixed share (10 / 20 / 10 / 40 / 20 %) of the median `slaHours` of the window's sampled shipments, held as one constant in the API and named in the legend.

### Seller Overview v2

- **FR-017**: `GET /shipments/metrics?window` (seller, approved) MUST return `{ delivered, onTime: { n, count, rate, trend }, byModality: [{ modalityCode, modalityName, n, count, rate }] }` from FR-007. `GET /shipments/sla-summary` is unchanged.
- **FR-018**: The overview MUST render, in order: header ("Overview", WindowSelector, "Create shipment"); tiles Active now (note "<n> waiting for a carrier"), Late now (critical tone when > 0, note "oldest <span>"), On time · W (sparkline, note "n=<n> · target 90%"), Delivered · W; the pipeline bar; then a two-column grid (7 fr / 5 fr): left Exceptions over On time by modality, right Activity. Below 1024 px the columns stack in that order.
- **FR-019**: The Exceptions panel MUST replace "Needs your attention", reading the existing `GET /shipments/attention`: title "Exceptions" with the total as a badge (`aria-live="polite"`, announced on change only), header counts "<l> late · <f> failed", rows with `RiskBadge`, code, destination and modality, a footer link "All exceptions" to `?view=exceptions` when more exist than shown, and the one-line empty state.
- **FR-020**: The Activity panel MUST group the latest 20 events (`limit=20`, the existing maximum) by shipment, keeping each shipment's newest position, render at most 6 groups, each on two lines: the code, then "<status> → <status> · <city>" (the status first, so a narrow screen truncates the city), with the newest time; a row keeps the status it came from once known, even after its older event leaves the batch, and end with "See all updates" to `/seller/shipments`. Pause, hold-on-hover and arrival animation keep working per group.
- **FR-021**: Layout (decision §10.11): the two columns stack independently (`align-items: start`), no panel stretches to fill height, and with the demo dataset at 1440 px their bottoms end within 24 px of each other; content moves between columns to meet it, card heights are never padded.

### Carrier Performance v2

- **FR-022**: `CarriersService.performance` and `operatorRanking` MUST take a `carrierId` (the `me/*` routes resolve it from the user first) and the window. The performance response MUST become `{ totalShipments, onTime: { n, count, rate, trend }, medianDelivery: { hours, n }, firstAttempt: { rate, n, failed, returned }, claim: { p50Minutes, p90Minutes, n }, stages: [{ status, p50Hours, p90Hours, budgetHours, n }] }`; `avgHoursBetweenEvents`, `failedDeliveryRate`, `returnedRate`, `shipmentCountsByStatus` and the average stage durations are removed (the web is their only reader).
- **FR-023**: `GET /carriers/me/operator-ranking` MUST return every `CarrierUser` of the carrier: `{ carrierUserId, name, email, role, active, claimed, delivered, onTime: { n, count, rate } }`, `active` = owned and open now, `claimed` = owned, created in W, not cancelled (today's `totalOwned`), `delivered` and `onTime` over the owned shipments in W; ordered by role (operators first), then `active` descending.
- **FR-024**: The page MUST render: header with WindowSelector; tiles On time · W (sparkline, n, target), Median delivery · W (note "n=<n>"), First attempt · W (note "<f> failed · <r> returned"), Median claim · W (note "p90 <x> · n=<n>"); then a two-column grid (6 fr / 6 fr) with the stage chart and the `TeamTable` (columns Name with `OwnerChip`-style initials, Active, Claimed, Delivered, On time; a "Manager" divider row; "You" on the signed-in user's row, highlighted). Rows are not links.
- **FR-025**: The page MUST subscribe to the queue room and its performance and team query keys MUST be invalidated by `shipment:updated`, throttled to one refetch per 10 s.

### Admin Overview and Platform pulse

- **FR-026**: `GET /admin/metrics?window&sellerId&carrierId` (`ADMIN`) MUST return `{ shipments, active, lateNow, onTime, medianDelivery, firstAttempt, claim, byCarrier }` from FR-007, scoped by the optional ids; `byCarrier` lists every `APPROVED` carrier `{ carrierId, companyName, n, count, rate }` and is empty when `carrierId` is given.
- **FR-027**: `GET /admin/pulse` (`ADMIN`) MUST return `{ eventsPerMinute: number[15], sockets: { internal, public }, simulator: 'off' | 'running' | 'idle', webhooks: { n, successRate, p95Ms }, queues: [{ name, waiting, failed }], services: { database: boolean, redis: boolean } }`: events = `TrackingEvent` per minute over the last 15 minutes; sockets from `fetchSockets()` on both gateways (a counting method next to `TrackingPresence.hasViewers`); simulator `off` without `DEMO_SIMULATOR=true`, else `running` with viewers and `idle` without; webhooks over `WebhookDelivery` created in the last hour with status `SUCCEEDED` or `FAILED` (`successRate` null at n = 0, p95 of `durationMs`); queues `webhooks` always and `demo` only when the simulator module is loaded (optional injection); services through the existing Terminus indicators. A failing part MUST degrade to its own null or `false`, never fail the response.
- **FR-028**: The page MUST render: header ("Platform overview", description "<n> applications waiting for review" as today, WindowSelector); the `PulseStrip` (one row of items, two columns below 768 px; Events with a 15-point sparkline, Sockets "<n> · <p> public", Simulator with a word, Webhooks · 1 h "<rate> · p95 <ms>", Queues "<w> waiting · <f> failed", Data "Postgres up · Redis up" with dots that always carry a word), polled every 5 s, ignoring the window; tiles On time · W, Late now, Failed · W, Median claim · W; then a two-column grid (8 fr / 4 fr): "On time by carrier · W" (`OnTimeRows`, each label a link to the Carrier 360) and the existing "Waiting for review" panel.
- **FR-029**: The status distribution panel and the Sellers / Carriers / In progress / Delivered tiles MUST be removed from the admin Overview. Decision: Show them in the review panel subtitle ("3 sellers · 3 carriers"); nav count badges belong with the list smart defaults (Out of Scope).

### Seller 360 and Carrier 360

- **FR-030**: `GET /sellers/:id/modalities` (`ADMIN`) MUST return the modality catalog with the seller's enabled flags through the existing `buildModalityToggles`. `GET /carriers/:id/performance`, `/carriers/:id/operator-ranking`, `/carriers/:id/coverage-areas` and `/carriers/:id/modalities` (`ADMIN`, `ParseUUIDPipe`, `404` for an unknown carrier) MUST reuse the `me/*` service methods by id, so their numbers equal the manager's for the same window.
- **FR-031**: `/admin/sellers/[id]` MUST render: breadcrumb "Sellers / <name>", header (name, `ApprovalStatusBadge`, e-mail and masked tax ID with copy buttons, WindowSelector when approved, existing approve/reject actions when pending). Approved: tiles Shipments · W, On time · W, Active now, Late now (`/admin/metrics?sellerId`); a grid (8 fr / 4 fr) with "Recent shipments" (the 10 newest from `GET /admin/shipments?sellerId&limit=10`, monitoring columns without toolbar, rows to `/admin/shipments/[id]?sellerId=X&view=ALL` so the detail's breadcrumb returns to that Monitoring scope, header link "All <n> in Monitoring →" to `?sellerId=X&view=ALL`) and, stacked, "Status · W" (`StatusDistribution` fed by admin status counts with `sellerId` and `window`, "No shipments in this window." when empty) and "Modalities" (the whole catalog, each reading Enabled or Off), the last right-hand panel filling the column so both columns end together. Pending or rejected: the existing `CompanyReview` content.
- **FR-032**: `/admin/carriers/[id]` MUST render the same header (manager e-mail, user count) and, approved: tiles On time · W, Median delivery · W, First attempt · W, Active now (`/carriers/:id/performance` and `/admin/metrics?carrierId` for Active); the stage chart full width; then, from 1280 px, a grid (8 fr / 4 fr) with "Recent shipments" (as FR-031, `carrierId`) and, stacked, the read-only `TeamTable` and "Coverage & modalities" (UF / city chips, "All of <UF>" for a state-wide row, the enabled modalities with SLA hours, one request), the last panel filling the column so both columns end together; below 1280 px they stack full width. Performance and team refresh like carrier Performance (throttled to one refetch per 10 s on `shipment:updated`). "No shipments yet" for an approved carrier without any. Pending or rejected: the existing `CompanyReview` content.

### Admin lists

- **FR-033**: `GET /sellers` and `GET /carriers` MUST accept `include=stats` and then add `stats: { shipments, onTime: { n, count, rate } }` (carriers also `failed: { rate, n }`) per row over a fixed 30-day window, computed for the page's ids with one query per list through FR-007.
- **FR-034**: The Sellers list MUST add columns "Shipments · 30 d" and "On time"; the Carriers list "Shipments · 30 d", "On time" and "Failed", through `CompanyApprovalTable` `extraColumns`, with the n < 5 rule.

### Docs

- **FR-035**: On completion, `SCREENS.md` Dashboard (Seller), Carrier Performance, General Dashboard, Seller Detail, Carrier Detail and both lists MUST describe the new content and link this spec's metric table; `DESIGN.md` §16 MUST describe the window parameter, the metrics core and its table, the pulse, and drop the "Known gap" line for the seller and admin dashboards (they refresh through `shipmentKeys.all`).

### Key Entities

- **`Shipment`** (`schema.prisma`): read only; `createdAt`, `status`, `dueAt`, `deliveredAt`, `ownerId`, `modalityId`, `sellerId`, `carrierId` drive every metric. No migration.
- **`TrackingEvent`**: read for the first `ACCEPTED` time, ever-failed flags, stage durations and events per minute.
- **`CarrierUser`**, **`User`**: read for team rows (role, name).
- **`SellerModality`**, **`CarrierModality`**, **`CarrierCoverageArea`**: read for the 360 pages.
- **`WebhookDelivery`**: read for the pulse.

## Success Criteria *(mandatory)*

- **SC-001**: For the same window, the On time value of a seller is identical on the seller Overview, the Seller 360 and the Sellers list (30 d), and a carrier's is identical on carrier Performance, the Carrier 360, the admin per-carrier row and the Carriers list (e2e on the endpoints).
- **SC-002**: Every count tile of FR-012 equals the total of the list it opens on the demo dataset (e2e on the API pairs; web unit test on the hrefs).
- **SC-003**: `deliveryMetrics` has unit tests at each boundary: `deliveredAt = dueAt` (on time), a missing `dueAt` (excluded), a failed-then-returned shipment (failed first attempt), an empty window (null rates), and 12-bucket placement at the window edges.
- **SC-004**: With Redis stopped, `GET /admin/pulse` answers `200` with `redis: false` within 5 s, and the admin Overview still renders its tiles.
- **SC-005**: Every non-admin call to the new admin reads answers `403` (e2e per route).
- **SC-006**: No pull request of the delivery plan exceeds about 500 changed lines including tests.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/shared/stats/`: `stats.ts` (`percentile`, `WINDOW_DAYS`), `stats-window-query.dto.ts` (`window`).
  - `src/modules/shipments/metrics/` (new): `delivery-metrics.ts` (pure, FR-007/FR-008), `metric-rows.ts` (the one `select` and event lookup that feeds it), DTOs `metrics-response.dto.ts`, `admin-metrics-response.dto.ts`, `pulse-response.dto.ts`.
  - `src/modules/shipments/`: `shipment-views.ts` (`late`), list and status-count DTOs (`window`), `shipments.service.ts` (`metricsForSeller`, `metricsForAdmin`), `shipments.controller.ts` (`GET metrics` before `:id`), `admin-shipments.controller.ts` (`GET metrics`, `GET pulse`), `pulse.service.ts` (new; injects both gateways' counts, `WEBHOOKS_QUEUE`, optional `DEMO_QUEUE`, Terminus indicators).
  - `src/modules/carriers/`: `carriers.service.ts` (by-id performance and team, coverage and modalities by id), `carriers.controller.ts` (`:id/*` routes after the `me/*` ones), DTOs.
  - `src/modules/sellers/`: `sellers.controller.ts` (`:id/modalities`), list `include=stats` in both list DTOs and services.
  - `src/modules/tracking/tracking-presence.ts`: a socket count method beside `hasViewers`.
- **Web (`apps/web`)**:
  - `src/components/common/`: `window-selector.tsx`, `stat-tile.tsx` (FR-010), `charts/sparkline.tsx`, `charts/pipeline-bar.tsx`, `charts/on-time-rows.tsx`, `charts/stage-chart.tsx` (generic rows with p50/p90/budget), `src/hooks/use-stats-window.ts`, `src/lib/metrics.ts`.
  - `features/shipments/`: `seller-dashboard.tsx` + `use-seller-dashboard.ts` (metrics query, window), `activity-feed.tsx` (grouping), `api/index.ts` + `keys.ts` (`metrics`, `adminMetrics` under `shipmentKeys.all`), list tables (`late` tab, `window` key and chip).
  - `features/carriers/`: `carrier-performance.tsx`, `stage-duration-chart.tsx`, `team-table.tsx` (replaces `operator-ranking-chart.tsx`), hooks take the window and an optional carrier id.
  - `features/admin/`: `seller-360.tsx` and `carrier-360.tsx` (replace `seller-detail-card.tsx` and `carrier-detail-card.tsx`; only `admin` may compose sellers or carriers with shipments), `admin-dashboard.tsx`, `pulse-strip.tsx`, `use-admin-metrics.ts`, `use-pulse.ts`; `features/companies/company-approval-table.tsx` (stats columns).
  - Routes unchanged: `/seller`, `/carrier/performance`, `/admin`, `/admin/sellers/[id]`, `/admin/carriers/[id]`.
- **Prisma models touched**: read only (Key Entities). No migration.
- **Real-time**: no new event or room. Seller and admin metrics refresh through `shipmentKeys.all` invalidation; carrier Performance joins the queue room (FR-025); the pulse polls every 5 s.
- **New dependencies**: none. `Popover` comes from the installed `radix-ui`; the sparkline, pipeline, rows and stage chart are plain SVG/HTML (Recharts stays for no new chart).
- **Configuration**: none.

## Delivery Plan

Stacked pull requests, merged in order; each passes the verification of the Notes below on its own and leaves every screen working. Sizes are changed lines including tests, estimated against `docs/spec-06-wrapup`.

| # | Branch | Content | FRs | Apps | Size | Depends on |
|---|---|---|---|---|---|---|
| 1 | `feat/stats-window-api` | `window` on the stats DTO, status counts and the seller/admin lists; `late` view and its counts; e2e | FR-001–FR-004 (API) | api | ~300 | — |
| 2 | `feat/metrics-core` | `percentile`, `deliveryMetrics` and its row loader, boundary unit tests | FR-007–FR-008 | api | ~380 | 1 |
| 3 | `feat/window-selector` | `useStatsWindow`, `WindowSelector`, list `window` key and chip, Late tabs on seller Shipments and Monitoring | FR-004 (web), FR-005, FR-006 | web | ~330 | 1 |
| 4 | `feat/kpi-tile` | `StatTile` scope/definition/sparkline/tone, `Sparkline`, `lib/metrics.ts`, call sites moved from `problem` to `tone` | FR-009–FR-011 | web | ~340 | — |
| 5 | `feat/dashboard-charts` | `PipelineBar`, `OnTimeRows`, generic stage chart with whisker, budget tick and table view | FR-013–FR-015 | web | ~460 | 4 |
| 6 | `feat/seller-metrics` | `GET /shipments/metrics`; overview tiles, window, pipeline, on-time rows, layout | FR-012 (seller), FR-017, FR-018, FR-021 | api, web | ~420 | 2, 3, 5 |
| 7 | `feat/seller-overview-panels` | Exceptions panel, grouped Activity capped at 6 | FR-019, FR-020 | web | ~300 | 6 |
| 8 | `feat/carrier-performance-api` | performance and team by carrier id with window, new response shape, e2e | FR-016 (API), FR-022, FR-023 | api | ~480 | 2 |
| 9 | `feat/carrier-performance-web` | KPI row, stage chart labels, `TeamTable`, window, live refresh; old tiles, distribution and ranking removed | FR-016 (web), FR-024, FR-025 | web | ~420 | 3, 5, 8 |
| 10 | `feat/admin-metrics` | `GET /admin/metrics`; admin Overview tiles, per-carrier rows, layout, removed panels | FR-012 (admin), FR-026, FR-028 (without pulse), FR-029 | api, web | ~450 | 2, 3, 5 |
| 11 | `feat/admin-pulse-api` | `PulseService`, socket counts, optional demo queue, degraded parts, e2e | FR-027 | api | ~320 | — |
| 12 | `feat/admin-pulse-web` | `PulseStrip`, 5 s poll, unavailable state | FR-028 (pulse) | web | ~220 | 10, 11 |
| 13 | `feat/seller-360` | `GET /sellers/:id/modalities`; Seller 360 page (approved and pending variants) | FR-012 (360), FR-030 (seller), FR-031 | api, web | ~470 | 6, 10 |
| 14 | `feat/carrier-360-api` | `/carriers/:id/{performance,operator-ranking,coverage-areas,modalities}`, equality e2e | FR-030 (carrier) | api | ~260 | 8 |
| 15 | `feat/carrier-360-web` | Carrier 360 page | FR-032 | web | ~420 | 9, 13, 14 |
| 16 | `feat/admin-list-stats` | `include=stats` on both lists, stats columns | FR-033, FR-034 | api, web | ~360 | 2 |
| 17 | `docs/spec-07-wrapup` | SCREENS.md and DESIGN.md, Status and Changelog | FR-035 | docs | ~80 | 1–16 |

PRs 1, 4 and 11 have no dependency and can be opened in parallel; 16 only needs 2. If PR 8 exceeds the budget, the team half (FR-023) moves into PR 9's API side as its own PR before 9.

**Merge and deploy together:** the four carrier Performance PRs (performance API, team API, performance web, performance polish — #125, #126, #128, #129) change the performance response shape; `/carrier/performance` only works again once all four are in.

## Out of Scope

- The Chaos Mode scenario, the Demo card and the global banner (demo showcase phase).
- The mini control tower map on the admin Overview and the Fleet tab of the Carrier 360 (live depth phase, `FleetMap`).
- Deltas against the previous period, a 24 h option, a custom date range, and an On-time "Trend" tab (the sparkline carries the trend).
- Typed exceptions (At risk, Stalled, Signal lost), action owners ("Carrier must act"), exception filter chips, and the peek from an exception row; the panel keeps the failed and late items of `attention`.
- Activity filter chips (All / Exceptions / Deliveries).
- Links from the modality and carrier on-time bars to filtered lists (rates are not doors; a `modalityId` list filter does not exist).
- Failure reasons ("Why deliveries fail" tab): no reason code is stored.
- Team columns median handling, failures and last active; a team row opening the queue filtered by owner (no owner filter exists); reassignment.
- Review history (`reviewedBy`, `reviewedAt`, rejection reason), the pending "What to check" checklist, and the Integrations tab / webhook KPI of the Seller 360.
- Section tabs on the 360 pages; the coverage map; invites in the Carrier 360 team.
- Smart default (Pending only when non-empty), search and the coverage column on the admin lists; nav count badges.
- A platform-median scorecard for carriers; caching of metrics in Redis.

## Assumptions and Dependencies

- Based on `docs/spec-06-wrapup` (specs 05 and 06, PRs #95–#112): `dueAt`, `deliveredAt`, `User.name`, `TrackingEvent.actorId`, `RiskBadge`, `ViewTabs`, `FilterChips`, view counts, `StatTile.href` and the seller attention and activity endpoints exist. This spec cannot merge before them.
- On-time follows the API rule `deliveredAt ≤ dueAt` (spec 05 FR-003, `slaSummaryForSeller`) and `lib/sla.ts` (`onTime` / `deliveredLate`); the metrics core is the only new place that applies it in aggregate, and `slaSummaryForSeller` is moved onto it in PR 2 without changing its output.
- Aggregation stays in application code over the window's rows (`DESIGN.md` §16); at demo volume (hundreds of shipments per tenant, at most 90 days) a full metrics response costs one shipment query and one event query. SQL percentiles or a rollup are the next step if volume grows.
- Owners stand for claimers in the team table: claiming sets the owner and nothing reassigns it yet.
- The pulse polls; a pushed `admin:pulse` event is not needed at 5 s.
- The default window changes the numbers users saw before (90 d silently, now 30 d labelled); this is intended.

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above, one PR of the Delivery Plan at a time, each on its own branch stacked on its dependencies. Stop and re-split a PR that grows past about 500 changed lines.
- Register static routes (`shipments/metrics`, `admin/metrics`, `admin/pulse`) before `:id` routes, and the `carriers/:id/*` routes after `carriers/me/*`.
- e2e cases: `window` values and `400`, the `late` view against its count, each FR-012 pair, the seller/carrier/admin On time equality, the Carrier 360 equality, `403` per admin route, the pulse with a failing indicator.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`. Screenshot each dashboard at 1440 and 390 px in light and dark mode to check FR-021 and the chart labels.
- Record the decisions in `DESIGN.md` (FR-035) and set `Status` here on completion.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-09 | Spec created from the UX briefs (§2.2, §2.4, §2.7, §3.1, §4.3, §5.1, §5.4–§5.6, §9 step 7, §10.11), the PO reports and the approved prototypes; every item verified against `docs/spec-06-wrapup` |
| 2026-11-10 | Implemented as one linear stack (#116–#134, then the branches below). Deviations: rows split to stay under 500 lines — PR 2 (+ `sla-summary-metrics`), 6 (`seller-metrics`, `seller-metrics-web`), 8 (`carrier-performance-api`, `carrier-team-api`), 9 (`on-time-tile`, `carrier-performance-web`, `carrier-performance-polish`), 10 (`admin-metrics-api`, `admin-metrics`), 13 (`seller-360-api`, `tenant-header`, `seller-360`, `recent-shipments`), 15 (`carrier-by-id-web`, `carrier-360-web`); Recharts removed entirely once its last chart was replaced (`drop-metric-bar-chart`, `drop-chart-ui`, `drop-recharts`), where this spec kept it; both 360 pages live in `features/admin` (the feature import rules let only `admin` compose sellers or carriers with shipments); the Carrier 360 puts the stage chart full width and stacks Team over Coverage beside Recent shipments, and the Seller 360 lists the whole modality catalog with Enabled/Off, so the columns end close (FR-021) without padding; a pulse part that cannot be read is `null` (sockets, simulator, events, webhooks) or left out (a queue); the Carrier 360 performance and team refresh on window change and refocus, not on each socket event |
