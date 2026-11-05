# Feature Specification: Live Delivery Map

**Feature**: `live-map` — modules `ShipmentsModule` and `TrackingModule` (extended), `SimulatorModule` (driver)
**Created**: 2026-11-03
**Status**: In progress — API implemented, web map pending
**Design reference**: `DESIGN.md` §15 (real-time tracking); `SCREENS.md` § Public → Public Tracking (no full address); spec `01-demo-simulator` (the simulator plays the driver)

## Summary

Shipments on the road show a vehicle moving on a map along a real street route. Positions arrive the way they would from a driver's phone: the carrier reports GPS pings to an ingestion endpoint, the API keeps the latest one in Redis and fans it out over the existing Socket.IO rooms. In the demo, the simulator plays the driver, reporting a point along the route every 2 s while someone is watching. The public tracking link hides the last mile, as real carriers do: the route and the vehicle stop at the destination city, and street-level positions are only shown to the seller and the carrier.

## User Stories *(mandatory)*

### User Story 1 - Watch the delivery move (Priority: P1)

A customer opens a public tracking link for a shipment in transit and sees a map with the route to their city and the vehicle moving along it, without a refresh. Once the shipment is out for delivery, the page shows the city and "Out for delivery in <city>", without the vehicle's position.

**Why this priority**: the most visible expression of the real-time core, and the screen a non-technical visitor understands at once.

**Independent test**: open `/track/<code>` for an `IN_TRANSIT` demo shipment with the simulator on, keep it open for 30 s, and confirm the marker advances along the drawn route.

**Acceptance scenarios**:

1. **Given** a shipment in `IN_TRANSIT` with a route, **when** the public page is open, **then** the map shows the route up to the destination city, the traveled part in a distinct style, and the vehicle at its latest reported position, moving smoothly between pings.
2. **Given** a shipment in `OUT_FOR_DELIVERY`, **when** the public page is open, **then** the map shows the destination city area and the text "Out for delivery in <city>"; no position is sent to the public namespace.
3. **Given** a `DELIVERED` shipment, **when** the public page is open, **then** the map shows the route to the city fully traveled and no vehicle; other statuses show no map.
4. **Given** the public page, **when** the map renders, **then** neither the payload nor the socket messages contain a street, number, neighborhood, zip code, or any coordinate inside the last mile.

---

### User Story 2 - The carrier reports positions (Priority: P1)

A carrier operator's device (in the demo, the simulator) reports the vehicle's position for a shipment it owns. The API validates who is reporting and for which shipment, keeps the latest position and broadcasts it.

**Why this priority**: this is the ingestion pipeline the feature exists to show; the map only renders what arrives here.

**Independent test**: as the operator who owns an `IN_TRANSIT` shipment, `POST /shipments/:id/positions` twice with increasing `recordedAt` and confirm the seller detail receives both; send an older ping and confirm the marker does not move back.

**Acceptance scenarios**:

1. **Given** the operator who owns the shipment or the carrier manager, **when** they report a valid position for a shipment in `IN_TRANSIT` or `OUT_FOR_DELIVERY`, **then** it is stored as the latest position and broadcast within the same request.
2. **Given** a ping whose `recordedAt` is older than the stored one, **when** it arrives, **then** it is accepted but not applied (devices resend after reconnecting; order is not guaranteed).
3. **Given** any other user, another carrier's shipment, or a shipment in any other status, **when** a position is reported, **then** it is rejected (`403`/`404` as the shipment routes already answer, `409` for the status).
4. **Given** no ping for a while, **when** the detail is open, **then** the map shows "Last signal Xs ago" after 10 s and greys the marker after 30 s.

---

### User Story 3 - Arrival drives the next status (Priority: P2)

In the demo, the simulator drives each road stage from start to end and only advances the shipment once the vehicle arrives, so the map and the timeline tell the same story.

**Why this priority**: without it, seeded shipments sit at the end of the route for hours, which reads as broken.

**Independent test**: with the simulator on, watch an `OUT_FOR_DELIVERY` shipment on the seller detail reach the destination and confirm it becomes `DELIVERED` (or `FAILED_DELIVERY`) within one tick.

**Acceptance scenarios**:

1. **Given** a demo shipment in a road stage, **when** the driver job runs, **then** it reports the point at `progress = clamp((now − stageStartedAt) / stageDuration, 0, 1)` along the stage's segment, where `stageStartedAt` is the `createdAt` of the latest `TrackingEvent` and `stageDuration` is 4 minutes for `IN_TRANSIT` and 2 minutes for `OUT_FOR_DELIVERY`.
2. **Given** demo shipments in road stages, **when** a simulator tick picks one to advance, **then** it only picks among those at `progress = 1`, preferring the one that arrived first.

---

### User Story 4 - Exact map on the internal detail screens (Priority: P2)

The seller's and the carrier's shipment detail show the full route to the door, the destination pinned at the geocoded address, and the live position in both road stages.

**Why this priority**: reuses the component and the stream; the street-level view is what the people who own the shipment need.

**Independent test**: open the seller detail of an `OUT_FOR_DELIVERY` demo shipment and confirm the full route, the address pin and the moving marker.

**Acceptance scenarios**:

1. **Given** an authenticated seller or carrier with access to the shipment, **when** the detail opens, **then** the map shows the full route, the destination at the address coordinates, and the latest position, live in both road stages.

---

### Edge Cases

- The map library or tiles fail to load: the timeline renders as today and the map area shows a short message; no error boundary is triggered.
- The socket disconnects: the marker stops at its last position and the existing live indicator shows the reconnecting state; on reconnect the latest stored position is fetched with the detail.
- `prefers-reduced-motion`: the marker jumps to each new position with no interpolation.
- A shipment whose address has no stored route (created outside the demo): no route is drawn; the internal detail still shows reported positions as a marker on the map, the public page shows no map.
- The status changes while the page is open (e.g., `IN_TRANSIT` → `OUT_FOR_DELIVERY`): the internal map switches segment; the public map stops showing the vehicle and shows the city text.
- A ping with `recordedAt` more than 5 s in the future or more than 10 min in the past is rejected with `400`.
- A ping within 1.5 km of the destination while still `IN_TRANSIT` (the route's city entry can sit close to the address): it is broadcast to the internal rooms only; the public room and the public response never show a position that close to the door.
- The stored position outlives the stage: it expires 10 minutes after the last ping and is never returned for a shipment outside the road stages.

## Functional Requirements *(mandatory)*

- **FR-001**: The system MUST store, as versioned static data in the API, one street route per demo destination address from a single demo hub, simplified to at most 300 points, with the index where the destination city starts (`splitIndex`), the city center and the geocoded address.
- **FR-002**: Routes MUST be produced by a developer script that geocodes the demo addresses and city centers once (Nominatim) and requests the routes once (OSRM), respecting both services' usage policies; nothing calls them at runtime or in CI.
- **FR-003**: `POST /shipments/:id/positions` MUST accept `{ lat, lng, heading?, recordedAt }` from the operator who owns the shipment or the carrier manager of an approved carrier, only for shipments in `IN_TRANSIT` or `OUT_FOR_DELIVERY`, validating coordinate ranges and the `recordedAt` window (Edge Cases), rate limited per user.
- **FR-004**: The latest position per shipment MUST be stored in Redis with a set-if-newer atomic write keyed by `recordedAt` and a 10-minute expiry; the response is `202` with `{ applied: boolean }`.
- **FR-005**: An applied position MUST be broadcast as `tracking:position` to the shipment, seller and carrier rooms with `{ shipmentId, trackingCode, status, lat, lng, heading, recordedAt }`, and to the public tracking room with `{ trackingCode, lat, lng, heading, recordedAt }` only while the shipment is `IN_TRANSIT`, has a stored route, and the position is at least 1.5 km (haversine) from the route's destination.
- **FR-006**: The authenticated detail responses MUST include `map: { route, splitIndex, destination } | null` (full route, address coordinates) and `lastPosition: { lat, lng, heading, recordedAt } | null`.
- **FR-007**: The public tracking response MUST include `map: { route, city, cityCenter } | null` with the route cut at `splitIndex` and `cityCenter` rounded to 2 decimal places, and `lastPosition` only while `IN_TRANSIT` and under the same 1.5 km rule as FR-005. A test MUST assert the public response and socket payloads carry no street-level field or last-mile coordinate.
- **FR-008**: The simulator MUST run a `drive` job every 2 s while someone is watching (same viewer check as the tick) that reports, as the owning demo operator and through the same service method as the endpoint, the position of every demo shipment in a road stage (User Story 3).
- **FR-009**: The simulator tick MUST only advance road-stage shipments at `progress = 1` (User Story 3, scenario 2).
- **FR-010**: The web map MUST load lazily, only on pages that show it, and MUST NOT increase the initial bundle of any other route.
- **FR-011**: The web map MUST interpolate the marker between pings with `requestAnimationFrame`, except under `prefers-reduced-motion`, and MUST follow the app theme with light and dark basemap styles.

### Key Entities

- No new Prisma model. Routes are static data files committed with the API; the latest position lives in Redis with an expiry.
- **`TrackingEvent`** (`schema.prisma`): its latest `createdAt` defines `stageStartedAt` for the simulated driver.

## Success Criteria *(mandatory)*

- **SC-001**: Two clients on different API instances watching the same shipment receive the same pings, within 1 s of each other.
- **SC-002**: The initial JavaScript of routes without a map is unchanged (±2 KB) compared to before the feature.
- **SC-003**: The public tracking payload and socket messages contain no street, number, neighborhood, zip code, address coordinates or `OUT_FOR_DELIVERY` positions, verified by tests over the response shape and the public emits.
- **SC-004**: A ping older than the stored one never moves the marker back, verified by a test on the set-if-newer write.
- **SC-005**: Marker movement renders at 60 fps on a mid-range phone during interpolation.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**:
  - `src/modules/shipments/routes/`: one JSON per demo address (`points`, `splitIndex`, `destination`, `city`, `cityCenter`) and a `routes.ts` loader keyed by the normalized address.
  - `src/modules/shipments/route-geometry.ts`: pure functions for the point and heading at a progress along a segment, and the public cut of a route; unit tested.
  - `src/modules/shipments/vehicle-positions.ts`: Redis store with the set-if-newer write (a short Lua script) and expiry.
  - `ShipmentsController` + `ShipmentsService.reportPosition`: the ingestion endpoint (FR-003), reusing the carrier ownership checks of `updateStatus`; emits `VEHICLE_POSITION_REPORTED`.
  - Detail and public mappers: `map` and `lastPosition` (FR-006, FR-007).
  - `TrackingListener`: broadcasts `tracking:position` with the internal and public payloads (FR-005).
  - `scripts/build-demo-routes.ts`: developer script (FR-002), with Douglas–Peucker simplification as a short local function.
- **Simulator**: `drive` job scheduler on the demo queue (FR-008); the tick ranks and gates road stages by progress (FR-009).
- **Web (`apps/web`)**: `src/features/tracking/components/delivery-map.tsx` loaded with `next/dynamic` (`ssr: false`), used by the public tracking page and both shipment details; a hook subscribing to `tracking:position` on the existing socket clients; stale-signal state.
- **Prisma models touched**: `TrackingEvent` (read). No migration.
- **Real-time**: new server-to-client event `tracking:position` on `/` (shipment, seller and carrier rooms) and `/public` (tracking room, `IN_TRANSIT` only). Positions go through the Redis adapter like every other emit, so any instance can ingest and every instance delivers.
- **New dependencies**: `maplibre-gl` in `apps/web` (vector maps, no API key, theme-able styles); basemap tiles from OpenFreeMap (free, no key). No new API dependency.
- **Configuration**: none new. Basemap style URLs are constants in the map component.

## Out of Scope

- Geocoding or routing arbitrary addresses at runtime; only the demo addresses have routes.
- A real driver app, ETA prediction, route optimization and per-carrier hubs (`DESIGN.md` §7).
- Position history (only the latest position is kept).
- Maps on list screens (queue, shipment lists, admin monitoring).

## Assumptions and Dependencies

- Depends on spec 01 for the simulator; without it, positions only come from the endpoint.
- The demo hub is a fixed coordinate in Greater São Paulo, shared by every demo route.
- OpenFreeMap is assumed to offer a dark style usable for FR-011; verify at implementation time, and if it doesn't, derive a dark variant from its light style JSON.
- Adding a demo address requires running the route script and committing its file.

## Notes for the AI Agent

- The public and internal payloads above were validated with the user; do not widen the public one.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`.
- Record in `DESIGN.md`: positions ingested like GPS and kept as latest-only state in Redis, the last-mile privacy rule, and the simulator as the driver.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created |
| 2026-11-04 | Rewritten: simulated GPS ingestion instead of derived positions, demo addresses geocoded once, last mile hidden from the public link |
| 2026-11-04 | `recordedAt` future limit lowered to 5 s; public positions also hidden within 1.5 km of the destination |
| 2026-11-04 | API implemented: routes, ingestion, broadcast, detail and public fields, simulator driver |
