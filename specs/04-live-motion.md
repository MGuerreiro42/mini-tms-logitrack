# Feature Specification: Live Motion

**Feature**: `live-motion` — `apps/web` (shared motion primitives) plus one seller endpoint in `ShipmentsModule`
**Created**: 2026-11-03
**Status**: Draft — Not Implemented
**Design reference**: `DESIGN.md` §9 (frontend architecture), §15 (real-time tracking); `SCREENS.md` (seller overview, carrier queue, admin monitoring, public tracking); spec `01-demo-simulator` (event source)

## Summary

Motion that makes live data legible: a feed that says what just happened, a brief highlight on whatever a live event changed, progress that visibly advances on tracking pages, and calm transitions between pages. Every animation answers "what changed?" for a change that arrived over the socket; nothing animates on first load, on a refetch that changes nothing, or for decoration.

## User Stories *(mandatory)*

### User Story 1 - See what just happened (Priority: P1)

A seller on the overview sees a "Recent updates" feed. When a shipment changes status, a line such as "TMS-DE…038 · Collected · Sorocaba · just now" enters at the top, marked as new for a few seconds, and links to the shipment.

**Why this priority**: the overview refreshes on every event today, but nothing tells the user what changed. With the demo simulator producing an event every ~10 s, this is where the real-time core becomes visible.

**Independent test**: with the simulator on, open the seller overview, wait without interacting, and confirm a new line enters the feed with its status, city and relative time, and that reloading the page shows the same lines without animating them.

**Acceptance scenarios**:

1. **Given** the overview is open, **when** a status change of one of the seller's shipments arrives, **then** a line for that event enters at the top of the feed and stays marked as new for 3 s.
2. **Given** the page is loaded or reloaded, **when** the feed first renders, **then** its lines appear without any entrance animation.
3. **Given** the pointer rests on the feed (on devices with hover), focus is inside it, or the user paused it, **when** events arrive, **then** they are held, a "N new" button appears above the list without moving it, and activating it (or leaving the feed, or resuming) applies them.
4. **Given** the socket reconnects or the tab returns from the background, **when** the feed catches up on several events at once, **then** they are applied without entrance animations.

---

### User Story 2 - Notice what changed on the dashboard and in tables (Priority: P1)

A stat tile whose number changes because of a live event glows briefly while the new value fades in. In the carrier queue and in admin monitoring, a row whose status changed is highlighted for a moment and its status badge fades into the new value. Rows never move or resize because of it.

**Why this priority**: numbers that change silently read as noise or as a bug; a brief, consistent highlight ties each change to its cause.

**Independent test**: with the simulator on, keep the seller overview and the carrier queue open; confirm the tile whose count changed glows once and the changed row is highlighted, and that changing page or filter highlights nothing.

**Acceptance scenarios**:

1. **Given** a tile's value changes after a live refetch, **when** it re-renders, **then** the tile glows once and the value fades in.
2. **Given** a refetch returns the same value, or the screen was just opened, **when** it renders, **then** nothing glows.
3. **Given** a table row present in the previous render changes status, **when** the table re-renders, **then** that row is highlighted once and its badge fades in; rows that changed page, filter or sort are never highlighted.

---

### User Story 3 - Watch a delivery advance (Priority: P2)

On the public tracking page and on the shipment detail pages, a status change fills the stepper connector up to the new step, the new current step pops slightly, the new timeline entry fades in, and the status word fades into its new value. Screen readers hear the new status once.

**Why this priority**: the tracking page is read by non-technical recipients; visible progress is the clearest real-time signal there.

**Independent test**: open `/track/<code>` for a demo shipment in progress and wait for the simulator to advance it; confirm the stepper, timeline and status word animate once and the page title stays in sync.

**Acceptance scenarios**:

1. **Given** a tracking page is open, **when** the shipment advances, **then** the connector fills to the new step, the step marker pops once, the new timeline item fades in, and the status is announced once.
2. **Given** the page is opened on a shipment already in progress, **when** it renders, **then** nothing animates.

---

### User Story 4 - Know the feed is live, and move between pages calmly (Priority: P3)

The live indicator shows a steady dot, flashes once when an event arrives, and shows "Updated Xs ago". It says "Reconnecting…" only after a drop lasting over a second. Moving between pages crossfades the main content briefly; the navigation stays put and focus moves to the new page heading.

**Why this priority**: polish; the information is already present without it.

**Independent test**: disconnect the network for 2 s and reconnect, and navigate between two signed-in pages; confirm the indicator states and a single short crossfade.

**Acceptance scenarios**:

1. **Given** the socket drops for under 1 s, **when** it reconnects, **then** the indicator never shows "Reconnecting…".
2. **Given** a link to another page is followed, **when** the page changes, **then** only the main content crossfades and focus lands on the new heading; browser back/forward keeps the browser's focus behavior.

---

### Edge Cases

- `prefers-reduced-motion: reduce`: no translate, scale, pop, glow or crossfade, including view transitions; the feed's "new" mark (background tint plus visible text) and the indicator's text still convey every change.
- The tab is hidden: nothing animates; on return, changes are applied silently (US1 scenario 4).
- Several events within 600 ms: applied as one batch; at most 3 feed lines animate per batch, the rest appear without animation.
- A value changes again while its highlight is running: the value updates; the highlight does not restart within 600 ms.
- A seller with no events yet: the feed shows an empty state and the "View all shipments" link.
- Touch devices: holding arrivals by hover does not apply (no `hover: hover`); pause and focus still hold them.
- A row leaves the active filter after its status changes: it disappears on refetch, as today.

## Functional Requirements *(mandatory)*

### Foundation

- **FR-001**: The web theme MUST define motion tokens in `globals.css` `@theme` and every animation in this spec MUST use them: `--duration-fast` 150 ms, `--duration-base` 200 ms, `--duration-slow` 400 ms, `--duration-glow` 1200 ms, `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-standard` `cubic-bezier(0.4, 0, 0.2, 1)`.
- **FR-002**: Keyframes MUST have the final visual state as the element's base style, so disabling animations never hides or misplaces content.
- **FR-003**: The global reduced-motion rule MUST also cover `::view-transition-group(*)`, `::view-transition-old(*)` and `::view-transition-new(*)`.
- **FR-004**: A shared `useChangeSignal(value)` hook MUST return a signal that changes only when `value` differs from its previous render value: never on mount, never for an equal value, and at most once per 600 ms (leading edge; changes inside the window update the value without a new signal). Highlights MUST attach to an `aria-hidden` element (or pseudo-element) keyed by the signal, never remount the content.
- **FR-005**: No entrance or highlight animation MUST run while `document.visibilityState` is `hidden`.

### Feed

- **FR-006**: The API MUST expose `GET /shipments/activity` (`SELLER` only, `limit` default 8, max 20) returning the latest `TrackingEvent`s of the caller's own shipments, newest first: event id, shipment id, tracking code, status, destination city, `createdAt`. Ownership MUST be enforced in the query, as for every seller route.
- **FR-007**: The activity query MUST be part of `invalidateShipmentQueries`, so the existing throttled `shipment:updated` handler refetches it.
- **FR-008**: The feed MUST animate only event ids not rendered since the component mounted; the set of seen ids MUST reset when the session changes. A refetch bringing more than 3 unseen events MUST apply them without animation.
- **FR-009**: A new line MUST enter with opacity 0→1 and `translateY(-8px)`→0 over `--duration-base` with `--ease-out`, and carry a "new" mark (background tint plus visible text) for 3 s, removed by a timer cleared on unmount.
- **FR-010**: The feed MUST be a `role="log"` list. A pause toggle (`aria-pressed`, discreet) MUST hold arrivals (WCAG 2.2.2). Arrivals MUST also be held while focus is inside the feed and, on `(hover: hover)` devices, while the pointer is over it. Held arrivals MUST show a "N new" button outside the log, in reserved space, that applies them; leaving the feed or resuming also applies them.
- **FR-011**: Relative times ("just now", "2 min ago") MUST update through the existing `useNow`, without animation.
- **FR-012**: The seller overview MUST show the feed in place of "Recent shipments", keeping the "View all shipments" link and an empty state.

### Highlights

- **FR-013**: `StatTile` MUST, on a change signal, show the new value with opacity 0.4→1 and `translateY(2px)`→0 over `--duration-fast`, and a glow overlay (`--live-halo`, opacity rise over 100 ms, decay to 0 by `--duration-glow`). The glow colour is the same for every tile and direction.
- **FR-014**: The carrier queue and admin monitoring tables MUST highlight a row whose status differs from its status in the previous render of the same page, filter and sort (a `Map<id, status>` reset on any of those changes), by animating the row background from `--live-halo` to transparent over `--duration-glow`. Rows MUST NOT reorder, resize or shift because of it.
- **FR-015**: The status badge MUST fade in its new value (opacity 0→1 over `--duration-fast`) when its status changes in place.

### Tracking pages

- **FR-016**: The shipment stepper MUST, when the reached step increases, fill the connector with `scaleX` 0→1 (`transform-origin: left`) over `--duration-slow` with `--ease-out`, and pop the new current marker (scale 1→1.08→1 over 250 ms).
- **FR-017**: A new timeline item MUST fade and slide 8 px in over `--duration-base`; the status word MUST fade in over `--duration-fast`.
- **FR-018**: The public tracking page MUST announce a status change once through a polite live region.

### Indicator and navigation

- **FR-019**: `LiveIndicator` MUST show a steady dot while live, flash its halo once (600 ms) per received event, show "Updated Xs ago" (via `useNow`), and show "Reconnecting…" only after the `connecting` state has lasted 1 s following a live period.
- **FR-020**: Route changes MUST crossfade the main content of the signed-in shell and of public pages with React `<ViewTransition>` over `--duration-fast`; the navigation bar MUST NOT take part (`default="none"` outside the content). Same-route changes (filters, tabs, pagination) MUST NOT transition.
- **FR-021**: After a link navigation, focus MUST move to the new page's `<h1>` (`tabIndex={-1}`); back/forward navigations keep the browser's behavior.

### Key Entities

- **`TrackingEvent`** (`schema.prisma`): read by the activity endpoint through its `Shipment` (`sellerId`). No new model, no migration.

## Success Criteria *(mandatory)*

- **SC-001**: Over 5 minutes with the simulator on, every status change of the seller's shipments appears in the feed, and no line animates after a reload.
- **SC-002**: Opening any screen, paginating or filtering produces zero highlights.
- **SC-003**: With `prefers-reduced-motion: reduce`, no element moves or scales during 5 minutes of live updates and navigations, and every change remains identifiable from text.
- **SC-004**: All animations touch only `opacity`, `transform` or a single row's `background-color`; a performance trace of a live update shows no layout shift attributable to them.
- **SC-005**: The shared JavaScript of signed-in routes grows by less than 5 KB (no animation library).

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**: `ShipmentsController` `GET /shipments/activity` with `@Auth(GlobalRole.SELLER)`; `ShipmentsService.activityForSeller(userId, limit)` reading `TrackingEvent` filtered by `shipment.sellerId`, ordered by `createdAt desc`; a response DTO mapped explicitly. The existing `[shipmentId, createdAt]` index serves the per-shipment sort; volumes are small for one seller.
- **Web (`apps/web`)**:
  - `app/globals.css`: motion tokens, keyframes, the reduced-motion extension (FR-001–FR-003).
  - `hooks/use-change-signal.ts` (FR-004).
  - `features/shipments/components/activity-feed.tsx`, `api` + `hooks` for the activity query, and its key in `lib/invalidate-shipment-queries.ts`.
  - `components/common/stat-tile.tsx`, `live-indicator.tsx`, `shipment-stepper.tsx`, the status badge, and the carrier/admin table row rendering.
  - The signed-in app shell and `public-page.tsx` for `<ViewTransition>` and heading focus.
- **Prisma models touched**: `TrackingEvent`, `Shipment` (read).
- **Real-time**: no new event; the existing `shipment:updated` and `tracking:updated` drive everything.
- **New dependencies**: none. CSS keyframes, `tw-animate-css` (already imported) and React 19.3's stable `<ViewTransition>` cover every item.
- **Configuration**: none.

## Out of Scope

- Count-up or rolling numbers, page slides, confetti, animated list reordering, infinite pulses beyond the live dot, staggered first-load entrances, skeleton crossfades.
- A feed for carriers and admins; direction-coloured glows (e.g. warning colour when "Needs attention" rises); tab-title or favicon counters.
- Keeping a row that left the active filter visible until a manual refresh.

## Assumptions and Dependencies

- Events come from spec 01's simulator in the demo and from human actions elsewhere; both already write `TrackingEvent` rows and emit `shipment:updated`.
- `QueryState` keeps the rendered view mounted while refetching (it renders children whenever data exists), so change detection keeps its previous values.
- Browsers without the View Transitions API navigate without the crossfade.

## Notes for the AI Agent

- Before coding: the activity endpoint is a new public contract; validate its response shape with the user first.
- Implement only what's listed in the Functional Requirements above.
- Overlays and marks added for motion carry no text except the feed's "new" mark, so existing `getByText` tests keep working; update `seller-dashboard.test.tsx` for the feed.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus a manual pass with reduced motion enabled.
- Record the motion principles (tokens, "animate only live changes", reduced motion) in `DESIGN.md` §9.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created from two UI/UX research passes (product references and the repo's animation/accessibility skills), each critiqued once |
