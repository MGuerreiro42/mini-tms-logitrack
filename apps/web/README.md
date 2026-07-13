# Mini TMS — Web

Frontend of [Mini TMS](../../README.md), in Next.js (App Router). Full architecture-decision reasoning in [`DESIGN.md`](../../DESIGN.md) at the repo root — this README only covers what's specific to this app.

## Stack

- Next.js 16 (App Router, Turbopack)
- TanStack Query — server state
- Zustand — UI state (only what's genuinely global)
- Tailwind CSS
- shadcn/ui — planned, not integrated yet

## Running

Needs the API running alongside it (`apps/api`, port `3333`).

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

`.env.local` already points `NEXT_PUBLIC_API_URL` at `http://localhost:3333`.

## Structure

```
src/
├── app/            # routing — route groups (admin)/(seller)/(carrier), + invite/accept, track
├── features/       # one domain per folder: auth, sellers, carriers, shipments, invites, tracking
├── components/     # shared UI (ui/, common/)
├── lib/            # utils (cn), query-client
├── services/       # api-client (fetch), websocket-client (socket.io)
└── store/          # Zustand
```

## Architecture rules

- One-way dependency: `shared → features → app`. A feature never imports another feature directly — documented exception: `shipments`, consumed by both `sellers` and `carriers`.
- Server data → always TanStack Query. Pure UI state → Zustand. Never duplicate an API response into a store.
- Server Components by default; `'use client'` only at the leaves of the tree (today, only `app/providers.tsx`).

Each `features/*` folder is still a placeholder (`types.ts`, `api/index.ts`, `index.ts` empty) — modeling each domain is the next step. Details and full reasoning in [`DESIGN.md` § 9](../../DESIGN.md#9-frontend-architecture).

## Tests

```bash
pnpm test        # unit/component (vitest run)
pnpm test:watch  # unit/component, watch mode
pnpm test:cov    # with coverage (@vitest/coverage-v8)
```

Vitest + React Testing Library + `@testing-library/user-event`, same runner as `apps/api` (one test tool across the monorepo instead of two). API calls are mocked at the network level with MSW (`src/test/msw/`) rather than mocking the `api-client` module — tests exercise the real `fetch` + error-parsing path, not just the component's reaction to a resolved/rejected promise. Each test file registers only the handlers it needs via `server.use(...)`; an unmocked request fails the test loudly (`onUnhandledRequest: 'error'`) instead of silently falling through.

Only Client Components, hooks, and pure functions are realistic RTL targets — most of `src/app/**` is Server Components (layouts doing an auth gate + redirect), which aren't something RTL renders; those stay covered by manual browser testing, same as before. `vitest.config.ts` excludes `src/app/**` and `src/components/ui/**` (shadcn-generated) from the coverage report accordingly.

## Lint & format

```bash
pnpm lint     # biome check --write .
pnpm format   # biome format --write .
```

Biome, not ESLint — loses `eslint-config-next`'s specific rules, gains Biome's `linter.domains: { next, react }` in their place (reasoning in [`DESIGN.md` § 12](../../DESIGN.md#12-code-quality)). Runs automatically on `pre-commit` (lefthook, configured at the repo root).

## Environment variables

| Var | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3333` | API base URL |
