## Context

Suspension rules (`tenant_reglas_suspension`) were introduced in US-0054 as isolated configuration data. The team management screen (`gestion-equipo`) lists members via `v_miembros_equipo` and has per-member actions (change state, role, block, etc.). There is currently no link between a suspension rule and a member — `miembros_tenant` has no reference to `tenant_reglas_suspension`. This change bridges that gap by adding a nullable FK on `miembros_tenant` and providing a bulk-assignment modal in the team management page.

### Current state
- `miembros_tenant` has columns: `id`, `tenant_id`, `usuario_id`, `rol_id`, `estado`, timestamps — no suspension rule reference.
- `v_miembros_equipo` joins `miembros_tenant`, `usuarios`, `roles`, and a lateral subquery for `inasistencias_recientes`.
- `EquipoPage` uses `useEquipo` hook for member CRUD and has a tab bar (Equipo | Solicitudes | Bloqueados).
- `useReglasSuspension` hook already fetches active rules for a tenant — reusable for the rule-selection step.

## Goals / Non-Goals

**Goals:**
- Add `tenant_regla_suspension_id` FK column to `miembros_tenant` with `ON DELETE SET NULL`.
- Extend `v_miembros_equipo` to expose the FK and joined rule name.
- Provide a 2-step centered modal for bulk assign/unassign of a rule to selected members.
- Integrate the modal into `EquipoPage` via a toolbar button (admin-only, disabled when no active rules).

**Non-Goals:**
- Automatic enforcement of suspension rules (evaluating absences and auto-suspending members).
- Per-row rule assignment in the team table.
- Displaying the assigned rule in the main `EquipoTable` columns.
- Changes to the suspension rules CRUD in `TenantReglasSuspensionCard`.

## Decisions

### 1. Nullable FK with ON DELETE SET NULL
**Choice:** `tenant_regla_suspension_id uuid NULL` with `ON DELETE SET NULL`.
**Rationale:** When a rule is deleted, members lose their assignment gracefully rather than blocking deletion or cascading member removal. NULL means "no rule assigned".
**Alternative considered:** Junction table (many-to-many). Rejected because a member has at most one active rule — a simple FK is sufficient and avoids extra joins.

### 2. Bulk UPDATE via single service function
**Choice:** `asignarReglaSuspension({ tenantId, reglaId, miembroIds })` performs `UPDATE miembros_tenant SET tenant_regla_suspension_id = $reglaId WHERE id = ANY($ids) AND tenant_id = $tenantId`.
**Rationale:** Single round-trip for N members. The `tenant_id` filter provides defense-in-depth alongside RLS. Setting `reglaId = null` handles unassignment.
**Alternative considered:** Individual updates per member. Rejected for N+1 performance cost.

### 3. 2-step centered modal (not slide-in drawer)
**Choice:** Centered dialog with Step 1 (rule selection) → Step 2 (member multi-select).
**Rationale:** The 2-step flow prevents cognitive overload. Centered modal differentiates this bulk action from per-member slide-in drawers. Step separation ensures the admin consciously picks a rule before seeing members.
**Alternative considered:** Single-step modal with rule dropdown + member list. Rejected — mixing rule selection and member checkboxes in one view is cluttered.

### 4. Reuse useReglasSuspension for rule list
**Choice:** The new `useConfigurarSuspension` hook calls `useReglasSuspension` to get the active rules list.
**Rationale:** Avoids duplicating the fetch logic. The hook already exists and returns `rules: ReglaSuspension[]` for the tenant.

### 5. Client-side member filtering in Step 2
**Choice:** Filter the `useEquipo` member list in-memory by search term (name/email).
**Rationale:** Members are already loaded by the parent `EquipoPage` — no extra fetch needed. Typical team sizes (< 500) are comfortably filtered client-side.

### 6. No changes to EquipoTable columns
**Choice:** The assigned rule is shown only inside the modal (Step 2, as a badge next to each member name).
**Rationale:** Keeps the main table clean. The rule assignment is an administrative configuration step, not daily monitoring data.

## Architecture

```
EquipoPage.tsx
  ├── (existing) useEquipo → members[], refresh()
  ├── (existing) useReglasSuspension → rules[]
  ├── (new) "Configurar Suspensión" button (visible when activeTab === 'equipo', admin-only)
  └── ConfigurarSuspensionModal.tsx (centered dialog)
        └── useConfigurarSuspension hook
              ├── Step state (1 | 2)
              ├── Rule selection (reglaId: string | null)
              ├── Member multi-select (selectedIds: Set<string>)
              ├── Search filter (filterTerm)
              └── submit → equipoService.asignarReglaSuspension()
                            → parent refresh()
```

## Layer-by-layer implementation approach

1. **Page** → `EquipoPage.tsx`: Add toolbar button + modal mount
2. **Component** → `ConfigurarSuspensionModal.tsx`: 2-step centered modal UI
3. **Hook** → `useConfigurarSuspension.ts`: Step management, selection state, submit
4. **Service** → `equipo.service.ts`: `asignarReglaSuspension` function
5. **Types** → `equipo.types.ts`: Extend row types + add input type
6. **Migration** → `20260407000200_miembros_tenant_regla_suspension.sql`: Column + FK + view

## Risks / Trade-offs

- **[Risk] View recreation drops and recreates `v_miembros_equipo`** → Mitigation: The migration uses `DROP VIEW IF EXISTS` + `CREATE VIEW` in a single transaction. Downtime is negligible (milliseconds). No dependent views exist.
- **[Risk] Large team bulk update** → Mitigation: `ANY($ids)` with indexed `id` column is efficient. For teams < 1000 members, this is sub-second.
- **[Risk] Stale member list in modal** → Mitigation: Modal reads from `useEquipo` members which are fetched on page mount. After apply, `refresh()` is called. If another admin changes membership concurrently, the worst case is a no-op update on a removed member (RLS filters it out).

## Open Questions

None — the user story is fully specified.
