# Feature Specification: [FEATURE NAME]

**Feature**: `[english-slug]` — module `[ModuleName]Module`
**Created**: [DATE]
**Status**: Draft | In Progress | Implemented
**Design reference**: [`DESIGN.md` §X / `SCREENS.md` §Y this feature extends — or "none"]

<!--
HOW TO USE THIS TEMPLATE
- Adapted from dine-out-backend/specs/TEMPLATE.md (itself based on github.com/github/spec-kit).
- Fill in every mandatory section. Remove sections that don't apply, but don't skip one silently — say why.
- Where something isn't clear, write [NEEDS CLARIFICATION: specific question] instead of assuming.
- This file is the feature's CONTRACT. Code that diverges from the spec without updating the spec is a process
  bug, not just a code bug.
- Cite DESIGN.md / SCREENS.md (behavior) and apps/api/prisma/schema.prisma (persisted shape) by section/model
  name. Never restate their content at length.

TONE AND STRUCTURE
- Academic, direct, impersonal. State the current requirement or fact.
- Every section except Changelog describes CURRENT state only. History belongs in the Changelog.
- Avoid "X, not Y" as a rhetorical device. State the rule once, plainly.
-->

## Summary

[1-3 sentences: what this feature does, for whom, and why it exists. No implementation detail.]

## User Stories *(mandatory)*

<!-- Each story is an independently testable, demonstrable vertical slice. Prioritize by real importance. -->

### User Story 1 - [Short title] (Priority: P1)

[Journey in plain language, from the user's point of view]

**Why this priority**: [the value, why it can't wait]

**Independent test**: [how to validate this on its own]

**Acceptance scenarios**:

1. **Given** [initial state], **when** [action], **then** [expected outcome]

---

### Edge Cases

- What happens when [boundary condition]?

## Functional Requirements *(mandatory)*

- **FR-001**: The system MUST [specific capability]

### Key Entities *(if the feature involves data)*

- **[ModelName]**: what it represents — cite the Prisma model, do NOT re-list its fields here.

## Success Criteria *(mandatory)*

- **SC-001**: [measurable outcome]

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**: module folder under `src/modules/`, controllers/services/DTOs, guards per route.
- **Web (`apps/web`)**: feature folder under `src/features/`, routes under `src/app/`, components.
- **Prisma models touched**: which models, and how (read/write/new). New models need a migration.
- **Real-time**: socket events, rooms and namespace, if any.
- **New dependencies?** [package name + why it can't be solved with what's already installed]
- **Configuration**: env vars, and where each one must be set (local, Railway, Vercel).

## Out of Scope

[What this spec explicitly does NOT cover this round.]

## Assumptions and Dependencies

- [Assumption made in the absence of info]
- [Dependency on another existing module/spec]

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above.
- Mandatory verification before reporting done, in each touched app: `pnpm lint:ci`, `pnpm test`, `pnpm build`; plus `pnpm test:e2e` in `apps/api`.
- Record an architecture decision in `DESIGN.md` when the feature introduces one.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| [DATE] | Spec created |
