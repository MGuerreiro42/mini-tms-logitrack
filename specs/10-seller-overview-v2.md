# Feature Specification: Seller Overview v2

**Feature**: `seller-overview-v2`. It touches:
- `SimulatorModule`: a 90-day demo seed on 3 carriers and 4 UFs.
- `ShipmentsModule`: the seller metrics, attention groups, the activity window and the new list filters.
- `IntegrationsModule`: webhook health.
- `apps/web`: the seller Overview, rebuilt on the reimagined components.

**Created**: 2026-11-11
**Status**: Draft
**Design reference**:
- **Chosen board.** "Overview · reimagined components · 1440 light" on the design canvas (`project/Reimagined.dc.html`), with:
  - its 390 variant (`project/ReimaginedMobile.dc.html`, the same artboard with `mobile`);
  - `project/ComponentsSheet.dc.html` for interaction and motion;
  - `project/States.dc.html` for low-n, empty and webhook states.
- **Research.** In `.claude/research/seller-overview-v3/`:
  - `final.md` for metric definitions, the delta rule, the honesty threshold and mock numbers;
  - `fe.md` for API shapes and primitive reuse;
  - `suggestions.md` for S1, S9 and S10;
  - `ux-ideas.md` for drill-through, the live and screen-reader policy, and states;
  - `visual-ideas.md` for the SLA colour validation and mark specs;
  - `design-notes.md` for the round 2 SLA pair and the a11y audit.
- **Specs.**
  - spec 07 (metrics core, `StatTile`, `StageChart`, `OnTimeRows`, two-column layout);
  - spec 08 (`demo:reset`, the 3 demo carriers, `--warning`);
  - spec 09 (app sidebar: 240 px at ≥ 1280, 64 px rail at 1024–1279).

## Summary

A seller opens the Overview and reads, in one screen:
- what needs them now, and who must act on each item;
- what is moving, with one dot per open shipment shaped by its SLA state;
- how well they keep the promise, as rates with honest sample sizes, ranges and comparisons.

Every number links to the shipments behind it, using a filter whose count equals the number. The page keeps today's tokens, density and live refresh. It grows from 4 tiles, a pipeline bar, exceptions, a modality list and a feed into the board's sections:
- the window range line;
- six tiles, each with a micro-figure;
- Shipment flow;
- Exceptions grouped by cause;
- Recent updates with a 4-hour strip;
- On time by, with 95 % ranges;
- Volume;
- an insight line with Delivery health;
- Promise against reality.

A 90-day demo dataset lands first, so every section has real data to show.

## User Stories *(mandatory)*

### User Story 1 - A demo seller with 90 days of history (Priority: P1)

After a reset, the demo seller `seller@demo.minitms.dev` has about 180 shipments created over 90 days. They are spread over Transportadora Demo, Rápido Paulista and EconoLog, with destinations in SP, RJ, MG and PR. Every section of the Overview therefore shows data, not an empty state.

**Why this priority**: today's seed has 35 shipments on one carrier and one UF. The Destination tab, the ranges, Volume and the deltas cannot be reviewed without this seed (`final.md` Q5).

**Independent test**: reset the demo. As the demo seller, call `GET /shipments/metrics?window=90d` and read the `final.md` values within the stated tolerance. Reset again and get byte-identical shipments, apart from ids and the shift of `now`.

**Acceptance scenarios**:

1. **Given** the reset job runs, **when** it finishes, **then** Loja Demo holds:
   - 180 shipments: 150 delivered, 3 failed, 6 returned, 5 cancelled, 16 open;
   - 137 of the 150 delivered on time;
   - the per-modality and per-UF counts of `final.md`.
2. **Given** the seeded open shipments, **when** the simulator ticks, **then** every open one sits on one of the 8 SP addresses that have live-map routes. RJ, MG and PR appear only on terminal shipments.
3. **Given** `SEED_DEMO=true`, **when** the seed runs twice, **then** EconoLog covers RJ, MG and PR (whole state) besides SP, and no coverage row is duplicated.

---

### User Story 2 - What needs me, and who acts (Priority: P1)

The seller reads the insight line, then the Exceptions panel:
- the insight line has up to 4 rule-based sentences, each a link, next to Delivery health;
- Exceptions are grouped by cause (Late, Failed attempt, Waiting for a carrier, Webhook). Each row has an owner chip ("Carrier must act", "Waiting for carrier", "You"), and late rows carry an SLA overrun track.

**Why this priority**: the Overview's job is "what needs you". Today's exceptions list does not say who acts or how far past the SLA a shipment is (S10, `ux-ideas.md` top 6).

**Independent test**: on the reset demo, read "2 late, oldest 7 h" in the insight line and follow it to `/shipments?view=late`, which lists 2 rows. Turn on "Fail requests" for the demo endpoint and wait for 5 failed deliveries. A "Webhook" group appears first with owner "You", and the strip above the tiles reads "Webhooks down".

**Acceptance scenarios**:

1. **Given** 2 late and 3 failed shipments, **when** the panel renders, **then** it reads "Exceptions 5". It shows the group "Late 2" (rows ordered by overrun, each with "79 h of a 72 h SLA" and its track), then "Failed attempt 3" (rows with the failure note as reason).
2. **Given** a pending shipment created 3 h ago with no carrier, **when** the panel renders, **then** a "Waiting for a carrier" group lists it with owner "Waiting for carrier", and `view=exceptions` includes it.
3. **Given** no exception, **when** the panel renders, **then** it reads "Nothing needs you right now." and the insight line shows its quiet state.
4. **Given** the API later returns a group type the web does not know (phase 4 `at_risk`, `stalled`), **when** the panel renders, **then** the group appears with its server label, a neutral owner chip and its rows, and nothing else changes.

---

### User Story 3 - What is moving now (Priority: P1)

The seller sees the six tiles and Shipment flow: the five open stages, one dot per shipment, where the dot's shape is its SLA state (ring = on track, half disc = due soon, filled disc = late). The legend reads "On track 11 · Due soon 3 · Late 2". A carrier scan slides the dot to its next stage.

**Why this priority**: it replaces two rows (the pipeline bar, and the outlook bar that failed the CVD check) with one, and makes SLA state readable without colour (`design-notes.md`).

**Independent test**: open the Overview and a carrier session side by side. Advance a shipment from In transit to Out for delivery and watch its dot move within 2 s. With `prefers-reduced-motion: reduce`, it appears in place. Follow "Due soon 3" to a list of 3 shipments.

**Acceptance scenarios**:

1. **Given** 16 open shipments, **when** the flow renders, **then** each stage shows its count and one mark per shipment. A mark's accessible name is "<code>, <city>/<UF>, <SLA label>", and each stage has an aria-label like "In transit 5: 3 on track, 1 due soon, 1 late 7 hours."
2. **Given** more than 100 open shipments, **when** the flow renders, **then** the counts stay exact, the first 100 marks by due time are drawn, and each stage ends with "+N".
3. **Given** a viewport under 420 px wide, **when** the flow renders, **then** it becomes 5 rows (stage name, count, its marks wrapping).

---

### User Story 4 - How well I keep the promise (Priority: P2)

The seller reads:
- the rate tiles, with their delta against the previous equal window;
- On time by Modality or Destination: a rate dot with its 95 % Wilson range against the 90 % target;
- Volume by week, coloured by status now;
- Promise against reality: cumulative median stage times over each stage's budget, plus the slow-tail table.

**Why this priority**: valuable, but it comes after "what needs me". Every piece honours the n ≥ 5 rule and the maturity rule.

**Independent test**: switch from 90 d to 7 d. The range line updates. If the 7 d window is immature, "Comparison once more shipments close" replaces the delta. Open the Destination tab and read "PR 78 % of 9, 45–94 %". Follow PR to `/shipments?status=DELIVERED&window=90d&uf=PR` and count 9.

**Acceptance scenarios**:

1. **Given** both windows have n ≥ 5 and the current one is mature, **when** the On time tile renders, **then** its figure shows the current dot, a hollow previous dot and the 90 % tick. The 1440 note reads "n=150 · ○ prev 88.1% · | 90%"; the 390 note reads "n=150 · ▲ 3.2 pts".
2. **Given** a UF with n < 5, **when** the Destination tab renders, **then** the row keeps its place (sorted last), shows no dot or range, and reads "too few · n=3".
3. **Given** fewer than 5 shipments in the window, **when** Volume renders, **then** it shows only "Volume shows once you have 5 shipments in this window." with no axis.

---

### User Story 5 - Live without noise (Priority: P2)

The page stays live through `shipment:updated` and `webhook:delivery`. A changed value ticks once and its panel glows once. A screen reader hears only:
- exception count changes;
- Delivery health band changes;
- webhooks going Down.

These are batched into one sentence at most every 10 s. Recent updates can be paused.

**Why this priority**: the live refresh exists. This story governs how the new sections show and announce it (`ux-ideas.md` §0).

**Independent test**: with a screen reader, start Chaos Mode "Storm: failed deliveries" and hear "Exceptions 5 → 6." at most once per 10 s, never per feed row. Press "Pause updates", see "Paused · 3 new" after three events, and press "Back to live".

**Acceptance scenarios**:

1. **Given** a refetch changes the late count, **when** the tile updates, **then** the value plays `value-in` (150 ms) once and the panel plays `live-halo` once. Under reduced motion neither runs.
2. **Given** webhook health turns Down, **when** the strip appears, **then** it is `role="alert"` (assertive). Degraded is `role="status"`.

---

### Edge Cases

- **New seller with fewer than 5 shipments in the window.** The tiles follow States A ("—" plus "n = 3"). Each micro-figure is replaced by its note. The insight line shows "Not enough history to call trends yet · Only "late" and "webhooks" rules run (n = 3)". Delivery health shows "Building your score · 3 of 10 deliveries".
- **Seller with no shipment at all.** Today's `EmptyState` ("Send your first shipment") replaces the whole page, unchanged.
- **Previous window older than the seller's history.** Its n < 5, so no delta line and no "compared with" clause in the range line.
- **Immature window** (under 80 % of created shipments terminal or past due). The rate tiles read "Comparison once more shipments close". The delta insight rule does not fire.
- **Open shipment whose modality has no SLA (`dueAt` null).** It is drawn as a dashed ring with the label "No SLA" and counted in no outlook bucket. The legend adds "No SLA N" only when N > 0.
- **Due soon is a moving boundary.** The web re-evaluates `slaState` every 60 s (`useNow`). The `view=due-soon` list uses the request time. A count can differ from the list by a shipment for up to a minute. This is accepted and stated in the e2e test as "same instant, same count".
- **Socket disconnected.** Queries fall back to `fallbackPollInterval`. The flow shows no motion, and the LiveIndicator reads "Reconnecting…" as today.
- **Window switch.** Previous values stay dimmed (`keepPreviousData`) until the new ones arrive. Then every value plays `value-in` once and the range line updates.
- **A shipment in RJ/MG/PR re-opened by a visitor's own creation.** It cannot be: visitor-created shipments go through normal matching. RJ/MG/PR open shipments can exist only if a visitor creates them, and then they have no live route and show "No live position" on detail, as today for any address without a route.
- **Webhook endpoint not configured, or fewer than 5 deliveries in 24 h.** No strip and no Webhook group. Integrations shows "Too few deliveries in 24 h to judge".
- **Chaos "webhook endpoints down".** It drives the Down state for real. The Webhook group shows first, as in States C.
- **Demo reset while the page is open.** The `demo:reset` toast stays as is. Every `shipmentKeys` query refetches, and the flow enters fresh (no slide animation across a reset; FLIP runs only for ids present before and after).

## Functional Requirements *(mandatory)*

### Demo dataset

- **FR-001**: `demo-dataset.ts` MUST build Loja Demo's shipments from an explicit plan of 180 rows created over the last 90 days:
  - weekly created counts 11, 12, 12, 13, 12, 13, 13, 14, 14, 14, 16, 15, 16 for the 175 non-cancelled, plus 5 cancelled spread across the weeks;
  - status: 150 delivered (13 late), 3 failed, 6 returned, 5 cancelled, 16 open, with the open ones split Pending 3 · Accepted 3 · Collected 2 · In transit 5 · Out for delivery 3, of which 2 are late (7 h and 2 h past due) and 3 due soon;
  - modality: Standard 80 / Full 40 / Express 30 delivered, with 74 / 36 / 27 on time;
  - destination UF: SP 96 / RJ 27 / MG 18 / PR 9 delivered, with 90 / 24 / 16 / 7 on time.
  - Casa & Cia Demo gets about 30 shipments on the same builder (a small mix of every status, no 90-day history).
  - `SeededRandom(42)` stays, so the seed and the reset produce the same rows.
- **FR-002**: Carriers MUST be assigned by coverage and modality:
  - RJ, MG and PR shipments go to EconoLog (Standard and Full only);
  - SP Express goes to Rápido Paulista on its four cities;
  - the rest goes to Transportadora Demo.
  - `DemoTenant` gains the extra carriers' ids and their managers' user ids (as owners). `seed.ts` MUST add EconoLog coverage for RJ, MG and PR (whole state), idempotently.
- **FR-003**: `DEMO_ADDRESSES` keeps its 8 SP entries for open shipments (live-map routes, spec 03). A new `DEMO_FAR_ADDRESSES` list MUST hold 2 addresses each in RJ (Rio de Janeiro, Niterói), MG (Belo Horizonte, Juiz de Fora) and PR (Curitiba, Londrina), used only by terminal plans. `toAddressFields` takes the UF from the address, not from `DEMO_STATE`.
- **FR-004**: Stage gaps MUST keep `STAGE_WEIGHTS`, so the seeded medians land near Claim wait 1.5 h, Pickup wait 9 h, Hand-off 3 h, In transit 22 h, Last mile 5 h. Failed events MUST carry a note drawn from "Recipient not at home", "Address not found" and "Business closed".
- **FR-005**: The reset MUST stay one batched transaction (four statements, as today) for about 210 shipments and their events. `demo-dataset.spec.ts` MUST assert the FR-001 counts exactly, and the stage medians within ±15 %.

### Seller metrics API

- **FR-006**: `deliveryMetrics` MUST also return:
  - `medianDelivery.p90Hours`;
  - `cancelled` (count of CANCELLED rows);
  - `slaMedianHours` (the budget base it already computes).

  `onTimeByState(rows)` MUST group by `addressState`, as `onTimeByModality` does; `MetricRow` gains `addressState`.
- **FR-007**: `GET /shipments/metrics` (seller) MUST return, in addition to `delivered`, `onTime` and `byModality`:
  - `shipments` and `cancelled`;
  - `medianDelivery { hours, p90Hours, n }`;
  - `firstAttempt { rate, n, failed, returned }`;
  - `stages[] { status, p50Hours, p90Hours, budgetHours, n }` and `slaMedianHours`;
  - `byState[] { uf, n, count, rate }`;
  - `volume { bucket: 'day' | 'week', points: [{ start, delivered, problem, open }] }`: day for 7 d and 30 d, week for 90 d, cancelled excluded;
  - `comparison { since, previousSince, mature, onTime: Rate, firstAttempt: Rate }`.

  `loadMetricRows` MUST then run with `events: true`.
- **FR-008**: `comparison` MUST come from a second `loadMetricRows` over `[since − span, since)` with the same rules. `mature` MUST be true when at least 80 % of the current window's shipments are terminal or past `dueAt`. The API returns the raw values; the web applies the n ≥ 5 and maturity guards (FR-024), so the threshold lives in one place, as `MIN_SAMPLE` does today. There MUST be no comparison on Delivered or Delivery time.

### Attention, activity and webhook health API

- **FR-009**: `GET /shipments/attention` MUST add `groups: AttentionGroup[]`, ordered by severity, keeping its current fields for compatibility. The shapes are:

  ```ts
  type AttentionGroup = {
    type: string;            // today: 'late' | 'failed' | 'waiting'
    label: string;           // "Late", "Failed attempt", "Waiting for a carrier"
    owner: 'carrier' | 'seller' | 'recipient' | 'unknown';
    count: number;           // exact, from count()
    href: string;            // the list query whose count equals `count`
    items: AttentionItem[];  // at most 5, most urgent first
  };
  type AttentionItem = {
    shipment: ShipmentResponseDto;
    since: string;           // dueAt (late), the FAILED event time (failed), createdAt (waiting)
    reason: { code: string | null; text: string } | null; // failed: last FAILED event note; code is null until phase 4
  };
  ```

  - `type` is an open string, so phase 4's `at_risk` and `stalled`, and reason `code`s, are added without a reshape.
  - Group order is late > failed > waiting.
  - `waiting` is PENDING, no owner, `createdAt` older than 2 h (`WAITING_AFTER_HOURS = 2`), the same for every modality. Per-modality limits come in phase 4.
  - `counts` gains `waiting`.
  - The response gains `oldestPendingAt` (min `createdAt` over PENDING, or null).
- **FR-010**: The `exceptions` seller view MUST become failed, late or waiting, so "Exceptions N" equals the list it opens.
- **FR-011**: `GET /shipments/activity` MUST accept `since` (ISO, at most 24 h back) and a `limit` up to 200 (today 20). Each item MUST add `dueAt`, so the feed can write "Delivered · Late by 3 h". The web reads one query: `since = now − 4 h`, `limit = 200`. It draws the strip from all items and lists the newest 20. Without `since`, the behaviour is unchanged.
- **FR-012**: A new `GET /webhooks/health` (seller) MUST compute over the seller's endpoint and the last 24 h:

  ```ts
  { state: 'ok' | 'degraded' | 'down' | 'too_few' | 'not_configured',
    n: number, successRate: number | null, p95Ms: number | null,
    lastSuccessAt: string | null, failingSince: string | null }
  ```

  - `successRate` = SUCCEEDED ÷ (SUCCEEDED + FAILED).
  - Down = the last 5 finished deliveries failed. `failingSince` is the first of that failing run.
  - Degraded = rate < 95 %.
  - `too_few` = n < 5.
  - It lives in `webhooks.controller.ts` and `webhooks.service.ts`.

### List filters for drill-through

- **FR-013**: `GET /shipments` (seller) and the web list URL MUST accept these new filters, each ANDed in `listWhere`, each validated, and each shown as a removable chip in `ShipmentListToolbar`.

  | Param | Values | Rule | Opened from |
  |---|---|---|---|
  | `uf` | a Brazilian UF (`UF_CODES`) | `addressState = uf` | On time by · Destination rows; Paraná insight |
  | `modality` | a modality code | `modality.code = modality` | On time by · Modality rows |
  | `sla` | `on-time` \| `late` | DELIVERED with `dueAt`, and `deliveredAt ≤ dueAt` \| `>` (Prisma field reference) | On time tile, "held back by on time", delta insight |
  | `view=on-track` | new seller view | open, `dueAt` set and before its due-soon boundary (the complement of `due-soon` and `late` among open shipments with a `dueAt`), through the same raw id query | Flow legend "On track" |
| `view=due-soon` | new seller view | open, `dueAt ≥ now`, `dueAt − now ≤ max(0.25 × (dueAt − createdAt), 6 h)`. It is the web `slaState` rule, through a raw id query (shortcut: one raw `SELECT id` per request; upgrade to a stored `dueSoonAt` column if the open set grows past a few thousand) | Flow legend "Due soon"; Due-soon marks |
  | `view=waiting` | new seller view | PENDING, no owner, `createdAt < now − 2 h` | Exceptions "Waiting for a carrier" |

- **FR-014**: Existing filters cover the other links: `view=late`, `view=active`, `view=exceptions`, `status=…`, `window=…`. Every flow legend count is a link: On track to `view=on-track`, Due soon to `view=due-soon`, Late to `view=late`. Volume columns, slow-tail rows and Promise segments are not links (see Out of Scope).

### Layout and shell

- **FR-015**: The Overview MUST lay out by **container width** (`@container` on its root, Tailwind v4 `@min-[…]` variants), not viewport width. Under spec 09 the content area is:
  - 1440 − 240 px at 1440;
  - 1024–1279 minus a 64 px rail;
  - the full width below 1024.

  | Container | Tiles | Insight line | Columns |
  |---|---|---|---|
  | ≥ 1100 px | 6 | 4 | 7/12 + 5/12 |
  | 880–1099 | 3 × 2 | 2 × 2 | 7/12 + 5/12 |
  | 600–879 | 3 × 2 | 2 × 2 | one column |
  | < 600 | 2 × 3 | 1 | one column |

  The page order follows the board:
  1. header and range line;
  2. F9 strip;
  3. insight line;
  4. tiles;
  5. Shipment flow;
  6. left column: Exceptions → Volume → On time by; right column: Recent updates;
  7. Promise against reality, full width.

  In one column, Recent updates comes after On time by. No horizontal scroll at 390 (scrollWidth = 390).
- **FR-016**: `globals.css` MUST add `--sla-soon` (light `#c06a2e`, dark `#edb98e`) and `--sla-late` (light `#9b2c24`, dark `#d2645a`), plus their colour utilities.
  - On track is a 1.5 px `--muted-foreground` ring, never green.
  - Caution and critical always carry the risk glyph (half disc, filled disc) and a text label.
  - `RiskBadge` keeps its tokens; the new marks use these aliases.
- **FR-017**: `WindowSelector` MUST take an optional `range` line under the segments: "13 Aug – 11 Nov · compared with 15 May – 12 Aug". The "compared with" clause shows only when at least one delta shows. Dates come from `comparison.since` and `comparison.previousSince`. Switching the window cross-fades values with `value-in`, or instantly under reduced motion.

### Tiles

- **FR-018**: `StatTile` MUST gain two optional props:
  - `figure` (a ReactNode under the value, `aria-hidden`, whose meaning the tile's `aria-label` carries);
  - `delta` (`{ points: number; previous: number }`, rendered "▲ 3.2 pts" or "▼ …" in muted ink with an arrow, never green or red).
- **FR-019**: The six tiles and their figures, all drawn from that tile's own data. Each tile has a 1440 note and a 390 note.

  | Tile | Figure | Note at 1440 | Note at 390 | Link |
  |---|---|---|---|---|
  | Active · now | 5-segment stage mix | "3 unclaimed · oldest 2 h" (omitted at 0 pending) | "Oldest unclaimed 2 h" | `view=active` |
  | Late · now | late ages on a 0–12 h track, one tick each | "past due · 0 to 12 h" | same | `view=late` |
  | On time · window | current dot, previous hollow dot, 90 % tick | "n=150 · ○ prev 88.1% · \| 90%" | "n=150 · ▲ 3.2 pts" | `status=DELIVERED&window=…&sla=late` |
  | Delivered · window | weekly created columns (`volume`) | "of 180 created · per week" | "of 180 created" | `status=DELIVERED&window=…` |
  | Delivery time · window | p50 → p90 bar against the SLA median | "p90 68 h · SLA 72 h · n=150" | "p90 68 h · n=150" | none |
  | First attempt · window | first-try / failed / returned bar | "3 failed · 6 returned · n=159" | "n=159 · ▲ 2.3 pts" | `view=exceptions` |

  - Low-n copy is from `final.md`: "Not enough deliveries yet (n = 3)", "Not enough finished deliveries (n = 3)", and "—" for On time with "Not enough history (n = 3)". At n < 5 the figure is not drawn.
  - `MedianDeliveryTile` and `FirstAttemptTile` move from `features/carriers` to `components/common`, so the seller page does not import a carrier feature.

### Shipment flow

- **FR-020**: `ShipmentFlow` MUST replace `PipelineBar` and the outlook bar on the seller Overview. `PipelineBar` stays for the other pages. It reads:
  - `GET /shipments?view=active&limit=100`, sorted by `dueAt`, under `shipmentKeys.list`, so it gets the live refresh;
  - the stage counts from `status-counts`.

  Rendering:
  - Stages are proportional segments on today's `status-*-bg`.
  - Marks are 10 px with a 2 px card ring, shaped by `slaState` (ring, half disc `--sla-soon`, filled `--sla-late`).
  - Each mark is a link to the shipment, with a tooltip "TMS-… Ribeirão Preto/SP · Standard · Late 7 h · due 07:31".
  - The legend reads "On track N (link) · Due soon N (link) · Late N (link)".
  - The desktop hint reads "Hover a dot for its code and due time · a dot slides right when a carrier scans it".
  - The empty state is "No open shipments." with no bar and no zero segments.
- **FR-021**: Motion is a FLIP keyed by shipment id. When a mark changes stage between two renders it slides 400 ms `cubic-bezier(.16,1,.3,1)` and pulses once. The animation is on a wrapper `div`, not on SVG. Under reduced motion the mark moves without a tween. Moves are never announced.

### Exceptions

- **FR-022**: `ExceptionsPanel` MUST render `attention.groups` through a web catalog, `exception-types.ts`: `type → { ownerLabel, action, glyph }`, with a neutral fallback for unknown types (US 2 scenario 4). The panel:
  - shows the title "Exceptions N" (the sum of group counts plus the webhook row) and "Each row says who acts next";
  - gives each group a header (label and count) and rows with the risk badge, code, city/UF, owner chip and a detail line;
  - on late rows, adds "<used> h of a <sla> h SLA" and an overrun track on a shared scale. The SLA is `dueAt − createdAt`, so no new field is needed. The track grows on the 60 s `useNow` tick.
  - on failed rows, shows the `reason.text` from the API;
  - ends with the footer "Checked HH:MM · All exceptions" (`dataUpdatedAt`, link `view=exceptions`).

  Owner chips:

  | Type | Owner chip |
  |---|---|
  | late | "Carrier must act" |
  | failed | "Carrier must act" |
  | waiting | "Waiting for carrier" |
  | webhook | "You" |

- **FR-023**: When webhook health is `down`, the panel MUST prepend a "Webhook" group built on the web in the same `AttentionGroup` shape. Its single row reads "Webhook endpoint failing since 14:02 · Last N deliveries failed · your store is not receiving status updates" and links to Integrations. When the state is `degraded` or `down`, the strip of States C MUST show under the header, using the 390 short stats. `useWebhookHealth` lives under `integrationKeys`, is invalidated (throttled) on the existing `webhook:delivery` socket event, and polls every 60 s as a fallback.

### Insight line and Delivery health

- **FR-024**: A pure module, `overview-rules.ts`, MUST evaluate 6 rules in priority order and return the fired sentences, each with its link and its rule text:

  | Rule | Sentence | Link |
  |---|---|---|
  | late now > 0 | "2 late, oldest 7 h · To Ribeirão Preto/SP, in transit. Carrier must act." | `view=late` |
  | webhooks down | "Webhooks down since 14:02" | Integrations |
  | waiting > 0 | "N waiting for a carrier over 2 h" | `view=waiting` |
  | stage p90 > budget, n ≥ 5 | "Slow tail over budget · p90 in transit 38 h vs 29 h; pickup wait 18 h vs 14 h." | `#promise` |
  | UF below 90 % target, n ≥ 5 | "Paraná trails · 7 of 9 on time. Few deliveries: a lead, not a verdict." (the last sentence only when the Wilson upper bound is ≥ 90 %) | `status=DELIVERED&window=…&uf=PR` |
  | rate delta, \|Δ\| ≥ 2 pts, both n ≥ 5, mature | "On time up 3.2 pts · 91.3% vs 88.1% in the previous 90 days." | `…&sla=late` |

  - The same module exports `MIN_SAMPLE = 5` and `deltaOf(current, previous, mature)`, which the tiles use too.
  - A rule whose input has n < 5 does not run.
- **FR-025**: `InsightLine` ("Worth your attention") MUST show Delivery health in its first cell, then up to 3 sentences at ≥ 1100 px, or 2 sentences plus "N more" (a disclosure button) below 600 px. Each sentence shows "rule: …" on hover or focus. States:
  - **quiet**: "Nothing needs you right now · Checked HH:MM against 6 rules";
  - **thin data** (window n < 5): "Not enough history to call trends yet · Only "late" and "webhooks" rules run (n = 3)".

  A new sentence fades in once (200 ms).
- **FR-026**: `deliveryHealth()` (pure) MUST band 4 inputs over the window:
  - on time and first attempt: Excellent ≥ 95, Good ≥ 90, Fair ≥ 85, Poor ≥ 80, else Critical;
  - return % (returned ÷ first-attempt n) and cancelled % (cancelled ÷ shipments): ≤ 2 / 4 / 6 / 8 %.

  The level is the worst input's band. "Held back by" names the first input in that band in the order on time, first attempt, returns, cancelled. Below 10 delivered it shows "Building your score · N of 10 deliveries".

  The thermometer has 5 segments with only the active one filled (`--sla-late`, `--sla-soon`, `status-pending-dot`, `status-delivered-dot`, `status-delivered-fg`), and a caret that steps once (300 ms; reduced motion jumps). Its text reads "Good · held back by on time 91.3% (n=150)". The band rule shows on hover or focus. The bands and the tie-break order are accepted as written (`suggestions.md` S1), labelled "benchmark, not your goal" in the explain text, and revisited once real data exists.

### On time by and Volume

- **FR-027**: `OnTimeBy` MUST show a `SegmentedControl` (Modality | Destination). The default is Destination at ≥ 880 px and Modality below, as on the board. Each row shows:
  - the label;
  - a rate dot;
  - a 95 % Wilson range bar computed on the web from `count` and `n` by a pure `wilson(k, n)` with a unit test (PR 7/9 → 45–94 %);
  - the dashed 90 % target;
  - "78% · 7/9".

  Rows are sorted worst rate first, with n < 5 last ("too few · n=3", empty track). Switching tabs keeps each tab's order stable. Each row links per FR-013. The caption reads "Dot = on-time rate. Bar = where the true rate likely sits (95% range): wide when n is small." The empty state is "No delivery with an SLA in this window yet." `OnTimeRows` stays for the carrier and admin pages.
- **FR-028**: `VolumePanel` MUST draw `metrics.volume` with a new `StackedColumns` primitive:
  - segments Delivered → Open → Problem (the validated order), with a 2 px gap and 4 px data ends;
  - a legend with totals ("Problem 9 (3 failed · 6 returned)") and a per-column tooltip;
  - a Chart | Table toggle copied from `StageChart`;
  - the caption "By creation date, coloured by status now. … 5 cancelled not shown.";
  - an aria-label listing the weekly totals.

  The empty state is FR-019's Volume sentence.

### Recent updates

- **FR-029**: `RecentUpdates` MUST show:
  - **the header**: "Live" (`LiveIndicator`) and a "Pause updates" toggle. While paused, the feed stops re-rendering and reads "Paused · N new"; "Back to live" resumes.
  - **the 4 h strip**: one 2 px tick per event over the last 4 hours, failures in `--sla-late`, with the summary "Last 4 hours · 15 events" and an aria-label.
  - **time groups**: "Last hour N" and "Earlier today N".
  - **rows**: "Collected → In transit". The from-status is derived on the web from `ALLOWED_TRANSITIONS`; every happy-path status has one predecessor. Terminal rows read "Delivered · On time" or "Delivered · Late by 3 h" (from `dueAt`, FR-011), "Failed delivery" and "Returned".
  - **at 390**: the first 4 rows of the last hour, then "See all updates".

  New rows enter with `live-halo` once. The feed is not a live region.

### Promise against reality

- **FR-030**: `PromiseVsReality` (anchor `#promise`) MUST draw two rows on one 0–SLA-median axis:
  - **Promise**: each stage's budget (`budgetHours`) laid end to end to the 72 h line;
  - **Reality**: each stage's p50 laid end to end, with the median delivery marked ("41 h of a 72 h SLA").

  Stages alternate `primary` at 100 % and 72 % with no status colour. Under it, the slow-tail table (Stage · p90 · Budget · n · State) reads "within" or "+4 h", the latter in `--sla-late` text with the critical glyph. It is followed by a one-sentence summary built from the data, e.g. "The typical shipment arrives with a day to spare; lateness lives in the tail of pickup and transit.", or "Every stage's slow tail sits within budget." It has a Chart | Table toggle. A row with n < 5 reads "Not enough data (n = 2)" and draws only its budget. The seller page drops `StageChart` ("Where the time goes"); the carrier page keeps it.

### Live, accessibility and motion

- **FR-031**: Every new seller query MUST live under `shipmentKeys` (metrics, attention, activity, flow list), except webhook health (FR-023), so `shipment:updated` refreshes it through the existing throttled invalidation. There are no client-side socket patches.
- **FR-032**: One page-level `OverviewAnnouncer` (`aria-live="polite"`) MUST replace the Exceptions panel's own live span. It batches these changes at most every 10 s into one sentence ("Exceptions 5 → 6. Delivery health now Fair, held back by first attempt 88 %."):
  - the exception total;
  - the Delivery health band.

  Webhooks Down use the strip's `role="alert"`. Nothing else is announced.
- **FR-033**: Every chart MUST have an `role="img"` aria-label summary, a table view or text equivalent, and focusable marks or rows with a visible 2 px `:focus-visible` ring. Every target MUST be at least 44 px tall on touch, including segmented controls and inline links (the board's 38 px segments get a 44 px hit area). No meaning is carried by colour alone. Headings go h1 (Overview) → h2 (panel titles), with no skips.
- **FR-034**: Motion uses transform and opacity only, 150–400 ms with `cubic-bezier(.16,1,.3,1)`, once per real change and never on a loop. Everything sits behind `prefers-reduced-motion: no-preference`; the base style is the final state.
- **FR-035**: Component boundaries follow the react-best-practices rules:
  - each section is its own file and its own component, never defined inside another;
  - each reads its own query, so a metrics refetch does not re-render the feed;
  - `useNow` lives in the leaves that need it (flow, exceptions, Late tile, feed), not at page level;
  - derived values (buckets, Wilson, rules, health) are computed in render by pure functions, with no effects;
  - the pause buffer of Recent updates is a ref.

### Docs

- **FR-036**: On completion, `SCREENS.md` (Seller Overview) MUST describe the new sections, states and drill-through filters, and `DESIGN.md` §16 MUST record:
  - the comparison and maturity rule;
  - the attention-group contract and its phase 4 extension point;
  - the webhook health rule.

### Key Entities

- **`Shipment`** and **`TrackingEvent`**: read only. The failure reason is today's `TrackingEvent.note`, exposed as `reason.text` with `code: null` until phase 4 adds reason codes.
- **`WebhookDelivery`**: read for health (the existing `[endpointId, createdAt]` index).
- **`CarrierCoverage`**: 3 seeded rows for EconoLog (RJ, MG, PR).
- No new model, column or migration.

## Success Criteria *(mandatory)*

- **SC-001**: On the reset demo, every number on the Overview equals the count of the list it links to, at the same instant (an e2e test per link of FR-013 and FR-014).
- **SC-002**: At 1440 with the spec 09 sidebar, the header, insight line, tiles and Shipment flow sit above the fold. At 390, the header, strip, insight line and the first tile row sit above the fold. scrollWidth is 390.
- **SC-003**: The 90 d metrics of the reset demo match `final.md`: On time 91.3 %, Delivery time 41 h (p90 68 h), First attempt 94.3 %, PR 7/9, and stage p50 within ±15 %.
- **SC-004**: A carrier scan moves its dot within 2 s of the event, with a connected socket.
- **SC-005**: With a screen reader, a 3-minute failure storm produces no more than one announcement per 10 s, and none for feed rows or dot moves.
- **SC-006**: axe reports no violation at 1440 or 390, in light or dark. Every SLA mark passes the round 2 validator pair (ΔE ≥ 15 light, ≥ 18 dark).
- **SC-007**: The reset still finishes in under 5 s on the e2e database.
- **SC-008**: No pull request of the delivery plan exceeds about 500 changed lines including tests.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/modules/simulator/`: `demo-dataset.ts` (plan, far addresses, carrier assignment, notes), `demo-tenant.service.ts` (extra carrier and manager ids), `demo-dataset.spec.ts`; `prisma/seed.ts` (EconoLog coverage).
  - `src/modules/shipments/metrics/`:
    - `delivery-metrics.ts` (`p90Hours`, `cancelled`, `slaMedianHours`, `onTimeByState`, `volumeSeries`);
    - `metric-rows.ts` (`addressState` in the select);
    - `metrics-response.dto.ts` (FR-007 DTOs).
  - `src/modules/shipments/`:
    - `shipments.service.ts`: `metricsForSeller` with comparison, `attentionForSeller` groups, activity `since`;
    - `shipment-views.ts`: `due-soon`, `waiting`, `exceptions` widened; `uf`, `modality`, `sla` in `ListFilters`;
    - `dto/list-seller-shipments-query.dto.ts`, `dto/activity-query.dto.ts`, `dto/shipment-attention-response.dto.ts`, `dto/shipment-activity-response.dto.ts`;
    - `attention-groups.ts`: the pure group builder.
  - `src/modules/integrations/`: `webhooks.controller.ts` and `webhooks.service.ts` (`GET /webhooks/health`), `dto/webhook-health-response.dto.ts`.
  - `test/seller-metrics.e2e-spec.ts`, `test/seller-list-filters.e2e-spec.ts` (count equality), `test/webhook-health.e2e-spec.ts`.
- **Web (`apps/web`)**:
  - `components/common/`:
    - `stat-tile.tsx` (`figure`, `delta`);
    - `window-selector.tsx` (`range`);
    - `delivery-tiles.tsx`, moved from `features/carriers`;
    - `charts/stacked-columns.tsx`, `charts/micro-figures.tsx`, `charts/range-dot-rows.tsx`.
  - `features/shipments/components/overview/` (new):
    - `seller-dashboard.tsx` (composition only), `overview-tiles.tsx`, `shipment-flow.tsx`;
    - `exceptions-panel.tsx`, `exception-types.ts`;
    - `insight-line.tsx`, `delivery-health.tsx`, `on-time-by.tsx`, `volume-panel.tsx`, `recent-updates.tsx`, `activity-strip.tsx`, `promise-vs-reality.tsx`, `webhook-strip.tsx`, `overview-announcer.tsx`.
  - `features/shipments/lib/`: `overview-rules.ts`, `delivery-health.ts`, `wilson.ts`, `transitions.ts` (each with a unit test).
  - `features/shipments/hooks/use-seller-dashboard.ts` (flow list, activity window).
  - `features/integrations/hooks/use-webhook-health.ts`.
  - `features/shipments/components/shipment-list-toolbar.tsx` (new filter chips).
  - `app/globals.css` (`--sla-soon`, `--sla-late`).
- **Prisma models touched**: none in the schema. The seed writes `CarrierCoverage`.
- **Real-time**: no new event. `shipment:updated` refreshes every `shipmentKeys` query; `webhook:delivery` (already sent to the seller room) now also invalidates webhook health.
- **New dependencies**: none.
- **Configuration**: none.

## Delivery Plan

Each row is one pull request, stacked on the row before it, at most about 500 changed lines including tests.

| # | Branch | Scope | FRs | App | ~Lines | Depends on |
|---|---|---|---|---|---|---|
| 1 | `feat/demo-seed-90d` | 180-shipment plan over 90 days, 3 carriers, SP/RJ/MG/PR far addresses, failure notes, EconoLog coverage, reset unchanged; dataset spec with exact counts | FR-001–FR-005 | api | ~460 | — |
| 2 | `feat/seller-metrics-v2` | `p90Hours`, `cancelled`, `slaMedianHours`, `byState`, `volume`, stages with events, `comparison` + `mature`; DTOs, unit tests and e2e | FR-006–FR-008 | api | ~480 | 1 |
| 3 | `feat/seller-list-filters` | `uf`, `modality`, `sla`, `view=on-track`, `view=due-soon`, `view=waiting`, widened `exceptions`; DTO validation; web URL values and toolbar chips; count-equality e2e | FR-010, FR-013, FR-014 | api, web | ~470 | 2 |
| 4 | `feat/attention-groups` | `groups`, `reason`, `waiting`, `oldestPendingAt`; activity `since`, `limit` 200 and `dueAt`; e2e | FR-009, FR-011 | api | ~400 | 3 |
| 5 | `feat/webhook-health` | `GET /webhooks/health` (states, rate, p95, failing run); e2e; `useWebhookHealth` and socket invalidation | FR-012 | api, web | ~330 | 4 |
| 6 | `feat/overview-shell` | SLA tokens; split the page into `overview/`; container layout and order; `WindowSelector` range; `StatTile` `figure`/`delta`; tiles moved to common; six tiles with figures and low-n states | FR-015–FR-019, FR-035 | web | ~490 | 5 |
| 7 | `feat/shipment-flow` | `ShipmentFlow` (marks, legend, tooltip, empty, +N, narrow rows, FLIP) | FR-020, FR-021 | web | ~420 | 6 |
| 8 | `feat/overview-exceptions` | catalog, groups, owner chips, overrun track, webhook group and strip, announcer | FR-022, FR-023, FR-032 | web | ~460 | 7 |
| 9 | `feat/overview-insights` | `overview-rules`, `deliveryHealth`, thermometer, `InsightLine` and its states | FR-024–FR-026 | web | ~480 | 8 |
| 10 | `feat/on-time-by-v2` | `wilson`, `RangeDotRows`, tabs, links, states | FR-027 | web | ~320 | 9 |
| 11 | `feat/overview-volume` | `StackedColumns`, `VolumePanel`, table toggle, states | FR-028 | web | ~380 | 10 |
| 12 | `feat/recent-updates-v2` | 4 h strip, time groups, transitions, pause/resume, 390 cap | FR-029 | web | ~400 | 11 |
| 13 | `feat/promise-vs-reality` | cumulative ribbon, slow-tail table, summary sentence; seller page drops `StageChart` | FR-030 | web | ~420 | 12 |
| 14 | `docs/spec-10-wrapup` | a11y and motion pass on the whole page (FR-031, FR-033, FR-034 checks, axe at 1440 and 390, light and dark); `SCREENS.md`, `DESIGN.md`, Status and Changelog | FR-031, FR-033, FR-034, FR-036 | web, docs | ~200 | 13 |

The plan is one linear stack, as asked. Rows 7–13 only add sections to the shell from row 6, so after row 6 they could be re-based to depend on 6 alone and reviewed in parallel.

## Out of Scope

These items are cut from the board or not built. Mock series are either made real or cut:
- **"Drag to replay the day".** The replay handle, ← → in 5-minute steps, and the feed and flow rewinding together are cut. Rewinding the flow needs the open set reconstructed per minute from events, a second state model the page has nowhere else. The 4 h strip stays, as a static, real event density (FR-029). Replay may come as its own later spec.
- **"1st attempt" on failed rows.** Cut: `FAILED_DELIVERY → RETURNED` is the only transition, so there is never a 2nd attempt.
- **"fix the address first" advice.** Cut until phase 4 reason codes. Today only the note text is shown.
- **Drill-through on volume columns, slow-tail rows and Promise segments.** Cut (no `createdFrom`/`createdTo`, `stageOver=` or `deliveredWeek=` filters). These have tooltips and tables only.
- **The breadcrumb chip "From Overview · …" on the list.** Not on the board.
- **Components-sheet-only pieces.** S2 three-layer tile and 12-week sparkline, S3 action dots, S4 weekly tracker, S6 promise-accuracy ribbon (its early/on-time split was mock), the route fan, the SLA dial, the Morning brief, the needle, ⌘K verbs, the streak, and "since you were last here". They are not on the chosen board.
- **Mock series on the board, and what they become.**
  - Made real: weekly volume and the Delivered figure (`volume`), flow positions (`view=active` list), feed codes and the 4 h strip (`activity?since=`), webhook stats (`/webhooks/health`), and "Checked HH:MM" (`dataUpdatedAt`).
  - Computed on the web: Wilson ranges and insight sentences.
  - None is kept as mock.
- **The mobile bottom bar (Overview · Shipments · Create · More).** It belongs to spec 09.
- **Carrier comparison, price, cost, complaints and ratings.** No action or no data (`final.md`).
- **Exception types beyond failed, late, waiting and webhook down.** At risk, Stalled and reason codes come in phase 4 through FR-009's open `type` and `reason.code`.

## Assumptions and Dependencies

- Built on spec 09 (sidebar shell). The container widths of FR-015 assume its 240 px and 64 px columns and its page padding.
- Built on `docs/spec-08-wrapup`: demo carriers and managers, `demo:reset`, Chaos Mode (which drives the webhook Down state for review), the metrics core and `useStatsWindow`.
- Prisma's field references (`prisma.shipment.fields.dueAt`) are available in the installed Prisma version for `sla=` (FR-013).
- The simulator keeps creating and moving shipments after a reset, so `final.md`'s values hold at reset time, and the e2e tests read them with the simulator paused.

## Notes for the AI Agent

- Before coding: if a change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate it with the user first.
- Implement one Delivery Plan row at a time, on its own branch, stacked on the row before. Stop and re-split a PR that grows past about 500 changed lines.
- Unit tests:
  - `wilson(7, 9)` gives 45–94 %;
  - `deltaOf` hides on n < 5 and when immature;
  - `deliveryHealth` returns Good, held back by on time, on the mock numbers;
  - each insight rule fires and stays quiet;
  - `transitions` finds the predecessor;
  - the attention-group order;
  - `due-soon` matches `slaState` at the 6 h and 25 % boundaries.
- e2e: count equality for every drill link (SC-001), webhook health states, and `403` for non-sellers on the new routes.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Resolved

Answered by the user on 2026-11-13:
1. **Delivery health bands** and the tie-break order: accepted as written (FR-026). The level is the worst input's band, and "held back by" names it. Revisit after real data.
2. **Replay**: the 4 h strip is static. Replay is a later spec (Out of Scope).
3. **On track**: a link to the active, on-time shipments, through the new `view=on-track` (FR-013, FR-014, row 3 and its count-equality e2e).
4. **Casa & Cia Demo**: about 30 shipments, no 90-day history (FR-001). Loja Demo keeps the ~180-shipment, 90-day set.
5. **Waiting threshold**: 2 h for every modality (FR-009). Per-modality limits move to phase 4.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-11 | Draft from the chosen board "Overview · reimagined components · 1440 light", its 390 variant, the components sheet and States, mapped to `final.md`, `fe.md`, `suggestions.md`, `ux-ideas.md`, `visual-ideas.md` and `design-notes.md`; API shapes checked against `origin/docs/spec-08-wrapup` |
| 2026-11-13 | Open questions resolved: bands accepted, replay left to a later spec, `view=on-track` added to row 3, Casa & Cia Demo at about 30 shipments, waiting fixed at 2 h |
