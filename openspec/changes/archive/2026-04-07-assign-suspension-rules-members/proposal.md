## Why

Suspension rules (US-0054) exist as isolated configuration in `tenant_reglas_suspension` with no operational link to team members. Administrators cannot assign a rule to members, so the system cannot evaluate or enforce absence-based suspensions. A bulk-assignment mechanism is needed to connect rules to members efficiently.

## What Changes

- **Data model**: Add nullable FK `tenant_regla_suspension_id` on `miembros_tenant` referencing `tenant_reglas_suspension(id)` with `ON DELETE SET NULL`. Recreate `v_miembros_equipo` view to expose the new column plus the joined `regla_suspension_nombre`.
- **Service layer**: New `asignarReglaSuspension` function in `equipo.service.ts` that bulk-updates `tenant_regla_suspension_id` for selected member IDs (supports both assign and unassign).
- **Types**: Extend `MiembroRow` / `MiembroTableItem` with `tenant_regla_suspension_id` and `regla_suspension_nombre`; add `AsignarReglaSuspensionInput` type.
- **Hook**: New `useConfigurarSuspension` hook managing 2-step modal state (rule selection → member multi-select), search filter, and submit action.
- **UI**: New `ConfigurarSuspensionModal` component (centered, 2-step flow). New "Configurar Suspensión" toolbar button in `EquipoPage` (admin-only, disabled when no active rules exist).

## Non-goals

- Per-row action to assign rules from the team table — the bulk modal is the only entry point.
- Automatic suspension enforcement (evaluating rules and suspending members) — that is a separate future feature.
- Changes to the suspension rules CRUD itself (`TenantReglasSuspensionCard`).
- Displaying the assigned rule column in the main `EquipoTable` — only visible inside the modal's Step 2.

## Capabilities

### New Capabilities
- `suspension-rule-member-assignment`: Bulk assignment/removal of suspension rules to team members via a 2-step modal in the team management screen.

### Modified Capabilities
- `team-management`: The `v_miembros_equipo` view gains two new columns (`tenant_regla_suspension_id`, `regla_suspension_nombre`). Types `MiembroRow`/`MiembroTableItem` are extended. `EquipoPage` gains a new toolbar button and modal integration.
- `tenant-suspension-rules`: The `miembros_tenant` table now references `tenant_reglas_suspension` via FK. Deleting a rule cascades `SET NULL` on member assignments.

## Impact

- **Database**: New migration adds column + FK + index on `miembros_tenant`; drops and recreates `v_miembros_equipo` view.
- **Types**: `src/types/portal/equipo.types.ts` — extended with suspension-rule fields and new input type.
- **Service**: `src/services/supabase/portal/equipo.service.ts` — new bulk-update function.
- **Hook**: `src/hooks/portal/gestion-equipo/useConfigurarSuspension.ts` — new file.
- **Component**: `src/components/portal/gestion-equipo/ConfigurarSuspensionModal.tsx` — new file.
- **Component**: `src/components/portal/gestion-equipo/EquipoPage.tsx` — modified to add button + modal.
- **No new RLS policies** — existing admin UPDATE policy on `miembros_tenant` covers this column.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260407000200_miembros_tenant_regla_suspension.sql` | Add FK column, index, recreate view |
| Types | `src/types/portal/equipo.types.ts` | Add `tenant_regla_suspension_id`, `regla_suspension_nombre` to row types; add `AsignarReglaSuspensionInput` |
| Service | `src/services/supabase/portal/equipo.service.ts` | Add `asignarReglaSuspension` function |
| Hook | `src/hooks/portal/gestion-equipo/useConfigurarSuspension.ts` | New hook: step state, rule selection, member multi-select, search filter, submit |
| Component | `src/components/portal/gestion-equipo/ConfigurarSuspensionModal.tsx` | New 2-step centered modal |
| Component | `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add toolbar button + modal wiring |

## Implementation Plan

1. **Migration** — Create `20260407000200_miembros_tenant_regla_suspension.sql`: add column, FK, index, recreate view.
2. **Types** — Extend `equipo.types.ts` with new fields and input type.
3. **Service** — Add `asignarReglaSuspension` to `equipo.service.ts`.
4. **Hook** — Create `useConfigurarSuspension.ts` (depends on `useEquipo` for member data and `useReglasSuspension` for rule list).
5. **Component** — Create `ConfigurarSuspensionModal.tsx` (Step 1: rule radio list; Step 2: member multi-select with search).
6. **Page integration** — Wire button + modal into `EquipoPage.tsx` (admin-only, disabled when no rules).
