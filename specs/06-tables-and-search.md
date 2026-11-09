# Feature Specification: Tables and Search

**Feature**: `tables-and-search` — `ShipmentsModule` (list queries, view counts, claim next, owner names) and `apps/web` (shared list toolbar, risk badge, owner chip, peek sheet, seller bulk bar, KPI links)
**Created**: 2026-11-09
**Status**: Draft
**Design reference**: `DESIGN.md` §9 (URL state, live updates), §15 (carrier queue), §16 (dashboards, monitoring); `SCREENS.md` (Shipments List, Dashboard / Shared Queue, Global Monitoring); `FLOW.md` Frame 23; `.claude/research/ux-briefs.md` §0.3, §0.6, §2.2–§2.5, §3.2, §4.1, §5.2, §8.3, §9 steps 2 and 4, §10.2–§10.3; prototypes `SellerShipments`, `SellerShipmentsBulk`, `Main` (carrier Queue), `Monitoring` and `Components` in the approved design canvas

## Summary

The three shipment lists (seller Shipments, carrier Queue, admin Monitoring) share one toolbar: view tabs with counts, a search field and removable filter chips, all held in the URL and resolved by the API. Every row carries one risk phrase from a single SLA vocabulary, owners appear by name, the carrier queue sorts by urgency and offers "Claim next", a floating peek shows a shipment without leaving the list, the seller can cancel or share several shipments at once, and the overview KPI tiles open the table filtered to the number they show.

## User Stories *(mandatory)*

### User Story 1 - One risk phrase everywhere (Priority: P1)

A seller, an operator and an admin read the same phrase for a shipment's SLA position ("Due Thu 14:00", "Due in 4 h", "Late 13 h", "On time", "Late by 8 h", "Failed"), with an icon and text that carry the meaning without colour.

**Why this priority**: today open shipments read "Due in 3 d" or "13 h late" and failed or returned ones read "—", so "how worried should I be" cannot be scanned (ux-briefs §2.4; po-carrier Q4, Q9; po-seller L1). The view tabs and the urgency sort of later stories rely on the same definition of late.

**Independent test**: on the seller list, find one row in each state (demo data has late, due soon, delivered on time, delivered late, failed, returned and cancelled shipments) and read the phrases of §2.4; switch to greyscale rendering and still tell them apart.

**Acceptance scenarios**:

1. **Given** an open shipment whose due time has passed, **when** its row renders, **then** it reads "Late <span>" with the critical tone and icon, and the row keeps the late tint.
2. **Given** an open shipment with less time left than the due-soon threshold (FR-002), **when** it renders, **then** it reads "Due in <span>" with the caution tone and icon, and the row shows a 3 px caution bar on its leading edge instead of a tint.
3. **Given** an open shipment with more time left than the threshold, **when** it renders, **then** it reads "Due <weekday> <HH:mm>" (or "Due <Mon D>" when 6 days away or more, so a weekday never names next week) in the neutral tone, with the remaining span in its `title`.
4. **Given** a `FAILED_DELIVERY` or `RETURNED` shipment, **when** it renders, **then** it reads "Failed" or "Returned" with the critical tone.

---

### User Story 2 - Find a shipment in any list (Priority: P1)

A user types part of a tracking code, a city or a zip (and, on the carrier and admin lists, a seller name) and the list narrows to the matches, across all pages. The search and the active filters appear as chips that can be removed one by one, and the whole state survives reload, back/forward and a shared link.

**Why this priority**: no list has a search today; the command palette cannot find a shipment either (po-seller L3, po-carrier Q5, po-admin M5).

**Independent test**: on `/carrier/queue`, type `TMS-DE`, see only matching codes, copy the URL into a new tab and see the same result; remove the chip and see the full view again.

**Acceptance scenarios**:

1. **Given** a list, **when** the user types in the search field, **then** after 300 ms of inactivity the URL gains `q=<text>`, the page resets to 1 and the API returns the matching rows of the current view.
2. **Given** a `q` that matches nothing, **when** the list renders, **then** it shows "No shipments match." with the active chips and a "Clear filters" action.
3. **Given** a seller searching, **when** the API resolves `q`, **then** only that seller's shipments are searched (no cross-tenant match).

---

### User Story 3 - Views with counts (Priority: P1)

Each list opens on a tab row of saved views with live counts: seller All · Active · Exceptions · Delivered · Cancelled; carrier Mine · Unclaimed · To pick up · On the road · Exceptions · Done; admin All · Active · Exceptions and one tab per status. Open views are sorted by urgency.

**Why this priority**: the status dropdown hides the lifecycle, the queue has no "Mine", and a 13-h-late shipment sits at row 18 under the creation-date order (po-carrier problems 1–3; po-admin M2–M3; FLOW Frame 23).

**Independent test**: sign in as `operator1@demo.minitms.dev`, land on Mine, read a count equal to the number of rows; switch to Unclaimed and see the earliest-due shipment first; as admin, open Exceptions and compare its count with the Exceptions tab of the seller lists of both demo sellers combined.

**Acceptance scenarios**:

1. **Given** a view tab, **when** it is selected, **then** the URL holds `view=<id>` (or `status=<STATUS>` for a status tab), the page resets to 1 and the table total equals the tab count.
2. **Given** an open view (every view except All, Done and status tabs), **when** its rows are returned, **then** they are ordered by `dueAt` ascending (nulls last), then `createdAt` descending.
3. **Given** a status change over the socket, **when** it arrives, **then** the tab counts refresh through the existing shipment query invalidation.
4. **Given** an operator, **when** they open `/carrier/queue` without a view, **then** Mine is selected; a manager lands on Unclaimed.

---

### User Story 4 - Owners by name (Priority: P1)

Carrier and admin lists show the owner as a chip with initials and a short name ("Ana S."), "You" for the signed-in user, or "Unclaimed". The Mine view hides the Owner column.

**Why this priority**: owners are e-mail addresses today; spec 05 stored `User.name` but left the list field and the chip out of scope (spec 05, Out of Scope).

**Independent test**: as `carrier@demo.minitms.dev`, open the On the road view and read "Ana S." and "Bruno L." in the Owner column; open Mine and see no Owner column.

**Acceptance scenarios**:

1. **Given** an owned shipment whose owner has a name, **when** the row renders, **then** the chip shows the initials and "<first name> <last initial>."; without a name it shows the e-mail.
2. **Given** a shipment owned by the signed-in carrier user, **when** it renders, **then** the chip reads "You".

---

### User Story 5 - Claim next (Priority: P1)

An operator presses "Claim next · 2" and is taken to the most urgent unclaimed shipment, now theirs.

**Why this priority**: it turns the queue into a dispatcher's tool with one click (po-carrier Q1, mini-spec Q1).

**Independent test**: with two unclaimed shipments, press the button twice from two browsers at once and end with two different shipments claimed, or one claimed and one "Nothing left to claim" toast.

**Acceptance scenarios**:

1. **Given** unclaimed shipments, **when** "Claim next" is pressed, **then** the earliest-due one is claimed and its detail page opens with a "Claimed <code>" toast.
2. **Given** a lost race on the first candidate, **when** the API retries, **then** it claims the next candidate (up to 3 tries) before answering `409`.
3. **Given** an Unclaimed count of 0, **when** the queue renders, **then** the button is disabled.

---

### User Story 6 - Peek without leaving the list (Priority: P2)

On a desktop, clicking a row body opens a floating, non-modal sheet on the right with the essentials (code, status, risk, destination, parties, owner, last three journey events) and the role's primary action. `J`/`K` move to the next/previous row with the sheet open; `Enter` opens the full page; `Esc` closes it. The table stays visible and usable.

**Why this priority**: "peek before page" (ux-briefs §0.6, §2.3; decision §10.2); it removes most round trips to a detail page when scanning.

**Independent test**: on `/admin/monitoring`, click a row body, press `J` three times and watch the selected row and the sheet move together; press `Esc` and get focus back on the row's code link; reload with `?peek=<id>` and see the sheet open.

**Acceptance scenarios**:

1. **Given** a row, **when** its body is clicked, **then** the URL gains `peek=<id>`, the row is marked selected and the sheet opens; the code link still navigates to the page.
2. **Given** the sheet open on the last row of the page, **when** `J` is pressed, **then** nothing changes (paging is not crossed).
3. **Given** a viewport below 768 px, **when** a card is tapped, **then** the detail page opens and no peek exists.
4. **Given** a `peek` id that does not resolve, **when** the sheet loads, **then** it shows "Shipment not found" with a close button.

---

### User Story 7 - Act on several shipments (Priority: P2) — seller

A seller ticks rows and a bulk bar replaces the toolbar: "3 selected · Copy tracking links · Cancel 1… · ✕". Cancel lists the ones that cannot be cancelled with the reason.

**Why this priority**: cancelling or sharing a batch takes one action per shipment today (po-seller L7; prototype `SellerShipmentsBulk`).

**Independent test**: select one `PENDING` and two `IN_TRANSIT` shipments, read "2 can't be cancelled: they are already with the carrier", confirm, and see the pending one cancelled and the selection cleared.

**Acceptance scenarios**:

1. **Given** a selection, **when** "Copy tracking links" is pressed, **then** the public tracking URLs, one per line, are copied and a toast reads "Copied <n> tracking links".
2. **Given** a selection with cancellable shipments, **when** cancel is confirmed, **then** each is cancelled through the existing endpoint and the toast reports successes and failures by code.
3. **Given** a page change or a view change, **when** it happens, **then** the selection is cleared.

---

### User Story 8 - Every number is a door (Priority: P2)

On the seller and admin overviews, the count tiles are links to the table filtered to exactly that number.

**Why this priority**: ux-briefs §0.3 and §2.2; the tiles are dead ends today.

**Independent test**: as the demo seller, read the "Needs attention" value, click the tile, and see the Exceptions tab with that many rows.

**Acceptance scenarios**:

1. **Given** a count tile with a drill-down, **when** it is activated, **then** the matching list opens and its total equals the tile value at that moment.
2. **Given** a rate tile ("On time"), **when** it renders, **then** it is not a link.

---

### Edge Cases

- A shipment without `dueAt` (modality without `slaHours`) reads "—", is never late or due soon, and sorts after every dated row in an open view.
- A `DELIVERED` row without `deliveredAt` keeps the spec 05 fallback "Delivered".
- The due-soon threshold for a 24 h Express shipment is 6 h (the 25 % share is also 6 h); for a 72 h Standard shipment, 18 h.
- A row that leaves the current view after a live update (delivered while on Active) disappears on the refetch; the "moved" row state of ux-briefs §2.3 is out of scope.
- `q` with only spaces is dropped from the URL; `q` longer than 100 characters is a `400`.
- City search is case-insensitive and accent-sensitive: "Sao" does not match "São" (shipments have no normalized city column; see Assumptions).
- A search typed while a peek is open keeps the `peek` param only if that row is still on the page; otherwise the sheet closes.
- Claim next while the carrier is not approved: the existing `403`.
- A seller cancels a selection that contains a shipment claimed meanwhile: `ACCEPTED` is still cancellable; a shipment collected meanwhile fails with `409` and is reported by code.
- An owner whose `name` is a single word: the chip shows that word.
- The manager is also an owner: the chip shows "You" for the manager's own rows, as for an operator.

## Functional Requirements *(mandatory)*

### Risk vocabulary (web)

- **FR-001**: `lib/sla.ts` MUST return one `{ kind, label, tone }` per shipment following ux-briefs §2.4 (row phrase column), with kinds `onTrack`, `dueSoon`, `late`, `onTime`, `deliveredLate`, `failed`, `none`, tones `neutral`, `caution`, `critical`, `positive`, and a `mutedCritical` tone for `deliveredLate`. Open means the five statuses `PENDING`, `ACCEPTED`, `COLLECTED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY` (the API's `LATE_CANDIDATES`). The late label changes from "13 h late" to "Late 13 h" (glossary §2.5).
- **FR-002**: An open shipment is due soon when `0 ≤ dueAt − now ≤ max(25 % × (dueAt − createdAt), 6 h)`, late when `now > dueAt`, on track otherwise. `FAILED_DELIVERY` reads "Failed" and `RETURNED` "Returned" (kind `failed`); `CANCELLED` or a missing `dueAt` reads "—".
- **FR-003**: A `RiskBadge` component MUST replace `SlaCell` in every list column, the attention rows of the seller overview and the detail header line, rendering the label with an icon per kind (`dueSoon` clock, `late` and `deliveredLate` alert circle, `onTime` check, `failed` x-circle; `onTrack` and `none` text only), the icon `aria-hidden`, and the tone through existing tokens (`--notice-foreground`, `--destructive`, `--status-delivered-*`, `--muted-foreground`). New risk tokens are not introduced.
- **FR-004**: `lateRowClassName` MUST keep the late tint for open late rows and add a 3 px leading caution bar for due-soon rows.

### List queries (API)

- **FR-005**: A shared helper under `src/modules/shipments/` MUST build the `where` for a view: `active` (open statuses), `exceptions` (`FAILED_DELIVERY`, or open with `dueAt < now`, the same rule as `attentionForSeller`), `done` (`DELIVERED`, `RETURNED`, `CANCELLED`), and for the carrier `mine` (owner is the caller's `CarrierUser`, status not done), `unclaimed` (`PENDING`, no owner), `to_pick_up` (`ACCEPTED`, `COLLECTED`), `on_the_road` (`IN_TRANSIT`, `OUT_FOR_DELIVERY`).
- **FR-006**: `GET /shipments` (web, seller), `GET /shipments/queue` and `GET /admin/shipments` MUST accept `view` (the role's views; any other value is `400`) and `q` (trimmed, 1–100 characters), combined with the existing `status`, `carrierId` and `sellerId` filters by AND. `q` matches case-insensitively when `trackingCode` or `addressCity` contains it, when `addressZipCode` starts with its digits (3 or more digits), and, on the carrier and admin lists, when `seller.companyName` contains it. The `/v1` list (spec 02) keeps `ListShipmentsQueryDto` unchanged; the web seller endpoint uses a DTO that extends it.
- **FR-007**: When a `view` other than `done` is given, rows MUST be ordered by `dueAt` ascending with nulls last, then `createdAt` descending; otherwise the existing `createdAt` descending order stays.
- **FR-008**: `GET /shipments/view-counts` (seller: `active`, `exceptions`, `done`), `GET /shipments/queue/view-counts` (carrier: all six carrier views) and `GET /admin/shipments/view-counts` (admin: `active`, `exceptions`, `done`; accepts `carrierId` and `sellerId` like `status-counts`) MUST return one count per view from the FR-005 helper. Counts ignore `q`.

### Owner names (API and web)

- **FR-009**: `carrierShipmentInclude` MUST select the owner user's `name`; `CarrierShipmentResponseDto` (and so the admin shapes) MUST add `ownerName: string | null`. The seller shapes stay without owner data.
- **FR-010**: An `OwnerChip` MUST render initials (`lib/initials.ts`) and "<first name> <last initial>." from `ownerName`, falling back to `ownerEmail`; "You" when `ownerEmail` equals the session e-mail; "Unclaimed" for a claimable shipment; "—" otherwise. It replaces `ownerLabel` in the carrier and admin Owner columns. The carrier Mine view MUST omit the Owner column (decision §10.3).

### Shared list toolbar (web)

- **FR-011**: `StatusFilterTabs` MUST become `ViewTabs`: each option carries a URL key (`view` or `status`), a value and an optional count shown inside the tab and in its accessible name ("Exceptions, 3"); selecting one sets its key, deletes the other key and the page. The existing horizontal scroll below 768 px stays. Saved custom views ("＋ Save view") are out of scope.
- **FR-012**: `useFilteredPagination` MUST accept free-text keys (validated as strings, not against a value list) so `q` and `peek` live in the URL with the existing replace semantics.
- **FR-013**: A `SearchField` (placeholder per list: "Code, city or zip", "Code, city or seller", "Code, city or seller") MUST write `q` after 300 ms of inactivity, offer a clear button, and focus on `/` when no input has focus.
- **FR-014**: `FilterChips` MUST render one removable chip per active non-default filter (search and every `FilterMenu`) under the toolbar; `FilterToolbar`'s "Clear filters" clears all of them but keeps the view.
- **FR-015**: Seller Shipments MUST replace its Status menu with ViewTabs All · Active · Exceptions · Delivered · Cancelled (All, Delivered and Cancelled from `status-counts`; Active and Exceptions from `view-counts`), and add the search field and chips.
- **FR-016**: Carrier Queue MUST use ViewTabs Mine · Unclaimed · To pick up · On the road · Exceptions · Done from `queue/view-counts` (default Mine for operators, Unclaimed for managers; po-carrier mini-spec Q2), the search field and chips; existing `?status=` links keep working as a filter without a selected tab. The page title becomes "Queue" (glossary §2.5).
- **FR-017**: Admin Monitoring MUST use ViewTabs All · Active · Exceptions · and the nine statuses (counts from `status-counts` and `view-counts`, both narrowed by the carrier and seller menus), default Active, plus the search field and chips; the Status menu is removed.

### Claim next

- **FR-018**: `POST /shipments/queue/claim-next` (carrier roles, approved carrier) MUST select up to 3 `PENDING` unowned shipments of the caller's carrier ordered by `dueAt` ascending nulls last, then `createdAt` ascending, and claim the first that succeeds through the existing `claim` path (same event, actor and live emission), answering `200` with `CarrierShipmentResponseDto`; when none is claimable it MUST answer `409` "No shipment is waiting to be claimed".
- **FR-019**: The queue header MUST show "Claim next · <Unclaimed count>" as its primary button, disabled at 0; on success it shows a toast "Claimed <code>" and navigates to the carrier detail; on `409` it shows "Nothing left to claim" and refetches.

### Peek sheet (web)

- **FR-020**: `PaginatedTable` MUST accept `onRowClick` and `selectedKey`; when `onRowClick` is set and the viewport is 768 px or wider, the stretched row link is limited to the code cell, a click on the rest of the row calls `onRowClick`, and the selected row carries `aria-current="true"` and the selected background; a click that ends a text selection, or lands on a control, does not open the peek.
- **FR-021**: A `PeekSheet` MUST render as a floating panel (440 px, right, below the header, no scrim, `role="dialog"`, `aria-modal="false"`, labelled "<code> preview"), driven by `?peek=<id>`. On open, focus moves to the sheet itself (`tabIndex=-1`); `Esc` (unless typing in a field outside the sheet) or the close button removes `peek` (stepping back over the history entry it pushed) and returns focus to the row's code link, or the table's first link when that row is gone; any filter or page change drops `peek`; `J`/`K` (only while the sheet is open and focus is not in a text input) select the next/previous row of the current page; `Enter` on the sheet opens the full page, while its buttons and links keep their own Enter; each move is announced politely ("<code> preview"). Keyboard users who do not use the peek reach the same data through the code link.
- **FR-022**: Peek content MUST come from the existing detail hooks (`useShipment`, `useQueueShipment`, `useAdminShipment`): header (code, `ShipmentStatusBadge`, `RiskBadge`), destination, carrier and modality (seller) or seller and owner chip (carrier, admin), the last three timeline events, and actions: seller "Copy tracking link"; carrier "Claim" when claimable; admin "Copy link"; all "Open shipment". It reuses `QueryState` for loading, error and not found.
- **FR-023**: Seller Shipments, Carrier Queue and Admin Monitoring MUST wire the peek.

### Seller bulk bar (web)

- **FR-024**: `PaginatedTable` MUST accept an optional selection (`selectedKeys`, `onSelectionChange`) rendering a leading checkbox column (native checkboxes labelled "Select <code>", plus a header "Select all on this page"); cards below 768 px do not show it.
- **FR-025**: With one or more rows selected, Seller Shipments MUST replace the toolbar with a `BulkActionBar`: "<n> selected", "Copy tracking links" (absolute public tracking URLs from `publicTrackingPath`, newline-separated), "Cancel <k>…" (only when `k > 0` cancellable rows, `isCancellableBySeller`) and a clear button. The cancel confirmation (`ConfirmDialog`) states how many cannot be cancelled and why ("already with the carrier"), then calls `PATCH /shipments/:id/cancel` for each cancellable id, at most 4 at a time, and reports the outcome in one toast. Export selected is out of scope.

### KPI links (web)

- **FR-026**: `StatTile` MUST accept `href`; with it the tile is a link (whole card, visible focus ring, an arrow icon on hover and focus).
- **FR-027**: Seller overview: "In progress" → `/seller/shipments?view=active`, "Delivered" → `?status=DELIVERED`, "Needs attention" → `?view=exceptions`; "On time" stays a plain tile. Admin overview: "In progress" → `/admin/monitoring?view=active`, "Delivered" → `?status=DELIVERED`. Tile values and view counts use the same definitions (the seller "In progress" and the admin `IN_PROGRESS` lists equal the open statuses; "Needs attention" equals `exceptions`).

### Docs

- **FR-028**: On completion, `SCREENS.md` Shipments List, Dashboard / Shared Queue and Global Monitoring MUST list the views, search, peek and (seller) bulk actions; `DESIGN.md` §15 MUST describe the urgency order and claim next, and §9 the risk vocabulary helper as the single source of SLA phrases.

### Key Entities

- **`Shipment`** (`schema.prisma`): read only; `dueAt`, `deliveredAt`, `status` and `ownerId` drive views, order and risk. No migration.
- **`User`**: `name` read for `ownerName`.
- **`CarrierUser`**: the `mine` view and claim next resolve the caller's row.
- **`TrackingEvent`**: claim next writes one through the existing claim path.

## Success Criteria *(mandatory)*

- **SC-001**: For every view tab on the three lists, the tab count equals the table total for that view (e2e on each view-counts endpoint against the list `meta.total`).
- **SC-002**: The seller "Needs attention" tile, the seller Exceptions tab and the attention panel counts agree on the demo dataset.
- **SC-003**: In every open view, no row with a later `dueAt` appears above one with an earlier `dueAt` (e2e on the queue).
- **SC-004**: Two parallel claim-next calls never claim the same shipment (e2e).
- **SC-005**: Every risk state is distinguishable without colour: each kind has a distinct label, and every non-neutral kind has an icon (unit test over `slaState` and a `RiskBadge` render test).
- **SC-006**: A `q` sent by a seller never returns another seller's shipment (e2e with two sellers).
- **SC-007**: No pull request of the delivery plan exceeds about 500 changed lines including tests.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/modules/shipments/shipment-views.ts` (new): view enums per role, `viewWhere(view, ctx)`, `searchWhere(q, { includeSeller })`, `isOpenView(view)` for the order (FR-005–FR-007).
  - `dto/list-seller-shipments-query.dto.ts` (new, extends `ListShipmentsQueryDto`), `list-queue-query.dto.ts`, `list-admin-shipments-query.dto.ts` gain `view` and `q`; `dto/view-counts-response.dto.ts` (new, one class per role).
  - `shipments.service.ts`: `findAllForSeller`/`findAllForCarrier`/`findAllForAdmin` take one query object; `findShipmentPage` takes `orderBy`; new `viewCountsForSeller`, `viewCountsForCarrier`, `viewCountsForAdmin`, `claimNext`.
  - `shipments.controller.ts` (`GET view-counts`, `GET queue/view-counts`, `POST queue/claim-next`, the latter two before `queue/:id`), `admin-shipments.controller.ts` (`GET shipments/view-counts` before `shipments/:id`). `public-api.controller.ts` unchanged.
  - `shipment.mappers.ts` + `carrier-shipment-response.dto.ts`: `ownerName`.
- **Web (`apps/web`)**:
  - `src/lib/sla.ts`, `src/components/common/risk-badge.tsx` (replaces `sla-cell.tsx`), `features/shipments/components/shipment-columns.tsx`, `shipment-detail-parts.tsx`, `seller-dashboard.tsx` (FR-001–FR-004).
  - `src/components/common/view-tabs.tsx` (replaces `status-filter-tabs.tsx`; `statusFilterOptions` stays, and the webhook deliveries tabs and `company-approval-table.tsx` move to the new component unchanged in behaviour), `search-field.tsx`, `filter-chips.tsx`, `filter-toolbar.tsx`, `src/hooks/use-filtered-pagination.ts` (FR-011–FR-014).
  - `features/shipments/components/owner-chip.tsx`, `types.ts` (`ownerName`, view types), `api/index.ts` + `keys.ts` (view counts, claim next, all under `shipmentKeys.all` so `invalidateShipmentQueries` covers them), hooks `use-view-counts.ts`, `use-claim-next.ts`.
  - `shipments-table.tsx`, `carrier-queue-table.tsx`, `admin-monitoring-table.tsx` (FR-015–FR-017, FR-019, FR-023, FR-025).
  - `src/components/common/paginated-table.tsx` (FR-020, FR-024), `peek-sheet.tsx` (shell), `features/shipments/components/shipment-peek.tsx` (role content), `bulk-action-bar.tsx`, `use-bulk-cancel.ts`.
  - `src/components/common/stat-tile.tsx`, `features/admin/components/admin-dashboard.tsx` (FR-026–FR-027).
- **Prisma models touched**: `Shipment` (read; write through the existing claim), `User`, `CarrierUser` (read). No migration.
- **Real-time**: no new event or room. Claim next emits through the existing claim path; view counts refresh through the existing invalidation on `shipment:updated`.
- **New dependencies**: none. Icons from `lucide-react`; debounce with a timeout in the search field; the peek is a positioned `aside` (a dialog primitive would add a scrim and a focus trap, which decision §10.2 excludes).
- **Configuration**: none.

## Delivery Plan

Stacked pull requests, merged in order; each passes the verification of the Notes below on its own and leaves every screen working. Sizes are changed lines including tests, estimated against the current code.

| # | Pull request | FRs | Apps | Size | Depends on |
|---|---|---|---|---|---|
| 1 | `risk-badge`: §2.4 vocabulary, thresholds, `RiskBadge` in all current SLA spots, caution bar | FR-001–FR-004 | web | ~300 | — |
| 2 | `list-query-api`: views helper, `view` and `q` on the three lists, urgency order, three view-counts endpoints, e2e | FR-005–FR-008 | api | ~480 | — |
| 3 | `seller-list-toolbar`: `ViewTabs`, `SearchField`, `FilterChips`, free-text URL keys, seller Shipments adoption | FR-011–FR-015 | web | ~450 | 2 |
| 4 | `owner-chip`: `ownerName` on carrier/admin shapes, `OwnerChip` in queue and monitoring | FR-009–FR-010 (without the Mine rule) | api, web | ~220 | — |
| 5 | `queue-views`: carrier views, role default, search, Mine hides Owner, "Queue" title | FR-010 (Mine rule), FR-016 | web | ~250 | 2, 3, 4 |
| 6 | `monitoring-views`: admin tabs (All, Active, Exceptions, statuses), default Active, search | FR-017 | web | ~200 | 2, 3 |
| 7 | `kpi-links`: `StatTile` `href`, seller and admin overview links | FR-026–FR-027 | web | ~150 | 3, 6 |
| 8 | `claim-next`: endpoint with retry, e2e race test, header button | FR-018–FR-019 | api, web | ~330 | 5 |
| 9 | `peek-sheet`: `PaginatedTable` row click, `PeekSheet` shell, `?peek`, J/K/Esc/Enter, seller content | FR-020–FR-022, FR-023 (seller) | web | ~480 | 3 |
| 10 | `peek-carrier-admin`: queue (with Claim) and monitoring peek content | FR-022, FR-023 (carrier, admin) | web | ~260 | 4, 8, 9 |
| 11 | `seller-bulk-bar`: selection column, `BulkActionBar`, copy links, bounded bulk cancel | FR-024–FR-025 | web | ~400 | 3 |
| 12 | `docs`: SCREENS.md and DESIGN.md amendments, Status and Changelog | FR-028 | docs | ~60 | 1–11 |

PRs 1, 2 and 4 have no dependency on each other and can be opened in parallel; 11 only needs 3. If PR 2 exceeds the budget, its admin half (admin `view`/`q` and admin view counts) moves into PR 6.

## Out of Scope

- Manager reassign and release (po-carrier Q6, decision §10.6): it needs a team endpoint with names and active counts, a non-status event so sellers do not receive a false `status_changed` webhook (po-carrier §0), and a rule for releasing an `ACCEPTED` shipment, which the claim model (`PENDING` + no owner) cannot express today. It gets its own spec.
- The At risk state (predicted ETA past due, stalled, signal lost) and its badges; v1 produces no At risk phrase (see Assumptions).
- Search by recipient: `Shipment` has no recipient field (po-seller §0, constraint 12).
- Modality, UF, created-range and owner filters; a sort selector; saved custom views; column chooser; the "moved" row state and "N new" pill; Map view; CSV export and Export selected; the workload popover; keyboard shortcuts other than `/`, `J`, `K`, `Enter`, `Esc` (no `n`, `x`, Space).
- Peek on mobile (a bottom sheet), the SLA strip and ETA in the peek, and webhook counts in the admin peek.
- KPI definition popovers, deltas, sparklines and the `WindowSelector` (§2.2, §2.7).
- Smart defaults and search on the admin Sellers and Carriers lists (§5.6).
- `/v1` list parameters.

## Assumptions and Dependencies

- Based on `feat/foundations-web` (spec 05, PRs #95–#97): `dueAt`, `deliveredAt`, `User.name`, `TrackingEvent.actorId` and `GET /admin/shipments/:id` exist. This spec cannot merge before them.
- At risk without a breach prediction would duplicate Due soon; v1 therefore treats "Due soon" as the only caution state. At risk arrives with the ETA and stall detection of the live-depth phase, where a stage p90 exists to set the stall threshold.
- Carrier views follow the approved prototype and ux-briefs §4.1: Mine · Unclaimed · To pick up · On the road · Exceptions · Done (glossary word "Unclaimed"); "Team" is covered by the stage views, which list every owner.
- The manager lands on Unclaimed (po-carrier Q2); choosing Exceptions when it is non-empty would need the counts first and make the landing tab flicker.
- `q` uses `ILIKE '%…%'` without an index; at demo volume (hundreds of rows per tenant) this is adequate. A trigram index or a normalized city column belongs to a later phase, together with accent-insensitive city search.
- View counts issue one `count` per view (at most six small queries per request), throttled by the existing invalidation; a single grouped query is not needed at this scale.
- The admin default changes from all shipments to Active; deep links with `?status=` or `?view=` keep their meaning, and the admin detail breadcrumb keeps the query string (spec 05 FR-024).

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above, one PR of the Delivery Plan at a time, each on its own branch stacked on the previous one. Stop and re-split a PR that grows past about 500 changed lines.
- Register the static routes (`view-counts`, `queue/view-counts`, `queue/claim-next`, `shipments/view-counts`) before the `:id` routes, or Nest matches them as ids.
- e2e cases: each view against its count, `q` by code prefix, city and zip, the cross-tenant seller case, an unknown `view` (`400`), urgency order, and the parallel claim-next race.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`.
- Record the decisions in `DESIGN.md` (FR-028) and set `Status` here on completion.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-09 | Spec created from the UX briefs (§2.2–§2.5, §3.2, §4.1, §5.2, §9 steps 2 and 4, §10), the PO reports and the approved prototypes; every item verified against `feat/foundations-web`. Manager reassign split out |
