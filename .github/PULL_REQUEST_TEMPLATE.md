## What changed and why

<!-- 1-3 sentences. The "why" matters more than the "what" — the diff already shows the what. -->

## Type of change

- [ ] `feat` — new functionality
- [ ] `fix` — bug fix
- [ ] `chore` — tooling, config, dependencies
- [ ] `docs` — documentation only
- [ ] `refactor` — no observable behavior change

## How I validated it

<!-- Not a generic "tests pass" — what you actually ran/observed.
E.g.: a real curl against the endpoint, a psql query confirming the data was written,
the server booting without error, a screen tested in the browser. -->

## Checklist

- [ ] `pnpm lint` / `pnpm test` / `pnpm build` pass locally (CI confirms it, but running it first avoids a red PR)
- [ ] Updated `DESIGN.md` if this change is an architecture decision, not just an implementation detail
- [ ] No `.env`, key, or secret committed by accident
- [ ] Prisma migration included, if `schema.prisma` changed

## Screenshots / demo

<!-- Only for a frontend change with visual impact. Delete this section if not applicable. -->
