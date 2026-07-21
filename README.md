# Mini TMS

[![CI](https://github.com/MGuerreiro42/mini-tms-logitrack/actions/workflows/ci.yml/badge.svg)](https://github.com/MGuerreiro42/mini-tms-logitrack/actions/workflows/ci.yml)

Multi-tenant Transportation Management System (TMS), with seller onboarding, carrier management, and real-time delivery tracking.

Portfolio project: it doesn't aim to be a commercializable product, but a technical artifact demonstrating real domain modeling, multi-layer RBAC, and a horizontally-scalable real-time architecture (WebSocket + Redis pub/sub). Stack and architecture decisions, with the reasoning behind each one, are documented in [`DESIGN.md`](./DESIGN.md).

## Stack

- **Backend:** NestJS, PostgreSQL (Prisma), Redis (pub/sub, cache, BullMQ)
- **Frontend:** Next.js (App Router), TanStack Query, Zustand, Tailwind
- **Real-time:** Socket.io with a Redis adapter (scales across multiple API instances)
- **Local infra:** Docker Compose (Postgres + Redis)

## Structure

```
apps/
├── api/   # NestJS — backend
└── web/   # Next.js — frontend
```

See sections 8 and 9 of [`DESIGN.md`](./DESIGN.md) for the full folder tree and the reasoning behind it. Screen-by-screen specification (roles, data, actions) in [`SCREENS.md`](./SCREENS.md); a sequential, frame-by-frame walkthrough of the flow that's actually built and validated today (used to brief design-prototyping tools) in [`FLOW.md`](./FLOW.md).

`apps/api` and `apps/web` are independent projects, each with its own `tsconfig.json` — opening the repo root directly in VS Code can make the TypeScript server fall back to an implicit project and misreport errors (e.g. spurious `strictPropertyInitialization` complaints). Open [`mini-tms.code-workspace`](./mini-tms.code-workspace) instead (`File > Open Workspace from File...`) — it lists both apps as separate roots so each gets its own `tsconfig.json` resolved correctly, in one window.

## Running locally

```bash
# 1. Infra (Postgres + Redis)
docker compose up -d

# 2. Backend — http://localhost:3333 (generate + migrate run on their own)
cd apps/api
pnpm install
pnpm start:dev

# 3. Frontend — http://localhost:3000
cd apps/web
pnpm install
pnpm dev
```

Configuration details (`.env`, dev credentials, Prisma technical notes) in [`DESIGN.md` § 8](./DESIGN.md#8-running-locally).

## Code quality

Biome (format + lint, a single binary across both apps) + lefthook (`pre-commit` runs lint-staged, `commit-msg` validates Conventional Commits) + Vitest (`apps/api`, unit and e2e). The root `package.json` exists only to host this tooling — `apps/api` and `apps/web` remain independent pnpm projects. Details in [`DESIGN.md` § 17](./DESIGN.md#17-code-quality--ci).

```bash
pnpm install   # at the root — installs lefthook/lint-staged/commitlint and activates the git hooks
```

CI on GitHub Actions (lint + build + tests, with a real Postgres for e2e) runs on every push/PR to `main` — it exists because a local hook alone guarantees nothing for someone who clones the repo or commits with `--no-verify`. Details in [`DESIGN.md` § 17](./DESIGN.md#17-code-quality--ci).

## Status

Under development, but the core product loop is complete end-to-end and tested (226 backend + 147 frontend tests): data modeling closed ([`DESIGN.md` § 10](./DESIGN.md#10-data-model), 11 tables); auth + RBAC ([§ 11](./DESIGN.md#11-auth--authorization)); sellers ([§ 12](./DESIGN.md#12-sellers)) and carriers ([§ 13](./DESIGN.md#13-carriers)) self-signup + admin approval + own-modality/coverage config; shipment creation with real coverage+modality matching ([§ 14](./DESIGN.md#14-shipments)); carrier queue (claim/status) and real-time tracking over WebSocket + Redis, including public tracking ([§ 15](./DESIGN.md#15-carrier-queue--real-time-tracking)); dashboards for all three roles, carrier performance metrics, and admin global monitoring ([§ 16](./DESIGN.md#16-dashboards-carrier-performance-and-global-monitoring)).

**Not started yet:** operator invites (`Invite` token flow, Operator Management screen) and the `notifications` module (currently an empty scaffold — will host BullMQ workers for email/SLA alerts). See the [roadmap](./DESIGN.md#7-roadmap-advanced-features--next-steps) for these and further-out ideas.

## License

[MIT](./LICENSE)
