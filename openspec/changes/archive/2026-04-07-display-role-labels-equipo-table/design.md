## Context

In `EquipoTable.tsx`, the "Perfil" column renders `row.rol_nombre` (or `r.nombre` in `<option>` labels) directly from the database. The value stored in `public.roles` for the default member role is `'usuario'`. There is no display-label layer between the DB identifier and the rendered text.

`EquipoStatsCards.tsx` has a hardcoded label `'Usuarios Activos'` matching the same internal identifier.

The change is purely presentational — no schema, type, service, or logic changes are needed.

## Goals / Non-Goals

**Goals:**
- Render "Atleta" wherever `rol_nombre === 'usuario'` appears in the team table and its stats cards.
- Apply the same label consistently to both the read-only text fallback and the editable `<select>` dropdown options.
- Provide a graceful fallback for any role not present in the map (raw `nombre` shown).

**Non-Goals:**
- Renaming the `'usuario'` value in the database or any TypeScript types.
- Changing role guards, cookies, or any authorization logic.
- Applying the label mapping outside the `gestion-equipo` feature slice.
- Internationalisation (i18n) of role labels.

## Decisions

**Decision: Inline `ROL_DISPLAY_LABELS` constant in `EquipoTable.tsx`**

A module-local `Record<string, string>` constant is the simplest approach for a single-component mapping with no runtime variability.

_Alternatives considered:_
- Shared utility in `src/lib/` — unnecessary abstraction; the map is only used in one component today.
- Looked-up from `RolOption.label` field — that would require a DB/service change, contradicting the display-only scope.

**Decision: `?? r.nombre` fallback**

Using a nullish coalescing fallback ensures unknown future roles display their raw name instead of `undefined`, making the change forwards-compatible without additional maintenance.

## Risks / Trade-offs

- [Drift risk] If a new role is added to the DB but not to `ROL_DISPLAY_LABELS`, the raw DB name is shown instead of a friendly label. → Mitigation: The fallback prevents a broken display; the map itself is trivial to extend when new roles are introduced.
- [Scope] Two separate component files require edits. → Mitigation: Both changes are one-line each; no shared state or coordination is needed.

## Migration Plan

No deployment steps beyond a standard code deploy. No DB migration, no rollback procedure — the change is additive and non-breaking.
