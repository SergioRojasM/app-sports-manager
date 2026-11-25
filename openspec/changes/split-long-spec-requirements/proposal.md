# Proposal

> Source: user request (2026-11-25), while finishing `grit-arena-v3-admin-organizacion`. The seven main specs normalised by that change still produce "Requirement text is very long (>500 characters)" warnings under `openspec validate --specs --strict`. Asked whether to split them, the user answered "si".
>
> The three long requirements that `grit-arena-v3-admin-organizacion` already rewrites were split inside that change, because their text belongs to it. This change covers the ten long requirements that no other open change touches.

## Why

Ten requirements in four main specs pack several behaviors into one description of 547–1289 characters. Because of that:
- strict validation fails on warnings;
- a single scenario can't point to the behavior it checks;
- later changes have to copy a large block to change a single detail.

The OpenSpec rule is to split them in a change made for that purpose. The requirement keeps its header and all of its scenarios. Its description is cut down to one behavior with the same meaning, and each behavior removed from it becomes its own requirement with its own scenarios.

## What Changes

The behavior of the specs does not change. No application code, migration or API changes. Per capability:

- `discipline-levels-management`: "nivel_disciplina database migration SHALL create correct schema" keeps the table and columns. The constraints, the RLS policies and the index become their own requirements.
- `organization-view`:
  - "Organization edit form SHALL expose a configurable max_solicitudes field" keeps the admin-only field with its label, range and save path. The type and mapper wiring becomes its own requirement.
  - "Organization edit form SHALL expose a `requiere_perfil_completo` toggle" keeps the admin-only toggle with its label and save path. The help text and placement, and the type / mapper / default wiring, become their own requirements.
- `plan-management`:
  - "Create and edit plan flows use a shared right-side modal" keeps the single modal with three modes and its close / pending behavior. The titles and submit labels become their own requirement.
  - "Subscription request modal" keeps the plan summary and the subtype selection. The subtype details (with no plan-level fallback) and the comments / proof-file inputs become their own requirements.
  - "Subscription request submission" keeps the single `comprar_suscripcion` call that creates the pending subscription and payment. The server-side amount and the proof upload before the RPC become their own requirements.
- `tenant-suspension-rules`:
  - "tenant_reglas_suspension table exists with correct structure" keeps the table and columns. The constraints and index, and the `miembros_tenant` reference, become their own requirements.
  - "Service provides full CRUD operations for suspension rules" keeps the four exported functions. The read ordering and the mutation return values become their own requirements.
  - "useReglasSuspension hook manages CRUD state and enforces 3-rule limit" keeps the exposed state. The modal controls with the 3-rule limit, and the mutations with their toasts, become their own requirements.
  - "ReglaSuspensionFormModal handles create and edit with full validation" keeps the drawer with its fields, modes and the SHOULD-level input hints. Validation, and submit with the duplicate-name mapping, become their own requirements.

## Non-goals

- Changing any requirement's meaning, adding behavior, or removing a scenario.
- Splitting the long requirements that `grit-arena-v3-admin-organizacion` modifies. That change already split them.
- Touching application code, the database, or long requirements in specs outside these four.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `discipline-levels-management`: one requirement split into four.
- `organization-view`: two requirements split into five.
- `plan-management`: three requirements split into eight.
- `tenant-suspension-rules`: four requirements split into twelve.

## Impact

- **Specs only**: `openspec/specs/{discipline-levels-management,organization-view,plan-management,tenant-suspension-rules}/spec.md` after archive.
- **Code**: none. **Dependencies**: none.
- **Ordering**: independent of `grit-arena-v3-admin-organizacion`. Both changes touch `plan-management`, `organization-view` and `tenant-suspension-rules`, but different requirements, so either can be archived first.

## Files to Create or Modify

| Layer | File | Change |
|---|---|---|
| Spec delta | `openspec/changes/split-long-spec-requirements/specs/discipline-levels-management/spec.md` | MODIFIED 1 + ADDED 3 |
| Spec delta | `openspec/changes/split-long-spec-requirements/specs/organization-view/spec.md` | MODIFIED 2 + ADDED 3 |
| Spec delta | `openspec/changes/split-long-spec-requirements/specs/plan-management/spec.md` | MODIFIED 3 + ADDED 5 |
| Spec delta | `openspec/changes/split-long-spec-requirements/specs/tenant-suspension-rules/spec.md` | MODIFIED 4 + ADDED 8 |

## Implementation Plan

1. Branch from `develop` after `grit-arena-v3-admin-organizacion` is merged (or from it, if that is still open).
2. Write the four deltas. Each MODIFIED block keeps its header and every scenario, with the description cut to one behavior. Each removed behavior is copied, without changing its meaning, into an ADDED requirement with its own scenarios.
3. Validate the change with `--strict`, archive it, and confirm that `openspec validate --specs --strict` no longer reports these ten requirements.
4. Write the commit message and PR description.
