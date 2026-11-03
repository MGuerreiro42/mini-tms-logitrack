# Feature Specification: Live Delivery Map

**Feature**: `live-map` — module `TrackingModule` (extended)
**Created**: 2026-11-03
**Status**: Draft — Not Implemented
**Design reference**: `DESIGN.md` §15 (real-time tracking); `SCREENS.md` § Public → Public Tracking (no full address); spec `01-demo-simulator` (advances shipments when the vehicle arrives)

## Summary

Shipments that are on the road show a vehicle moving on a map along a real street route, on the public tracking page and on the seller's and carrier's shipment detail. The position is derived from the shipment's current stage and how long it has been in it, so every API instance computes the same point without storing or synchronizing positions.

## User Stories *(mandatory)*

### User Story 1 - Watch the delivery move (Priority: P1)

A customer opens a public tracking link for a shipment that is in transit and sees a map with the route, the vehicle moving along it and the destination city. The marker moves smoothly without a refresh.

**Why this priority**: the most visible expression of the real-time core, and the screen a non-technical visitor understands at once.

**Independent test**: open `/track/<code>` for an `IN_TRANSIT` demo shipment, keep it open for 30 s, and confirm the marker advances along the drawn route.

**Acceptance scenarios**:

1. **Given** a shipment in `IN_TRANSIT` or `OUT_FOR_DELIVERY`, **when** the tracking page is open, **then** the map shows the full route, the traveled part in a distinct style, and the vehicle at its current position, updated every 2 s.
2. **Given** a shipment in any other status, **when** the tracking page is open, **then** no vehicle is shown; `DELIVERED` shows the route fully traveled with the marker at the destination, other statuses show no map.
3. **Given** the public page, **when** the map renders, **then** the destination is a city-level point and no street-level address is exposed in the payload or the UI.

---

### User Story 2 - Arrival drives the next status (Priority: P2)

In the demo, a vehicle that reaches the end of its stage is advanced by the simulator to the next status, so the map and the timeline tell the same story.

**Why this priority**: without it, seeded shipments sit at 100% of the route for hours, which reads as broken.

**Independent test**: with the simulator on, watch an `OUT_FOR_DELIVERY` shipment reach the destination and confirm it becomes `DELIVERED` (or `FAILED_DELIVERY`) within one tick.

**Acceptance scenarios**:

1. **Given** a demo shipment whose stage progress is 1, **when** a simulator tick runs, **then** that shipment is preferred for advancing over shipments with lower progress.
2. **Given** a demo shipment whose stage progress is below 1, **when** a tick runs, **then** the simulator does not advance it past `IN_TRANSIT` or `OUT_FOR_DELIVERY`.

---

### User Story 3 - Map on the internal detail screens (Priority: P2)

The seller's and the carrier's shipment detail show the same map, with the exact destination address pinned.

**Why this priority**: reuses the same component and stream; adds context for authenticated users.

**Independent test**: open the seller detail of an `IN_TRANSIT` shipment and confirm the map and the moving marker.

**Acceptance scenarios**:

1. **Given** an authenticated seller or carrier with access to the shipment, **when** the detail opens, **then** the map shows the street-level destination and the same live position as the public page.

---

### Edge Cases

- The map library or tiles fail to load: the timeline renders as today and the map area shows a short message; no error boundary is triggered.
- The socket disconnects: the marker stops at its last position and the existing live indicator shows the reconnecting state; on reconnect the position jumps to the current point.
- `prefers-reduced-motion`: the marker moves in discrete steps every 2 s with no interpolation.
- A shipment created outside the demo with a city that has no stored route: no map is shown for it.
- The stage changes while the page is open (e.g., `IN_TRANSIT` → `OUT_FOR_DELIVERY`): the route segment and progress switch on the next position event.

## Functional Requirements *(mandatory)*

- **FR-001**: The system MUST store, as versioned static data in the API, one street route per demo destination city from a single demo hub, simplified to at most 300 points.
- **FR-002**: Each route MUST be split into an `IN_TRANSIT` segment (hub to the destination city's outskirts) and an `OUT_FOR_DELIVERY` segment (outskirts to the destination), with the split point stored with the route.
- **FR-003**: Position MUST be computed as `progress = clamp((now − stageStartedAt) / stageDuration, 0, 1)` along the current segment, where `stageStartedAt` is the `createdAt` of the shipment's latest `TrackingEvent` and `stageDuration` is 4 minutes for `IN_TRANSIT` and 2 minutes for `OUT_FOR_DELIVERY`.
- **FR-004**: Every API instance MUST emit `tracking:position` every 2 s, only to rooms of shipments in `IN_TRANSIT` or `OUT_FOR_DELIVERY` that have at least one socket on that instance, using instance-local emission.
- **FR-005**: The `tracking:position` payload MUST be `{ trackingCode, status, lat, lng, heading, progress, at }`. On the public namespace no other location data is sent.
- **FR-006**: The public tracking response MUST include the route geometry and the destination city coordinates; the authenticated detail responses MUST include the route geometry and the destination address coordinates.
- **FR-007**: The simulator (spec 01, FR-005) MUST rank `IN_TRANSIT` and `OUT_FOR_DELIVERY` shipments by progress and MUST only advance them when progress is 1.
- **FR-008**: The web map MUST load lazily, only on pages that show it, and MUST NOT increase the size of the initial bundle of any other route.
- **FR-009**: The web map MUST interpolate the marker between position events with `requestAnimationFrame`, except under `prefers-reduced-motion` (Edge Cases).
- **FR-010**: The map MUST follow the app theme: light and dark basemap styles switched with the existing theme.

### Key Entities

- No new Prisma model. Routes are static data files committed with the API.
- **`TrackingEvent`** (`schema.prisma`): its latest `createdAt` defines `stageStartedAt`.

## Success Criteria *(mandatory)*

- **SC-001**: Two clients on different API instances watching the same shipment see positions that differ by no more than one emission interval.
- **SC-002**: The tracking page's initial JavaScript for users who never see a map is unchanged (±2 KB) compared to before the feature.
- **SC-003**: The public tracking payload and socket messages contain no street, number, neighborhood or zip code, verified by a test over the response shape.
- **SC-004**: Marker movement renders at 60 fps on a mid-range phone during interpolation.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/modules/tracking/routes/`: route data (one JSON per city with `points`, `splitIndex`, `destination`) and a `routes.ts` loader keyed by city.
  - `src/modules/tracking/vehicle-position.ts`: pure function implementing FR-003 (position, heading, progress), unit tested.
  - `src/modules/tracking/position-broadcaster.ts`: 2 s interval per instance over local rooms (FR-004), using `server.local`.
  - `ShipmentsService.findPublicByTrackingCode` and the detail mappers: add `route` and destination coordinates (FR-006).
  - `scripts/fetch-demo-routes.ts`: one-off developer script that requests the routes from the public OSRM demo server, simplifies them (Douglas–Peucker) and writes the JSON files. Not run at runtime or in CI.
- **Simulator**: `simulator.service.ts` reads `vehicle-position.ts` to rank and gate road stages (FR-007).
- **Web (`apps/web`)**: new `src/features/tracking/components/delivery-map.tsx`, loaded with `next/dynamic` (`ssr: false`), used by the public tracking page and both shipment details; a hook subscribing to `tracking:position` on the existing socket clients.
- **Prisma models touched**: `TrackingEvent` (read). No migration.
- **Real-time**: new server-to-client event `tracking:position` on `/` (shipment room) and `/public` (tracking room).
- **New dependencies**: `maplibre-gl` in `apps/web` (vector maps, no API key, theme-able styles). Basemap tiles from OpenFreeMap (free, no key). No new API dependency; Douglas–Peucker is a short local function in the script.
- **Configuration**: none new. Basemap style URLs (OpenFreeMap light and dark) are constants in the map component.

## Out of Scope

- Real GPS input, carrier hubs per carrier, route optimization and ETA prediction (`DESIGN.md` §7).
- Geocoding arbitrary addresses; only the demo cities have routes.
- Maps on list screens (queue, shipment lists, admin monitoring).

## Assumptions and Dependencies

- Depends on spec 01 for advancing shipments at arrival; without the simulator, positions still render and stop at the end of the segment.
- The demo hub is a fixed coordinate in Greater São Paulo, shared by every demo route.
- OpenFreeMap is assumed to offer a dark style usable for FR-010; verify at implementation time, and if it doesn't, derive a dark variant from its light style JSON.
- The demo destination cities are the ones in the seed's `ADDRESSES`; adding a city requires running the route script and committing its file.

## Notes for the AI Agent

- Before coding: changing the public tracking response shape (FR-006) touches a public contract; validate the payload with the user first.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`.
- Record the "position derived from stage time, no stored state" decision in `DESIGN.md`.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created |
