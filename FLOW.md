# Mini TMS — Current Flow (frame-by-frame prototype brief)

Scope: every screen with a real, validated backend contract as of today — seller onboarding, carrier onboarding, admin approval, post-approval self-service setup (modalities/coverage), shipment creation, the real-time carrier queue, and (Part 4 onward) the screens still missing to close out `SCREENS.md`. Written to feed a design tool (Claude Design/Figma/etc.) with a sequential, frame-by-frame storyboard rather than a flat per-screen catalog.

Every frame is grounded in the real API: exact DTO field names, not placeholders, for anything already built. For Parts 5–8 (not built yet), the field names are a **proposed contract** — matching this codebase's existing naming conventions exactly, so the backend that gets built to support these screens doesn't have to invent shapes after the fact. Each such frame says explicitly which endpoint is real vs. proposed.

**Now real, no longer deferred** (Part 4 below): operator claim/status-transition, the carrier shared queue, and real-time tracking updates via WebSocket + Redis — all validated end-to-end (`DESIGN.md` §20).

**Still out of scope, deliberately** — don't prototype these as if a backend exists:
- **Multi-step seller onboarding with document upload** — blocked on an unresolved architecture decision (where/how uploaded documents are stored, never modeled in the schema). Needs its own decision, separate from screen design.
- **Shipment cancellation** — the exact rule (up to which `status`) isn't decided yet (`SCREENS.md`'s own Known Gaps).
- **SLA-breach notifications / invite emails** — need the BullMQ worker infra, itself deferred until there's a real queueing need beyond what Parts 6–7 require.

---

## Part 1 — Entry & Approval

Two structurally identical tracks (Seller, Carrier) that both funnel through the same Admin review engine.

### Frame 1 — Login (public)

- **Actors:** anyone (admin, seller, carrier manager/operator)
- **Data:** form — `email`, `password`
- **Action:** submit → `POST /auth/login` → `{ accessToken, user: { id, email, role } }`
- **States:** invalid credentials → generic error (no hint whether it's the email or password that's wrong)
- **Branch by `user.role`:** `ADMIN` → Frame 5 · `SELLER` → Frame 3 (if not yet approved) or Frame 7 · `CARRIER_MANAGER`/`CARRIER_OPERATOR` → Frame 3 (if not yet approved) or Frame 9

### Frame 2a — Seller Signup (public)

- **Actor:** anonymous visitor, becomes a `SELLER`
- **Data:** form — `email`, `password` (min 8 chars), `companyName`, `document`
- **Action:** submit → `POST /sellers` → creates `User(role: SELLER)` + `Seller(status: PENDING)` in one transaction
- **States:** duplicate email/document → generic 409 ("Email or document already registered" — deliberately doesn't say which field, to prevent account enumeration)
- **Navigation →** Frame 3

### Frame 2b — Carrier Company Registration (public)

- **Actor:** anonymous visitor, becomes a `CARRIER_MANAGER`
- **Data:** form — `email`, `password`, `companyName`, `document`
- **Action:** submit → `POST /carriers` → creates `User(role: CARRIER_MANAGER)` + `Carrier(status: PENDING)` + `CarrierUser(role: MANAGER)` in one transaction
- **States:** same generic 409 on duplicate email/document
- **Navigation →** Frame 3

### Frame 3 — Awaiting Approval (shared)

- **Actor:** a `Seller` or `Carrier` with `status: PENDING`
- **Goal:** communicate the account is under review — no dashboard access yet
- **Data:** just the status; nothing else exists at this point (no onboarding steps beyond signup — see note below)
- **Actions:** none, pure waiting screen
- **Navigation:** every login while still `PENDING` redirects back here

> Note: the original spec imagined a multi-step onboarding (company data → documents → modality setup) between signup and this screen. That doesn't exist — signup goes straight to `PENDING`. Modality/coverage setup (Frames 8, 10) happens *after* approval, not before.

### Frame 4 — Admin Login

- Same screen as Frame 1, admin credentials, `user.role: "ADMIN"`
- **Navigation →** Frame 5

### Frame 5a — Admin: Sellers List

- **Data:** `GET /sellers?status=&page=&limit=` → `{ data: [{ id, email, companyName, document, status, createdAt }], meta: { total, page, limit, totalPages } }`
- **Actions:** filter by `status` (PENDING is the default/recurring view); paginate; click a row
- **Navigation →** Frame 6a

### Frame 5b — Admin: Carriers List

- **Data:** `GET /carriers?status=&page=&limit=` → same envelope, rows are `{ id, email, companyName, document, status, userCount, createdAt }` — note the extra `userCount` (how many `CarrierUser`s belong to this company, absent on the seller list since a seller has exactly one owner by construction)
- **Actions:** same as 5a
- **Navigation →** Frame 6b

### Frame 6a — Admin: Seller Detail → Approve/Reject

- **Data:** `GET /sellers/:id` → full `SellerResponseDto`
- **Actions:** `PATCH /sellers/:id/approve` or `/reject` — a real state transition (409 if the seller isn't currently `PENDING`, e.g. already decided)
- **States:** already approved/rejected → action buttons become inert, decision shown as history

### Frame 6b — Admin: Carrier Detail → Approve/Reject

- **Data:** `GET /carriers/:id` → full `CarrierResponseDto`
- **Actions:** `PATCH /carriers/:id/approve` or `/reject`, same 409-on-non-pending rule
- **States:** same as 6a

---

## Part 2 — Post-Approval Self-Service Setup

Both an approved seller and an approved carrier manager land here before shipment creation becomes possible.

### Frame 7 — Seller: Own Profile

- **Actor:** approved `SELLER`
- **Data:** `GET /sellers/me` → `{ id, email, companyName, document, status, createdAt }` (ownership-resolved from the JWT, no `:id` param — a seller can never fetch another seller's record through this route)
- **Navigation →** Frame 8, Frame 11 (Create Shipment), Frame 14 (Shipments List)

### Frame 8 — Seller: Modality Configuration

- **Actor:** approved `SELLER`
- **Data:** `GET /sellers/me/modalities` → array of `{ id, code, name, enabled }` — the full `DeliveryModality` catalog (currently `STANDARD`, `FULL`, `EXPRESS`) with a toggle per entry
- **Action:** `PUT /sellers/me/modalities` with `{ modalityIds: [...] }` — **full replace**, not incremental (the client always submits the complete desired set)
- **States:** submitting an unknown `modalityId` → 400

### Frame 9 — Carrier: Own Company

- **Actor:** approved `CARRIER_MANAGER` or `CARRIER_OPERATOR` (both can view; only the manager can change anything downstream)
- **Data:** `GET /carriers/me` → full `CarrierResponseDto`
- **Navigation →** Frame 10 (manager only)

### Frame 10 — Carrier: Modality & Coverage Configuration

- **Actor:** `CARRIER_MANAGER` only (mutation) — mirrors the existing manager-only rule for Operator Management; operators can view but not change
- **Data (modalities):** `GET /carriers/me/modalities` → same `{ id, code, name, enabled }` shape as Frame 8
- **Action (modalities):** `PUT /carriers/me/modalities` with `{ modalityIds: [...] }` — full replace
- **Data (coverage):** `GET /carriers/me/coverage-areas` → array of `{ id, state, city }` (`city: null` means "covers the entire state")
- **Action (coverage):** `PUT /carriers/me/coverage-areas` with `{ areas: [{ state, city? }, ...] }` — full replace
- **States:** an empty coverage list means this carrier won't show up in any seller's eligible-carriers match — worth a visible warning here, not a silent gap

> This screen didn't exist in the original spec — only the seller side had a documented "Modality Configuration." Added because the schema (`CarrierModality`/`CarrierCoverageArea`) needed *someone* to configure it and nobody had spec'd who.

---

## Part 3 — Shipment Creation (the payoff)

Only reachable once at least one approved seller (with an enabled modality) and one approved carrier (covering some area, offering that modality) exist.

### Frame 11 — Create Shipment: Address + Modality

- **Actor:** approved `SELLER`
- **Data (input):** `addressStreet`, `addressNumber`, `addressComplement?`, `addressNeighborhood`, `addressCity`, `addressState`, `addressZipCode`; a modality dropdown fed **only** by the seller's own `enabled: true` entries from Frame 8 (not the full catalog)
- **Action:** once city/state/modality are filled, move to Frame 12 (no submission yet — this is a live preview step)

### Frame 12 — Create Shipment: Eligible Carriers Preview

- **Data:** `GET /shipments/eligible-carriers?state=&city=&modalityId=` → array of `{ id, companyName }` — carriers that are `APPROVED`, cover this exact state/city (or cover the whole state), and offer this modality
- **States:** **empty array** → "no carrier available for this address/modality" — the single most important exception state in this whole flow, show it clearly, not as a generic error
- **Action:** seller picks one carrier from the list (manual choice, never automatic assignment)

### Frame 13 — Create Shipment: Confirm

- **Action:** `POST /shipments` with `{ ...address fields, modalityId, carrierId }` → creates the `Shipment` (`status: PENDING`, a generated `trackingCode` like `TMS-XXXXXXXXXXXX`)
- **Important:** everything Frame 12 showed is **re-validated server-side** on this exact call — the preview is not trusted, so a stale or tampered request still gets rejected (400) if the seller/modality/carrier combination no longer actually matches
- **States:** seller not `APPROVED` → 400 · modality not enabled for the seller → 400 · carrier doesn't actually cover/offer → 400
- **Navigation →** Frame 15 (the new shipment's detail)

### Frame 14 — Seller: Shipments List

- **Data:** `GET /shipments?status=&page=&limit=` → paginated `{ id, trackingCode, status, carrierId, carrierName, modalityId, modalityName, address*, createdAt }[]`, scoped to the authenticated seller's own shipments only
- **Actions:** filter by `status`; paginate; open a row
- **States:** empty (no shipments created yet)
- **Navigation →** Frame 15

### Frame 15 — Seller: Shipment Detail

- **Data:** `GET /shipments/:id` → full `ShipmentResponseDto`, **now including** `trackingEvents: [{ id, status, note, createdAt }]` ordered oldest→newest (see Frame 18 — this is the same screen, revised, not a separate one)
- **Important:** a shipment belonging to a *different* seller returns the same 404 as one that doesn't exist — never a 403 that would confirm it belongs to someone else

---

## Part 4 — Carrier Queue & Real-Time Tracking (now real)

Every endpoint in this part is built and validated (`DESIGN.md` §20) — claim/status-transition atomicity, ownership rules, and the WebSocket + Redis push are all real. This part supersedes the old "explicitly out of scope" note for these frames in earlier drafts of this file.

### Frame 16 — Carrier: Shipment Queue

- **Actor:** `CARRIER_MANAGER` or `CARRIER_OPERATOR` — same queue, shared across the whole company (every operator sees everything)
- **Data:** `GET /shipments/queue?status=&page=&limit=` → paginated `CarrierShipmentResponseDto[]`: `{ id, trackingCode, status, modalityId, modalityName, sellerId, sellerCompanyName, sellerEmail, ownerId, ownerEmail, addressStreet, addressNumber, addressComplement, addressNeighborhood, addressCity, addressState, addressZipCode, createdAt }`
- **Actions:** filter by `status` tab (All / Pending / Accepted / In transit); paginate; **Claim** button on any row where `ownerId` is `null` (any manager or operator may claim — first to click wins); click a row → Frame 17
- **States:** empty queue; a row already claimed shows the owner's email instead of a Claim button; live updates via WebSocket — a claim or status change by any operator updates every other connected tab's queue view without a reload
- **Real-time:** on mount, the client connects a WebSocket, authenticates with the JWT, and emits `subscribe:queue` (no payload — the server derives the caller's own carrier). A `shipment:updated` message on this room means "refetch the queue," not a payload to render directly.

### Frame 17 — Carrier: Shipment Detail (Queue view)

- **Actor:** `CarrierUser` of the assigned carrier
- **Data:** `GET /shipments/queue/:id` → `CarrierShipmentDetailResponseDto` (Frame 16's shape plus `trackingEvents: [{ id, status, note, createdAt }]`) — a shipment belonging to a *different* carrier returns 404, same enumeration-avoidance rule as everywhere else
- **Actions, gated by ownership:**
  - unclaimed (`ownerId: null`) → **Claim shipment** button, `PATCH /shipments/:id/claim` (409 if someone else claimed it first)
  - claimed by the viewer, or viewer is the `CARRIER_MANAGER` → **Advance to `<next status>`** button(s), `PATCH /shipments/:id/status { status, note? }` — only the 1–2 statuses the state machine actually allows from the current one are offered (`PENDING→ACCEPTED` only via Claim, `ACCEPTED→COLLECTED→IN_TRANSIT→OUT_FOR_DELIVERY→{DELIVERED|FAILED_DELIVERY}`, `FAILED_DELIVERY→RETURNED`)
  - claimed by a *different* operator, viewer isn't the manager → no action buttons, just a note explaining why
- **States:** terminal status (`DELIVERED`/`RETURNED`) → "no further action available"; live updates via `subscribe:shipment` (same room the seller's Frame 15/18 view joins) — advancing status here updates the seller's own open detail view without them refreshing

### Frame 18 — Seller: Shipment Detail, revised (live tracking)

- Same screen as Frame 15, revised: now renders the `trackingEvents` timeline (status pill + optional note + timestamp per entry, oldest→newest; empty state: "No status updates yet") and subscribes to the same `shipment:{id}` WebSocket room Frame 17 pushes to — a carrier operator advancing this shipment's status updates this screen live, no reload

---

## Part 5 — Dashboards (proposed contract, not built yet)

Today `/admin` redirects straight to the sellers list and `/seller` shows only the profile card — neither matches `SCREENS.md`'s spec of an actual overview. Both need a small new aggregation endpoint; nothing here needs WebSocket, a plain fetch on load is enough.

### Frame 19 — Seller: Dashboard

- **Actor:** approved `SELLER` — becomes the new `/seller` landing page (profile moves to a secondary nav item)
- **Proposed data:** `GET /sellers/me/dashboard` → `{ shipmentCountsByStatus: Record<ShipmentStatus, number>, recentShipments: ShipmentResponseDto[] }` (last 5, newest first)
- **Actions:** **+ Create shipment** shortcut; click a recent shipment → Frame 15/18; "View all" → Frame 14
- **States:** zero shipments ever → empty state with the create-shipment CTA front and center, not a bare zero-count grid

### Frame 20 — Admin: General Dashboard

- **Actor:** Admin — becomes the new `/admin` landing page (today it redirects to Frame 5a; that list becomes reachable from nav instead)
- **Proposed data:** `GET /admin/dashboard` → `{ sellersByStatus: Record<ApprovalStatus, number>, carriersByStatus: Record<ApprovalStatus, number>, shipmentsByStatus: Record<ShipmentStatus, number> }`
- **Actions:** pending-approval counts are the visually dominant tile (the admin's most frequent action) and link straight to the filtered Frame 5a/5b list
- **Navigation →** Sellers List · Carriers List · Frame 23 (Global Monitoring)

---

## Part 6 — Operator Invites (proposed contract, not built yet)

The `Invite` model exists in the schema with zero logic anywhere — this is a full new vertical slice, not a UI-only addition. Email delivery is explicitly out of scope for the first version (no BullMQ worker exists); an accepted invite still works via a copyable link.

### Frame 21 — Carrier: Operator Management

- **Actor:** `CARRIER_MANAGER` only (an operator visiting this nav item should be gated out, same RBAC precedent as modality/coverage mutation)
- **Proposed data:** `GET /carriers/me/operators` → current `CarrierUser`s with role `OPERATOR` (`{ id, email, createdAt }`); `GET /carriers/me/invites` → pending/expired/revoked `Invite`s (`{ id, email, status, expiresAt, createdAt }`)
- **Proposed actions:** **+ Invite operator** (`POST /carriers/me/invites { email }`, creates an `Invite` with a token + `expiresAt`, returns a copyable acceptance link — no email sent yet); **Revoke** on a still-pending invite (`DELETE /carriers/me/invites/:id`)
- **States:** an expired invite shows up distinctly in the list (not hidden) as "Expired," not silently dropped

### Frame 22 — Invite Acceptance (public)

- **Actor:** public, becomes a `CarrierUser` with role `OPERATOR`
- **Proposed data:** `GET /invites/:token` → `{ companyName, email }` (email pre-filled, read-only) if the token is valid and still `PENDING`
- **Proposed action:** password form → `POST /invites/:token/accept { password }` → creates `User(role: CARRIER_OPERATOR)` + `CarrierUser(role: OPERATOR)`, marks the `Invite` `ACCEPTED`
- **States:** expired token or already-`ACCEPTED` token → a specific explanatory screen, not a generic 404
- **Navigation →** Frame 16 (the shared queue) — an operator logs in already a full member of the carrier, no approval wait (unlike Seller/Carrier signup)

---

## Part 7 — Admin Global Monitoring & Carrier Performance (proposed contract, not built yet)

### Frame 23 — Admin: Global Monitoring

- **Actor:** Admin
- **Proposed data:** `GET /admin/shipments?status=&carrierId=&sellerId=&page=&limit=` → paginated, every shipment platform-wide with `{ ...CarrierShipmentResponseDto fields, carrierCompanyName }` (seller info already present in that shape)
- **Proposed real-time:** the admin's session joins a new `admin:monitoring` WebSocket room on connect (`TrackingListener` gains a third emit target alongside `shipment:{id}` and `carrier:{carrierId}`) — every `TrackingEvent` platform-wide pushes here live
- **Actions:** filter by status (all 9 states individually selectable, not just a flat list — this is the one screen meant to show off `ShipmentStatus`'s full granularity), by carrier, by seller; open a row → a read-only version of Frame 15/17's detail
- **States:** empty (no shipments platform-wide yet, early after launch)

### Frame 24 — Carrier: Performance

- **Actor:** `CARRIER_MANAGER` and `CARRIER_OPERATOR` (read-only for both, no mutation-gating needed)
- **Proposed data:** `GET /carriers/me/performance` → `{ shipmentCountsByStatus: Record<ShipmentStatus, number>, avgHoursBetweenEvents: number, failedDeliveryRate: number, returnedRate: number }`, scoped to the caller's own carrier only (multi-tenant isolation — no visibility into other carriers' numbers)
- **States:** not enough data yet (new carrier, few shipments) → an explicit "not enough data" state instead of misleading 0%/0h figures

---

## Part 8 — Public Tracking (proposed contract, not built yet)

### Frame 25 — Public Tracking (no login)

- **Actor:** public, no auth — reachable from a shared link (`tms.app/track/:trackingCode`, already shown as a static string on Frames 15/18 today; this frame makes that link real)
- **Proposed data:** `GET /public/tracking/:trackingCode` (no auth guard) → `{ trackingCode, status, addressCity, addressState, modalityName, events: [{ status, createdAt }] }` — deliberately narrower than the authenticated `ShipmentResponseDto`: no street address, no `note` field, no seller/carrier identity, matching `SCREENS.md`'s explicit privacy stance for this screen
- **Actions:** a single search-by-code input (for a visitor who wasn't handed a direct link)
- **States:** code not found → clear message, not a bare 404 page; `PENDING` with no events yet → "awaiting confirmation," not an empty timeline that reads as broken
- **Navigation:** standalone, no app shell/nav — this is the one screen a logged-out visitor can reach
