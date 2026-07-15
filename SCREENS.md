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
- **Navigation →** the corresponding role's dashboard, or a waiting screen.

### Seller Signup (self-signup)

- **Role:** public (becomes a Seller)
- **Goal:** create a `User` (role `SELLER`) + linked `Seller`, initial status `PENDING`.
- **Data:** email, password, `Seller.companyName`, `Seller.document` (tax ID).
- **Actions:** create account → goes straight into Onboarding.
- **States:** document already registered (`document` is `@unique`) → clear error, not generic.
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
- **Data:** current `status` (friendly label for `ShipmentStatus`), `addressCity`/`addressState` (not the full address), `TrackingEvent` timeline (status + `createdAt`, without the internal `note`).
- **Actions:** search by code.
- **States:** code not found → clear message; no events yet (`PENDING` with no history) → "awaiting confirmation" state.
- **Navigation:** standalone screen, no menu — can be opened directly from a shared link.

---

## Seller

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
- **Goal:** overview of the seller's shipments.
- **Data:** `Shipment` count by `status` (how many `PENDING`, `IN_TRANSIT`, `DELIVERED`, etc.), shortcut to the latest shipments.
- **Actions:** create a shipment; view the full list.
- **States:** zero shipments yet → empty state with a CTA to create the first one.
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
- **Actions:** filter by status; open detail.
- **States:** empty (no shipments yet).
- **Navigation →** Shipment Detail.

### Shipment Detail (Seller view)

- **Role:** Seller (owner of the shipment via `sellerId`)
- **Goal:** track a specific shipment in real time.
- **Data:** every `Shipment` field + full `TrackingEvent` timeline (status, `note`, `createdAt`) + public tracking link to share.
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
- **Data:** per row — `trackingCode`, `status`, `addressCity`, modality, `owner` (owning `CarrierUser`'s name, or "no owner").
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
- **Actions:** claim the shipment (if it has no owner); update `status` — the transition must respect the state machine from §10 (e.g., can't jump straight from `PENDING` to `DELIVERED`; `CANCELLED` only before `COLLECTED`).

### Operator Management

- **Role:** `CARRIER_MANAGER` only — an important RBAC rule, not a screen for regular operators.
- **Goal:** invite new operators and see who's already part of the carrier.
- **Data:** list of `CarrierUser` (role `CARRIER_OPERATOR`) in the carrier; list of pending `Invite`s (`status = PENDING`, `expiresAt`).
- **Actions:** invite (creates an `Invite`, triggers an email — BullMQ worker from §5); revoke a pending invite.
- **States:** an expired invite shows up distinctly (doesn't disappear from the list, shown as expired).

### Carrier Performance

- **Role:** `CARRIER_MANAGER` and `CARRIER_OPERATOR`
- **Goal:** aggregated metrics — how many `Shipment` records per `status`, average time between `TrackingEvent`s (SLA proxy), `FAILED_DELIVERY`/`RETURNED` rate.
- **Data:** `Shipment`/`TrackingEvent` aggregations filtered by `carrierId` — no data from other carriers (multi-tenant isolation).
- **States:** not enough data yet (new carrier, few shipments).

---

## Admin

### General Dashboard

- **Role:** Admin
- **Goal:** executive view of the entire platform.
- **Data:** seller/carrier counts by `ApprovalStatus`, total `Shipment` count by `ShipmentStatus`, pending approvals highlighted (the admin's most frequent action).
- **Actions:** direct shortcut to the approval queue.
- **Navigation →** Sellers List · Carriers List · Global Monitoring.

### Sellers List

- **Role:** Admin
- **Data:** `companyName`, `document`, `status`, `createdAt`.
- **Actions:** filter by status (the `PENDING` queue is the default view, since it's the recurring action).
- **Navigation →** Seller Detail.

### Seller Detail

- **Role:** Admin
- **Data:** every `Seller` field + onboarding data + enabled `SellerModality` entries + list of recent `Shipment` records.
- **Actions:** **approve / reject** (`status: PENDING → APPROVED/REJECTED`).
- **States:** already approved/rejected — the action becomes history only, with no active button.

### Carriers List

- **Role:** Admin
- **Data:** `companyName`, `document`, `status`, `CarrierUser` count, `createdAt`.
- **Actions:** filter by status.
- **Navigation →** Carrier Detail.

### Carrier Detail

- **Role:** Admin
- **Data:** `Carrier` fields + `CarrierCoverageArea` (list of covered cities/states) + `CarrierModality` (what it operates) + `CarrierUser` sub-list (manager + operators) + pending `Invite`s.
- **Actions:** **approve/reject the company**; view operators and invites (same sub-list as Operator Management, read-only for the admin).

### Global Monitoring

- **Role:** Admin
- **Goal:** real-time view of every `Shipment` on the platform — the screen that consumes the WebSocket + Redis pub/sub pipeline described end-to-end in §5.
- **Data:** every shipment, with `status`, carrier, seller, `addressCity`/`addressState`, updated live as `TrackingEvent`s are created across any carrier.
- **Actions:** filter by status/carrier/seller; open detail.
- **States:** the most natural place to visually highlight the granularity of `ShipmentStatus`'s 9 states (§10) — worth a clearly visible per-state filter, not just a flat list.

---

## Known Gaps (not modeled yet, so as not to pretend they're ready)

- Document upload in seller onboarding — mentioned in the flow, no table/storage defined.
- SLA-breach notification (uses `DeliveryModality.slaHours`, but the BullMQ worker doesn't exist yet — roadmap §7/§5).
- Shipment cancellation by the seller — mentioned here as a likely action, but the exact rule (up to which `status`) isn't in DESIGN.md yet — an open product decision.
