# US-0055 — Assign Suspension Rules to Team Members

## ID
US-0055

## Name
Assign Suspension Rules to Team Members

## As a
Organization administrator

## I Want
To assign a suspension rule (defined in US-0054) to one or more team members through a dedicated bulk-assignment modal in the team management screen

## So That
Each member is linked to the rule that governs their absence-based suspension, allowing the system (or admin) to evaluate and enforce suspensions consistently per the org's policy

---

## Description

### Current State
The `miembros_tenant` table has no reference to any suspension rule. Suspension rules defined in `tenant_reglas_suspension` (US-0054) are isolated configuration data with no operational link to members. The team management page (`gestion-equipo`) provides per-member actions (change state, change role, block) but has no bulk suspension-rule assignment capability.

### Proposed Changes

#### Data Model

1. **New nullable FK column on `miembros_tenant`:**
   `tenant_regla_suspension_id uuid NULL` referencing `tenant_reglas_suspension(id)` with `ON DELETE SET NULL`.
   - `NULL` means no rule is assigned to the member.
   - When the rule is deleted, the column is set to `NULL` automatically via the FK cascade.

2. **Recreate `v_miembros_equipo` view** to include the new column (`tenant_regla_suspension_id`) plus a joined `regla_suspension_nombre` text column for display purposes.

#### UI

**"Configurar Suspensión" button** is added to the action toolbar in the `EquipoPage` component, visible only when the active tab is `'equipo'`. The button is disabled (with tooltip "No hay reglas de suspensión configuradas") when the tenant has zero active suspension rules.

**`ConfigurarSuspensionModal`** — a centered (not right-side slide-in) modal opened by that button. It follows a **2-step flow** within the same modal:

**Step 1 — Select rule:**
- Title: "Configurar Suspensión"
- A radio-group list of the tenant's active suspension rules showing:
  - Rule name
  - Short summary: "Máx. N inasistencias · [Por suscripción | Últimos X días] · [Duración: Y días | Permanente]"
- A "Quitar regla" option (value: `null`) as the first item, so the admin can unassign the rule from selected members.
- "Siguiente →" button (disabled until a selection is made).

**Step 2 — Select members:**
- Title: "Seleccionar Miembros"
- A search input to filter members by name/email.
- A scrollable multi-select list of all team members showing:
  - Avatar placeholder or foto_url
  - `nombre + apellido`
  - Current `regla_suspension_nombre` (if any) shown as a small badge/chip next to the name, so admin can see the current assignment
  - Checkbox per row
- "Seleccionar todos" / "Deseleccionar todos" header toggle.
- Footer: "← Atrás" button + "Aplicar (N seleccionados)" button (disabled when N = 0).

**On Apply:**
- An `UPDATE miembros_tenant SET tenant_regla_suspension_id = $ruleId WHERE id IN ($ids)` is executed for all selected members.
- If the "Quitar regla" option was selected, `tenant_regla_suspension_id` is set to `NULL`.
- On success: toast "Regla aplicada a N miembro(s)" or "Regla removida de N miembro(s)", modal closes, team list refreshes.
- On error: toast error, modal stays open.

**No per-row action is added** to the table for this feature — the bulk modal is the only entry point.

---

## Database Changes

```sql
-- Migration: 20260407000200_miembros_tenant_regla_suspension.sql

-- 1. Add nullable FK column to miembros_tenant
alter table public.miembros_tenant
  add column if not exists tenant_regla_suspension_id uuid null;

alter table public.miembros_tenant
  add constraint miembros_tenant_regla_suspension_fkey
    foreign key (tenant_regla_suspension_id)
    references public.tenant_reglas_suspension(id)
    on delete set null;

create index if not exists idx_miembros_tenant_regla_suspension
  on public.miembros_tenant (tenant_regla_suspension_id)
  where tenant_regla_suspension_id is not null;

-- 2. Recreate v_miembros_equipo including the new column + rule name
-- (depends on previous view migrations: 20260320000300, 20260328000200)
drop view if exists public.v_miembros_equipo;

create view public.v_miembros_equipo as
select
  mt.id,
  mt.tenant_id,
  mt.usuario_id,
  mt.rol_id,
  mt.estado,
  mt.tenant_regla_suspension_id,
  trs.nombre as regla_suspension_nombre,
  u.nombre,
  u.apellido,
  u.tipo_identificacion,
  u.numero_identificacion,
  u.fecha_nacimiento,
  u.fecha_exp_identificacion,
  u.telefono,
  u.email,
  u.foto_url,
  u.rh,
  r.nombre as rol_nombre,
  coalesce(faltas.cnt, 0)::int as inasistencias_recientes
from public.miembros_tenant mt
join public.usuarios u on u.id = mt.usuario_id
join public.roles r on r.id = mt.rol_id
left join public.tenant_reglas_suspension trs on trs.id = mt.tenant_regla_suspension_id
left join lateral (
  select count(*)::int as cnt
  from public.asistencias a
  join public.reservas rv on rv.id = a.reserva_id
  where rv.atleta_id = mt.usuario_id
    and rv.tenant_id = mt.tenant_id
    and a.asistio = false
    and a.created_at >= now() - interval '30 days'
) faltas on true;

grant select on public.v_miembros_equipo to authenticated;
```

**No new RLS policies are required** for this change:
- The existing `miembros_tenant_update_estado_admin` policy already allows admins to `UPDATE` any column on `miembros_tenant` for their tenant. Updating `tenant_regla_suspension_id` is covered by that policy.
- The `ON DELETE SET NULL` cascade is performed by the database engine and does not require additional RLS.

---

## API / Server Actions

**File:** `src/services/supabase/portal/equipo.service.ts`

### `asignarReglaSuspension(input: AsignarReglaSuspensionInput): Promise<void>`
- `UPDATE public.miembros_tenant SET tenant_regla_suspension_id = $reglaId WHERE id = ANY($miembroIds) AND tenant_id = $tenantId`
- Input: `{ tenantId: string; reglaId: string | null; miembroIds: string[] }`
  - When `reglaId` is `null` → sets `tenant_regla_suspension_id = NULL` (unassign)
- Returns: `void`
- Auth: session token; RLS admin policy on `miembros_tenant` enforces tenant scope
- The `tenant_id` filter is a safety check in addition to RLS

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260407000200_miembros_tenant_regla_suspension.sql` | Add FK column, index, recreate view |
| Types | `src/types/portal/equipo.types.ts` | Add `tenant_regla_suspension_id: string \| null` and `regla_suspension_nombre: string \| null` to `MiembroRow` and `MiembroTableItem`; add `AsignarReglaSuspensionInput` |
| Service | `src/services/supabase/portal/equipo.service.ts` | Add `asignarReglaSuspension` function |
| Hook | `src/hooks/portal/gestion-equipo/useConfigurarSuspension.ts` | New hook: step state, rule selection, member multi-select, search filter, submit action |
| Component | `src/components/portal/gestion-equipo/ConfigurarSuspensionModal.tsx` | New 2-step centered modal (rule select → member multi-select) |
| Component | `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add "Configurar Suspensión" button to header toolbar; import and wire `ConfigurarSuspensionModal` |

---

## Acceptance Criteria

1. The `miembros_tenant` table has a nullable `tenant_regla_suspension_id` column with a FK constraint referencing `tenant_reglas_suspension(id) ON DELETE SET NULL`.
2. Deleting a suspension rule from the organization automatically sets `tenant_regla_suspension_id = NULL` for all members previously assigned that rule (cascade behavior, verifiable in DB).
3. The `v_miembros_equipo` view exposes `tenant_regla_suspension_id` and `regla_suspension_nombre` for each member row.
4. The "Configurar Suspensión" button appears in the `EquipoPage` toolbar only when the "Equipo" tab is active.
5. The button is disabled with tooltip "No hay reglas de suspensión configuradas" when the tenant has no active suspension rules.
6. Clicking the enabled button opens the `ConfigurarSuspensionModal` at Step 1.
7. Step 1 shows all active suspension rules for the tenant as radio options plus a "Quitar regla" option.
8. The "Siguiente →" button in Step 1 is disabled until a rule (or "Quitar regla") is selected.
9. Step 2 shows the full team member list with name, current assigned rule badge, and a checkbox per row.
10. The search input in Step 2 filters the member list by name or email (case-insensitive, client-side).
11. "Seleccionar todos" selects all currently filtered members; "Deseleccionar todos" clears the selection.
12. The "Aplicar" button is disabled when no members are selected.
13. Clicking "Aplicar" with a rule selected updates `tenant_regla_suspension_id` for all selected members to the rule's id.
14. Clicking "Aplicar" with "Quitar regla" selected sets `tenant_regla_suspension_id = NULL` for all selected members.
15. On successful apply, a success toast appears (e.g., "Regla aplicada a 3 miembro(s)"), the modal closes, and the team list refreshes to show the updated rule badges.
16. On DB error, an error toast appears and the modal remains open.
17. Members who already have the selected rule assigned remain idempotent (no error, rule stays the same).
18. The `regla_suspension_nombre` badge is visible in the member row inside the modal for members who already have a rule, so the admin can identify them before overwriting.
19. A non-admin user cannot see the "Configurar Suspensión" button (it is not rendered for `entrenador` or `usuario` roles).
20. The existing RLS admin-only UPDATE policy on `miembros_tenant` prevents non-admin API calls from updating `tenant_regla_suspension_id`.

---

## Implementation Steps

- [ ] Create and apply migration `20260407000200_miembros_tenant_regla_suspension.sql`
- [ ] Verify `ON DELETE SET NULL` in DB: assign a rule to a member, delete the rule, confirm the column is NULL
- [ ] Add `tenant_regla_suspension_id` and `regla_suspension_nombre` fields to `MiembroRow`, `MiembroTableItem`, and add `AsignarReglaSuspensionInput` in `src/types/portal/equipo.types.ts`
- [ ] Add `asignarReglaSuspension` to `src/services/supabase/portal/equipo.service.ts`
- [ ] Create `useConfigurarSuspension` hook (step management, member list derived from `useEquipo` result, rule list via `useReglasSuspension`, submit)
- [ ] Create `ConfigurarSuspensionModal` component (Step 1: rule radio list; Step 2: member multi-select with search)
- [ ] Wire `ConfigurarSuspensionModal` into `EquipoPage`: add button to toolbar, pass open/close handlers and hook state
- [ ] Guard button rendering so it only shows for `administrador` role
- [ ] Disable button when tenant has no active rules (pass rule count from hook to component)
- [ ] Test bulk assign: select 2 members → apply rule → verify DB rows updated and view reflects `regla_suspension_nombre`
- [ ] Test quitar regla: select members with rule → apply "Quitar regla" → verify `tenant_regla_suspension_id` is NULL
- [ ] Test cascade: delete rule → verify all previously assigned members have NULL in column
- [ ] Test "Siguiente" disabled until radio selected; "Aplicar" disabled until at least one member checked

---

## Non-Functional Requirements

- **Security**: The bulk UPDATE is constrained by the existing `miembros_tenant_update_estado_admin` RLS policy, which already permits admins to update any field on `miembros_tenant` for their tenant. An additional `AND tenant_id = $tenantId` clause in the service query provides defense-in-depth. Non-admins cannot update `tenant_regla_suspension_id` via the API.
- **Performance**: The bulk update operates on `id = ANY($ids)` rather than individual queries, so N selected members = 1 DB round-trip. The index `idx_miembros_tenant_regla_suspension` supports future lookups by rule. The member list in Step 2 is filtered client-side (already in memory from `useEquipo`), avoiding extra fetches.
- **Accessibility**: The modal must trap focus when open. Radio items and checkboxes must be keyboard-navigable. The "Siguiente" and "Aplicar" buttons must have `aria-disabled="true"` when disabled.
- **Error handling**: Service errors surface as toast notifications (error variant). The modal stays open on error so the admin can retry without re-selecting members.
