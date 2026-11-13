# Mini TMS — Screen Specification

Screen-by-screen brief to feed a design tool (Claude/Figma/etc.) with real context, not generic. Based on [`DESIGN.md`](./DESIGN.md) §2–5 (roles, journey, screens) and §10 (data model) — the fields cited here are the real `schema.prisma` names, not placeholders.

Every screen follows the same format: **Role** (who accesses it) · **Goal** · **Data** (real fields displayed) · **Actions** · **States** (empty/loading/error where relevant) · **Navigation**.

---

## Public (no login)

### Login

- **Role:** everyone (admin, seller, carrier_manager, carrier_operator)
- **Goal:** authenticate and redirect to the right dashboard based on `User.role`.
- **Data:** form — email, password.
- **Actions:** sign in; "forgot my password" (out of MVP scope, but leaving the link mute is more honest than omitting it).
- **States:** invalid credential error; an account with `Seller.status`/`Carrier.status` = `PENDING` redirects to "Awaiting Approval" instead of a generic access-denied.
- **Demo picker** (`NEXT_PUBLIC_DEMO_LOGIN=true`): beside the form on desktop and above it on a phone, "Explore the demo · one click, no signup" shows four cards (Seller, Carrier manager, Operator, Admin), each a button named by its role and described by its persona and what it does. A card signs in with its account and honours `next`; while any sign-in is pending, and until the next page loads after a success, every card and the form's submit are off, and a failure shows in the form's error. The left column's footnote adds "reset daily at 04:00 (São Paulo)" ([spec 08](./specs/08-demo-showcase.md)).
- **Navigation →** the corresponding role's dashboard, or a waiting screen.

### Seller Signup (self-signup)

- **Role:** public (becomes a Seller)
- **Goal:** create a `User` (role `SELLER`) + linked `Seller`, initial status `PENDING`.
- **Data:** email, password, `Seller.companyName`, `Seller.document` (tax ID).
- **Actions:** create account → goes straight into Onboarding.
- **States:** document already registered (`document` is `@unique`) → clear error, not generic.
- **Public demo notice:** on the demo deployment, both signup pages say above the form that anything entered can be read by visitors signed in as the demo admin.
- **Navigation →** Multi-step Onboarding.

### Invite Acceptance

- **Role:** public (becomes a `CarrierUser`, role `CARRIER_OPERATOR`)
- **Goal:** validate `Invite.token`, create a `User` + `CarrierUser` linked to `Invite.carrierId`.
- **Data:** carrier name (via `Invite.carrier.companyName`), pre-filled email (`Invite.email`), password form.
- **Actions:** create account and accept.
- **States:** expired token (`Invite.status = EXPIRED` or `expiresAt` in the past) → specific error screen, not a generic 404; already-accepted token (`ACCEPTED`) → same.
- **Navigation →** Carrier Dashboard/Queue.

### Public Tracking

- **Role:** public, no login
- **Goal:** track a shipment via `Shipment.trackingCode`, without exposing sensitive seller data.
- **Data:** current `status` (friendly label for `ShipmentStatus`), `addressCity`/`addressState` (not the full address), the sender line "From `Seller.companyName` · carried by `Carrier.companyName`", `TrackingEvent` timeline (status + `createdAt`, without the internal `note`).
- **Actions:** search by code.
- **States:** code not found → clear message; no events yet (`PENDING` with no history) → "awaiting confirmation" state; `FAILED_DELIVERY` → "Delivery attempt failed · the carrier will try again", never the failure reason (the reason is the internal `note`).
- **Navigation:** standalone screen, no menu — can be opened directly from a shared link.

---

## Seller

**Navigation (app shell):** "Create shipment" (outline button at the top); Overview; Shipments with Active, Late and Exceptions (counted), Delivered and Cancelled; Setup: Modalities, Integrations, Profile. Phone tabs: Overview, Shipments, Create, More.

### Multi-step Onboarding

- **Role:** newly registered Seller
- **Goal:** complete the `Seller` profile (data → documents → modalities) before approval.
- **Data:** steps — (1) company data, already partially filled from signup; (2) document upload (outside the current schema — noted as a gap, not modeled yet); (3) `SellerModality` — enable which `DeliveryModality` options to offer.
- **Actions:** move forward/back between steps, save draft, submit for approval (`Seller.status: PENDING → PENDING` with onboarding complete — approval status doesn't change on its own, only the admin approves it).
- **States:** partially saved draft (resume where you left off); step with a validation error.
- **Navigation →** Awaiting Approval.

### Awaiting Approval

- **Role:** Seller with `status = PENDING`
- **Goal:** communicate that the account is under review, with no dashboard access yet.
- **Data:** text status, possibly the onboarding submission date.
- **Actions:** none — a pure waiting screen (maybe "edit submitted data," out of MVP scope).
- **Navigation:** once approved (`status = APPROVED`), the next login already lands on the Dashboard.

### Dashboard (Seller)

- **Role:** approved Seller
- **Goal:** "how am I doing this period, and what needs me now", answered in five seconds ([spec 07](./specs/07-dashboards.md)).
- **Data:** a window selector (7 d · 30 d · 90 d, `?window=`, 30 d by default); tiles Active now, Late now, On time · window (sparkline, n, 90 % target) and Delivered · window, each defined in the [metric table](./specs/07-dashboards.md#metrics-core-api); a pipeline bar of the open statuses; Exceptions (late and failed) over On time by modality; an Activity panel grouped by shipment, at most six.
- **Actions:** every count tile and pipeline segment opens the shipment list filtered to exactly that number; create a shipment.
- **States:** a rate on fewer than five samples reads "—" with "Not enough deliveries (n=<n>)"; no exception is one line, "Nothing needs you right now."
- **Navigation →** Create Shipment · Shipments List · Modality Configuration.

### Create Shipment

- **Role:** approved Seller
- **Goal:** create a `Shipment` — the most business-logic-"loaded" screen in the seller's flow.
- **Input data:** destination address (`addressStreet`, `addressNumber`, `addressComplement`, `addressNeighborhood`, `addressCity`, `addressState`, `addressZipCode`); modality — a dropdown fed only by the enabled `SellerModality` entries (not the entire `DeliveryModality` catalog).
- **Specific flow (not just a form):** once city/state and modality are filled in, the system cross-references `CarrierCoverageArea` (coverage for that city/state) **and** `CarrierModality` (who offers the chosen modality) **and** `Carrier.status = APPROVED` → shows a filtered list of eligible carriers for the seller to pick manually (not automatic assignment, see DESIGN.md §10).
- **Actions:** fill in the address, pick a modality, pick a carrier from the filtered list, confirm (generates `trackingCode`, `status: PENDING`).
- **States:** **no compatible carrier** (city+modality with no match) → empty state explaining why, not a generic error — this is the most important exception case on this screen.
- **Navigation →** the newly created Shipment Detail.

### Shipments List

- **Role:** Seller
- **Goal:** list/filter the seller's own `Shipment` records.
- **Data:** `trackingCode`, `status` (badge/pill, one per `ShipmentStatus` state), `addressCity`/`addressState`, assigned carrier, `createdAt`.
- **Views:** tabs All · Active · Exceptions · Delivered · Cancelled with live counts; open views sort by due time. An old `?status=` link with no tab of its own is a removable filter.
- **Actions:** search by code, city or zip (`/` focuses it); remove filter chips; peek at a row without leaving the list (desktop, `?peek=<id>`, `J`/`K`/`Enter`/`Esc`); select rows to copy their tracking links or cancel the cancellable ones (at most 4 requests at a time, one summary toast); open detail.
- **States:** empty (no shipments yet), empty view, no match ("No shipments match.").
- **Navigation →** Shipment Detail.

### Shipment Detail (Seller view)

- **Role:** Seller (owner of the shipment via `sellerId`)
- **Goal:** track a specific shipment in real time.
- **Data:** every `Shipment` field + full `TrackingEvent` timeline (status, `note`, `createdAt`) + public tracking link to share. A `FAILED_DELIVERY` event shows its failure reason (the event `note`) to the seller.
- **Actions:** copy tracking link; (cancel, only if `status` still allows it — `PENDING`/`ACCEPTED`, see the rule in §10).
- **States:** status updates arrive via WebSocket in real time (see DESIGN.md §5) — the screen should reflect the change without a reload.
- **Navigation:** back to Shipments List.

### Modality Configuration

- **Role:** Seller
- **Goal:** toggle which `DeliveryModality` options the seller offers — this is the screen that justifies `SellerModality` existing as its own table (DESIGN.md §10).
- **Data:** the full `DeliveryModality` catalog (`code`, `name`), with a toggle showing whether it's in `SellerModality` for this seller.
- **Actions:** enable/disable each modality.
- **States:** **important:** this screen does not reflect whether a compatible carrier exists — it's the seller's own decision, independent of actual availability (decision recorded in §10). Don't show a warning like "no carrier offers this" here — that belongs on the Create Shipment screen, not this one.

---

## Carrier

**Navigation (app shell, manager and operator alike):** Queue with Unclaimed, Mine, To pick up, On the road and Exceptions (counted) and Done, Unclaimed current by default for a manager and Mine for an operator; Performance; Company: Company, Modalities & coverage. Phone tabs: Queue, Metrics, Company, More.

### Company Registration

- **Role:** public (becomes a `CarrierUser` with role `CARRIER_MANAGER`)
- **Goal:** create a `User` (role `CARRIER_MANAGER`) + `Carrier` + `CarrierUser` linking the two, initial status `PENDING`.
- **Data:** manager's email/password, `Carrier.companyName`, `Carrier.document`.
- **Actions:** create account.
- **Navigation →** Awaiting Approval (same conceptual screen as the seller's, reusable).

### Modality & Coverage Configuration

- **Role:** `CARRIER_MANAGER` only — mutation is manager-only, mirroring Operator Management's RBAC rule; `CARRIER_OPERATOR` can view but not change (matches the read access the shared queue already gives operators over their own company's data).
- **Goal:** two related settings the carrier declares about itself before it can match any shipment: which `DeliveryModality` entries it operates (`CarrierModality`) and which `state`/`city` combinations it covers (`CarrierCoverageArea`, `city` blank = entire state).
- **Data:** the full `DeliveryModality` catalog with a toggle (same shape as the seller's Modality Configuration, `enabled` reflects `CarrierModality`); the carrier's own list of coverage rows (`state`, `city`).
- **Actions:** toggle modalities (full replace of the enabled set); add/remove coverage rows (full replace of the list, not incremental).
- **States:** empty coverage list → the carrier won't show up in any seller's eligible-carriers match until at least one row exists — worth a visible warning here, not a silent gap.
- **Navigation:** reachable from the Dashboard, alongside Operator Management.

> Added after the fact: this screen wasn't in the original spec (only the seller side had a documented "Modality Configuration"), but `CarrierModality`/`CarrierCoverageArea` existed in the schema since §10 with no screen ever declaring who sets them — a real gap, not a deliberate omission. Closed once the backend endpoints were built (DESIGN.md §19).

### Dashboard / Shared Queue

- **Role:** `CARRIER_MANAGER` and `CARRIER_OPERATOR` (same screen, actions vary)
- **Goal:** queue of `Shipment` records assigned to the `Carrier` — **every operator sees everything** (shared queue, DESIGN.md §3).
- **Data:** per row — `trackingCode`, `status`, `addressCity`, modality, `owner` as a chip ("Ana S.", "You", or "Unclaimed").
- **Views:** Mine · Unclaimed · To pick up · On the road · Exceptions · Done with live counts; operators land on Mine, managers on Unclaimed; Mine hides the Owner column; open views sort by due time. Search by code, city or seller; peek at a row (desktop), with Claim in the peek.
- **Claim next:** the header button "Claim next · <Unclaimed count>" claims the most urgent unclaimed shipment and opens it; it is disabled at 0.
- **Actions — depend on who owns it (`ownerId`):**
  - no owner → any operator can **claim it** (`self-assign`, sets `ownerId`);
  - the owner is the logged-in user → can **update status** (advances the `ShipmentStatus`, writes a new `TrackingEvent`);
  - the owner is another operator → **view only** (except the manager, who can act on any shipment in the carrier to unblock operations).
- **States:** empty queue; real-time update when another operator claims/updates a shipment (WebSocket).
- **Navigation →** Shipment Detail (carrier view) · Operator Management (manager only) · Performance.

### Shipment Detail (Carrier view)

- **Role:** `CarrierUser` of the assigned carrier
- **Goal:** the same shipment data screen, but with the queue's action controls (claim, update status) instead of "cancel."
- **Data:** same as the seller's Shipment Detail, plus the seller's data (name, contact) that the seller doesn't need to see about themselves.
- **Actions:** claim the shipment (if it has no owner); update `status` — the transition must respect the state machine from §10 (e.g., can't jump straight from `PENDING` to `DELIVERED`; carriers can never set `CANCELLED`, only the seller cancels).

### Operator Management

- **Role:** `CARRIER_MANAGER` only — an important RBAC rule, not a screen for regular operators.
- **Goal:** invite new operators and see who's already part of the carrier.
- **Data:** list of `CarrierUser` (role `CARRIER_OPERATOR`) in the carrier; list of pending `Invite`s (`status = PENDING`, `expiresAt`).
- **Actions:** invite (creates an `Invite`, triggers an email — BullMQ worker from §5); revoke a pending invite.
- **States:** an expired invite shows up distinctly (doesn't disappear from the list, shown as expired).

### Carrier Performance

- **Role:** `CARRIER_MANAGER` and `CARRIER_OPERATOR`
- **Goal:** the number the carrier is judged on (on time) and where time goes.
- **Data:** window selector; tiles On time, Median delivery, First attempt and Median claim for the window ([metric table](./specs/07-dashboards.md#metrics-core-api)); time per stage (median bar, p90 whisker, budget tick, a table view); the Team table with every member by name, the manager under a divider and "You" on the signed-in row. Refreshes live from the queue room, throttled to one refetch per 10 s. Only the carrier's own shipments (multi-tenant isolation).
- **States:** fewer than five samples per rate or stage → "Not enough data (n=<n>)"; no shipment in the window → empty state.

---

## Admin

**Navigation (app shell):** Overview; Monitoring (also owns shipment details) with Active (default), Late and Exceptions, all counted; Tenants: Sellers, Carriers. Phone tabs: Overview, Monitoring, Sellers, More.

### General Dashboard

- **Role:** Admin
- **Goal:** the whole live platform at a glance.
- **Data:** a pulse strip polled every 5 s, outside the window: events per minute (15-minute sparkline), sockets, simulator ("Chaos · <label>" with a warning dot while a scenario runs), webhooks over the last hour, queues and Postgres/Redis, each part degrading on its own ("Pulse unavailable · retrying" when the request fails); tiles On time, Late now, Failed and Median claim for the window; On time by carrier (each name opens its Carrier 360 on the same window); the review queue with approve/reject inline and the approved tenant counts. The demo admin sees Approve and Reject disabled on a pending application, with "The demo admin can't approve or reject sign-ups". The two columns stack on their own (`align-items: start`), so neither panel stretches.
- **Demo card** (only where `GET /admin/demo` answers): under the review queue, the simulator word, "Resets daily at 04:00 · last reset · next", "Reset demo data…" behind a confirmation (a second reset within a minute explains itself in the dialog), and Chaos Mode: a duration choice (1, 3 or 5 min), one row per scenario with Start, the running block (progress, start and end times, End now) with the card's warning ring, Start disabled with "One scenario at a time", "Ending…" for a run past its end the server has not ended yet, or "Available in m:ss" during the cooldown, and the last five runs with how each ended.
- **Navigation →** Sellers List · Carriers List · Global Monitoring · Carrier Detail.

### Sellers List

- **Role:** Admin
- **Data:** `companyName`, `document`, Shipments · 30 d and On time (same response, `include=stats`), `status`, `createdAt`.
- **Actions:** filter by status (the `PENDING` queue is the default view, since it's the recurring action).
- **States:** a rate on fewer than five deliveries reads "—", with "Not enough deliveries (n=<n>)" as its title and for screen readers; Tax ID and sign-up date give way below 1024 px.
- **Navigation →** Seller Detail.

### Seller Detail

- **Role:** Admin — the Seller 360.
- **Data:** header with the approval badge, e-mail and tax ID with copy buttons, and the window. Approved: tiles Shipments · window, On time · window, Active now and Late now, equal to the seller's own overview; the ten most recent shipments (each opening its detail with the Monitoring scope kept for the breadcrumb) with a link to all of them in Monitoring (`view=ALL`); Status · window; the modality catalog, each Enabled or Off. "No shipments yet" for an approved seller without any, and no tile is drawn before the total is known.
- **Actions:** **approve / reject** while pending (the company details review; focus moves to the new title after approval); count tiles open Monitoring filtered by the seller, Shipments on `view=ALL` and the window.
- **States:** pending or rejected — the company details review instead of metrics.

### Carriers List

- **Role:** Admin
- **Data:** `companyName`, `document`, `CarrierUser` count, Shipments · 30 d, On time and Failed (`include=stats`), `status`, `createdAt`.
- **Actions:** filter by status.
- **States:** a rate on fewer than five samples reads "—", with "Not enough deliveries (n=<n>)" as its title and for screen readers; Tax ID and sign-up date give way below 1024 px.
- **Navigation →** Carrier Detail.

### Carrier Detail

- **Role:** Admin — the Carrier 360.
- **Data:** header with the manager e-mail and user count, and the window. Approved: tiles On time, Median delivery, First attempt (the manager's own endpoints by id, so the numbers equal their Performance page) and Active now; time per stage, full width; from 1280 px the ten most recent shipments beside the read-only Team table (no "You", no links) and Coverage & modalities (UF / city chips, "All of <UF>", the enabled modalities with SLA hours), stacked full width below it. Performance and team refresh like the carrier's own page, at most once per 10 s. "No shipments yet" for an approved carrier without any; a carrier without a manager reads "No manager".
- **Actions:** **approve/reject the company** while pending; Active now opens Monitoring filtered by the carrier.
- **States:** pending or rejected — the company details review instead of metrics.

### Global Monitoring

- **Role:** Admin
- **Goal:** real-time view of every `Shipment` on the platform — the screen that consumes the WebSocket + Redis pub/sub pipeline described end-to-end in §5.
- **Data:** every shipment, with `status`, carrier, seller, `addressCity`/`addressState`, updated live as `TrackingEvent`s are created across any carrier.
- **Views:** All · Active · Exceptions and one tab per status, counts narrowed by the Carrier and Seller menus; lands on Active.
- **Actions:** search by code, city or seller; filter by carrier/seller (shown as removable chips); peek at a row (desktop) with a copyable admin link; open detail.
- **States:** the most natural place to visually highlight the granularity of `ShipmentStatus`'s 9 states (§10) — worth a clearly visible per-state filter, not just a flat list.

---

## App shell ([spec 09](./specs/09-app-sidebar.md))

- **Header:** brand, `⌘K` and the user menu only. The global banner spans the full width under it, above the sidebar and the page. "Skip to content" and, from 1024 px, "Skip to navigation" appear on focus.
- **Sidebar (≥ 1280 px):** 240 px, docked, sticky under the header, scrolling on its own. The role's tree (see each role's Navigation line) in sections with disclosure buttons; the views nest under their level-1 item. The current view row carries `aria-current="page"`; without a matching view, the level-1 item does.
- **Rail:** `[` or the button at the sidebar foot shrinks it to a 64 px rail of icons with tooltips; the choice lives in the `tms-sidebar` cookie, so a reload renders the rail with no flash. In the rail an open Exceptions count puts a danger dot on its icon ("Shipments, 3 exceptions").
- **1024–1279 px:** always the rail. The button opens the full sidebar as an overlay above the page, without reflowing it; Esc, a click outside, a navigation or leaving the range closes it, and focus returns to the button.
- **Counts:** live pills on the "act now" views (all time, never windowed), throttled to one repaint every 2 s. Hidden at 0, "99+" above 99, the exact number in the link's name ("Late, 124 shipments"). Exceptions use the exception tone, Late the tables' late tone, the rest plain numbers. While the sidebar's subscription isn't live the toned pills turn outlined and the counts poll. Rises of Exceptions are announced politely, at most once per 10 s.
- **Footer:** the connection line ("Live", "Connecting…" or "Reconnecting · counts may be stale"), "Chaos · off" or "Chaos · <label>" on the demo deployment, and for admins "Simulator · <state>" and "Webhooks · <rate>% · n <n>" (links to Monitoring). In the rail each line is a dot with a tooltip.
- **Recent:** the last five shipment details the user opened, by tracking code, newest first; absent when empty.
- **Phone (< 1024 px):** three tabs plus More, which opens a "Navigation" bottom sheet with the whole tree, counts, Recent and the footer at 44 px targets.
- **Shortcuts:** `g` then a key (seller `o` `s` `c`, carrier `q` `p`, admin `o` `m`) and `[`; ignored in fields, with a modifier and under a dialog, and switched off by "Keyboard shortcuts" in the user menu. `⌘K` lists every level-1 item, every view as "<parent> · <view>" with its hint, and the recents.

## Global banner (every app shell)

On the demo deployment the admin, seller and carrier layouts each pass the demo's `GlobalBanner` to `AppShell`'s banner slot, between the header and the page (shared code can't import a feature). While a Chaos Mode scenario runs, every signed-in user sees a full-width warning line with the scenario, a ticking "m:ss left" and, for admins, End now; it hides at its local end time even if the socket missed the end. Its live region announces only the start and the end. With no scenario, demo accounts see a dismissible "You're using the shared public demo" line with the next reset time.

## Known Gaps (not modeled yet, so as not to pretend they're ready)

- Document upload in seller onboarding — mentioned in the flow, no table/storage defined.
- SLA-breach notification (uses `DeliveryModality.slaHours`, but the BullMQ worker doesn't exist yet — roadmap §7/§5).
