# Feature Specification: Public API and Webhooks for Sellers

**Feature**: `public-api-webhooks` — module `IntegrationsModule`
**Created**: 2026-11-03
**Status**: Draft — Not Implemented
**Design reference**: `DESIGN.md` §11 (auth and authorization), §14 (shipments), §15 (real-time); spec `01-demo-simulator` (event source in the demo)

## Summary

Sellers integrate their own systems with the platform: an API key creates and reads shipments without a browser session, and a webhook endpoint receives a signed HTTP request on every status change, with retries and a delivery log. A built-in test receiver lets a visitor watch deliveries arrive, and fail on purpose, without hosting anything.

## User Stories *(mandatory)*

### User Story 1 - Receive signed status updates (Priority: P1)

A seller registers a webhook URL and, from then on, receives a `POST` for each event on their shipments. Each request is signed with the endpoint's secret so the receiver can verify it came from the platform and was not replayed.

**Why this priority**: push integration is how marketplaces and ERPs consume a TMS; it is the part of this feature with no equivalent in the current product.

**Independent test**: register the built-in test receiver as the endpoint, advance one of the seller's shipments, and confirm one delivery arrives with a valid signature over the exact body, and the log records it as succeeded.

**Acceptance scenarios**:

1. **Given** an active endpoint subscribed to `shipment.status_changed`, **when** a shipment of that seller changes status, **then** one delivery is enqueued and sent with headers `X-TMS-Event`, `X-TMS-Delivery` (delivery id) and `X-TMS-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
2. **Given** the receiver answers with a 2xx within 5 s, **when** the attempt completes, **then** the delivery is marked `SUCCEEDED` with status code and duration.
3. **Given** the receiver answers non-2xx, times out or refuses the connection, **when** the attempt fails, **then** it is retried with exponential backoff (10 s, 30 s, 90 s, 270 s, 810 s) and marked `FAILED` after the sixth attempt.
4. **Given** a seller, **when** they open another seller's shipments' events, **then** none are ever delivered to their endpoint.

---

### User Story 2 - Watch it work in the demo (Priority: P1)

On the integrations page, the demo seller sees a test inbox: every webhook the platform sends to it appears live, with headers, body and the signature check result. A switch makes the inbox answer 500, so the visitor can watch retries and then a recovery.

**Why this priority**: without it, a visitor has no receiver and the feature is invisible in a portfolio demo.

**Independent test**: with the simulator on, open the integrations page as the demo seller and confirm deliveries appear without interaction; turn on "fail requests", confirm the next deliveries show retries; turn it off, confirm they succeed.

**Acceptance scenarios**:

1. **Given** a seller, **when** they open the integrations page for the first time, **then** a test inbox exists for them and can be set as their endpoint in one click.
2. **Given** the inbox is the active endpoint, **when** a delivery arrives, **then** it is shown in the page within 2 s over the socket, newest first, keeping the latest 50.
3. **Given** "fail requests" is on, **when** a delivery arrives, **then** the inbox answers 500 and the delivery log shows the attempt as failed with its next retry time.

---

### User Story 3 - Create and read shipments with an API key (Priority: P2)

A seller creates an API key, copies it once, and uses it to create shipments and read their status from a script. The interactive docs at `/docs` show the public endpoints with the API key scheme.

**Why this priority**: completes the integration story in the inbound direction; less visual than webhooks.

**Independent test**: create a key, `POST /v1/shipments` with `X-Api-Key`, confirm 201 and that the shipment appears in the seller's list and fires a webhook.

**Acceptance scenarios**:

1. **Given** a seller, **when** they create a key with a name, **then** the full key is shown once and only its prefix is listed afterwards.
2. **Given** a valid key, **when** it calls `POST /v1/shipments` with the same body accepted by the seller's create flow, **then** the shipment is created for that key's seller with the same validation and carrier matching.
3. **Given** a request with `Idempotency-Key`, **when** the same key and body are sent again within 24 h, **then** the original response is returned and no second shipment is created; a different body with the same key returns 422.
4. **Given** a revoked or unknown key, **when** it calls any `/v1` route, **then** it receives 401.

---

### User Story 4 - Inspect and replay deliveries (Priority: P2)

The seller sees the delivery log (event, status, attempts, last response code, duration) and can replay any delivery.

**Why this priority**: operating a webhook integration needs it, and it makes failures understandable in the demo.

**Independent test**: replay a failed delivery after the receiver recovers and confirm a new succeeded attempt.

**Acceptance scenarios**:

1. **Given** a delivery, **when** the seller replays it, **then** a new delivery with the same payload and a new id is enqueued.
2. **Given** a seller, **when** they rotate the endpoint secret, **then** the new secret is used from the next attempt on and the old one is no longer accepted by the inbox's check.

---

### Edge Cases

- The endpoint URL resolves to a private, loopback or link-local address: registration and every attempt are rejected (SSRF). The built-in inbox is the only internal target allowed.
- The endpoint is disabled or deleted while deliveries are pending: pending retries are dropped and marked `FAILED` with reason "endpoint disabled".
- Many events for the same shipment in quick succession: each is delivered; ordering is not guaranteed, so every payload carries `occurredAt` and the shipment's current `status`.
- The response body is large or never ends: only the first 2 KB are read and the attempt still times out at 5 s.
- The demo reset (spec 01) runs: demo deliveries, inbox entries and API keys created by visitors are removed; the demo seller's endpoint is restored to their inbox.

## Functional Requirements *(mandatory)*

- **FR-001**: The system MUST let an approved seller create, list and revoke API keys. Keys MUST be stored as a SHA-256 hash with a visible prefix (`tms_` + 8 chars) and shown in full only in the creation response.
- **FR-002**: `/v1` routes MUST authenticate with `X-Api-Key` only, resolve the seller from the key, update the key's `lastUsedAt`, and apply a per-key rate limit through the existing `RateLimitGuard`.
- **FR-003**: The public API MUST expose `POST /v1/shipments`, `GET /v1/shipments` (paginated like the seller list) and `GET /v1/shipments/:trackingCode`, delegating to `ShipmentsService` with the key's seller.
- **FR-004**: `POST /v1/shipments` MUST support `Idempotency-Key` with a 24 h window, keyed by API key, storing the response status and body.
- **FR-005**: A seller MUST be able to have one webhook endpoint with a URL, a set of subscribed events (`shipment.created`, `shipment.status_changed`) and an active flag. The secret MUST be generated by the server, revealable by the owner, and rotatable.
- **FR-006**: Endpoint URLs MUST use `https` and MUST NOT resolve to private, loopback or link-local addresses, checked at registration and again at each attempt. The built-in inbox URL is exempt.
- **FR-007**: A listener on `SHIPMENT_UPDATED` (and on shipment creation) MUST enqueue one delivery per matching active endpoint. Payload: `{ id, type, occurredAt, data: { shipmentId, trackingCode, status, previousStatus, sellerId } }`.
- **FR-008**: Each attempt MUST sign the raw body as in User Story 1, time out at 5 s, record status code, duration and an error summary, and follow the retry schedule in User Story 1 scenario 3.
- **FR-009**: The delivery log MUST be listable by the seller (newest first, paginated, filter by status) and each delivery MUST be replayable.
- **FR-010**: The system MUST provide one test inbox per seller at `POST /webhook-inbox/:inboxId` (public, unauthenticated, unguessable id) that verifies the signature with the seller's current secret, stores the latest 50 requests, answers 500 when "fail requests" is on and 200 otherwise, and emits each request to the owning seller's room.
- **FR-011**: `/docs` MUST document the `/v1` routes under an `ApiKey` security scheme, separate from the bearer-auth routes.
- **FR-012**: Integrations data of the demo sellers MUST be reset by the demo reset (spec 01, FR-011), restoring each demo seller's endpoint to their inbox with both events subscribed.

### Key Entities

- **`ApiKey`** (new): a seller's credential for `/v1`; hash, prefix, name, last use, revocation.
- **`WebhookEndpoint`** (new): one per seller; URL, subscribed events, secret, active flag.
- **`WebhookDelivery`** (new): one row per event per endpoint; payload, status (`PENDING`/`SUCCEEDED`/`FAILED`), attempt count, last response code, duration, error and next attempt time.
- **`Shipment`** (`schema.prisma`): read and created through `ShipmentsService`.
- Inbox requests and idempotency records live in Redis with expiry; they are not modeled in Postgres.

## Success Criteria *(mandatory)*

- **SC-001**: A status change reaches the test inbox and is shown on the integrations page within 3 s, in 95% of changes.
- **SC-002**: A receiver can verify every delivery with the documented algorithm in under 10 lines of code; the README includes a verification snippet that passes against a real delivery.
- **SC-003**: No webhook request is ever sent to a private or loopback address, covered by unit tests over IPv4, IPv6 and DNS names resolving to them.
- **SC-004**: With the inbox failing, a delivery reaches `FAILED` after exactly six attempts on the documented schedule (± 10%).

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**: new `src/modules/integrations/`:
  - `api-keys.controller.ts` / `api-keys.service.ts`: seller-only (`JwtAuthGuard` + `RolesGuard` with `@Roles('SELLER')`).
  - `api-key.guard.ts`: `X-Api-Key` authentication for `/v1`.
  - `public-api.controller.ts`: `/v1/shipments` routes (FR-003, FR-004).
  - `webhooks.controller.ts` / `webhooks.service.ts`: endpoint CRUD, secret reveal and rotation, delivery log and replay.
  - `webhook-dispatcher.listener.ts`: subscribes to `SHIPMENT_UPDATED` and shipment creation, enqueues deliveries.
  - `webhook-delivery.processor.ts`: BullMQ worker on queue `webhooks`; signing, SSRF check, HTTP call with `fetch` and `AbortSignal.timeout`.
  - `webhook-inbox.controller.ts`: public test receiver (FR-010).
  - `ssrf.ts`: address classification used at registration and per attempt (FR-006).
- **Event source**: shipment creation currently emits no event; add `SHIPMENT_CREATED` in `shipment-events.ts` and emit it from `ShipmentsService.create`.
- **Web (`apps/web`)**: new `src/features/integrations/` and route `/seller/integrations` (added to the seller nav and `ROUTES`): API keys list and creation dialog with copy-once, endpoint form with secret reveal and rotation, delivery log table with replay, live inbox panel with the "fail requests" switch.
- **Prisma models touched**: new `ApiKey`, `WebhookEndpoint`, `WebhookDelivery` with relations to `Seller` (migration required). `Shipment` read.
- **Real-time**: new event `webhook:inbox` to `sellerRoom(sellerId)`, and `webhook:delivery` (delivery status changes) to the same room.
- **New dependencies**: none beyond `bullmq` / `@nestjs/bullmq` from spec 01. Node's `crypto` (HMAC, SHA-256) and `dns/promises` cover signing and SSRF checks.
- **Configuration**: `PUBLIC_API_URL`, the API's own public origin, used to build inbox URLs. Validated as a URL in `env.validation.ts`, defaulting to `http://localhost:3333`; `.env.example` (localhost), Railway production (the `*.up.railway.app` URL).

## Out of Scope

- More than one endpoint per seller, event filtering by shipment attributes, and webhooks for carriers or admins.
- OAuth, key scopes and per-key permissions; a key has the full power of its seller on `/v1`.
- Updating or cancelling shipments through `/v1`.
- Outbound email notifications (roadmap `notifications` module).

## Assumptions and Dependencies

- Depends on spec 01 for BullMQ and, in the demo, for the event volume that makes the inbox active.
- Delivery is at-least-once; receivers deduplicate by `X-TMS-Delivery`. This is stated in the docs.
- The webhook secret is stored in plain text in Postgres, since the server needs it to sign; access is limited to the owning seller.

## Notes for the AI Agent

- Before coding: the three new models and the seller nav change are architecture decisions; validate the Prisma models with the user first.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done: in `apps/api`, `pnpm lint:ci`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; in `apps/web`, `pnpm lint:ci`, `pnpm test`, `pnpm build`.
- Record the signing scheme, retry schedule and SSRF policy in `DESIGN.md`.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-03 | Spec created |
