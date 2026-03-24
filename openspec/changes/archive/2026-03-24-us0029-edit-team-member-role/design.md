## Context

The **Gestión de Equipo** feature (`/portal/orgs/[tenant_id]/gestion-equipo`) allows organization administrators to view and manage team members. Each member has a role (`administrador`, `entrenador`, `usuario`) stored as a UUID FK (`rol_id`) in `miembros_tenant` pointing to the `roles` lookup table.

Currently, roles are immutable after assignment. The `EditarPerfilMiembroModal` (US-0027) deliberately excludes role editing. This change adds an inline role selector in the `EquipoTable` so admins can change any member's role with a confirmation step.

**Existing architecture follows**: page → component → hook → service → types, with a clean barrel export in `index.ts`. All mutations go through `equipoService` and are called from `useEquipo`. Modals follow a consistent pattern (`EliminarMiembroModal`, `BloquearMiembroModal`).

## Goals / Non-Goals

**Goals:**
- Allow admins to change a team member's role directly from the Equipo table
- Prevent accidental changes via a confirmation dialog
- Protect against removing the last admin from a tenant (last-admin guard)
- Warn admins who are demoting themselves (self-demotion guard)
- Secure the mutation with RLS at the database level

**Non-Goals:**
- Bulk role changes for multiple members
- CRUD on the `roles` table itself (seed data remains fixed)
- Role editing from the `EditarPerfilMiembroModal` or a separate page
- Audit trail / role change history
- Role changes for blocked users

## Decisions

### 1. Inline `<select>` in the table vs. a separate modal for role selection

**Decision**: Replace the static `rol_nombre` text in the `Perfil` column with a native `<select>` dropdown. Changing the selection opens a confirmation modal (`CambiarRolModal`) before committing.

**Rationale**: Role changes are a single-field operation. A full-screen modal or separate page would add unnecessary friction. The inline selector keeps the admin in context while the confirmation modal prevents accidental mutations.

**Alternatives considered**:
- *Edit role inside `EditarPerfilMiembroModal`*: Rejected because that modal deals with profile data (identity, contact, sports), and mixing authorization concerns with profile editing would be conceptually wrong. Role is an access-control concept, not profile data.
- *Dedicated modal with all three options as buttons*: More clicks for no additional value.

### 2. Confirmation modal pattern

**Decision**: Use a small centered dialog (`CambiarRolModal`) matching the existing `EliminarMiembroModal` pattern — same overlay, border, button layout.

**Rationale**: Visual consistency with existing modals. Reuses the same structural pattern (null-guard on `miembro` prop, internal `isSubmitting` state, overlay + backdrop). Self-demotion shows an additional amber warning banner inside the same dialog.

### 3. Last-admin guard: service-side check before UPDATE

**Decision**: The `cambiarRolMiembro` service function queries the count of `administrador` members in the tenant before executing the UPDATE. If the target member is the sole admin and the new role is not `administrador`, the function throws `EquipoServiceError` with `code: 'last_admin'`.

**Rationale**: A Postgres trigger or check constraint would be more robust but adds complexity for a rare edge case. The service-level check is simpler, testable, and sufficient given that only admin users can invoke the mutation (enforced by RLS). The count query and UPDATE are not in a transaction, but the race window is negligible — two admins simultaneously demoting each other would require both to pass the count check and both UPDATEs to execute, but RLS already limits the caller to one admin session at a time.

**Alternatives considered**:
- *Database trigger `BEFORE UPDATE` on `miembros_tenant`*: More bulletproof but harder to surface a meaningful error message to the UI. The trigger would raise a generic exception code that the service would need to parse.
- *UI-only guard*: Insufficient — direct Supabase calls could bypass it.

### 4. Extending `EquipoServiceError` with new error code

**Decision**: Add `'last_admin'` and `'not_found'` to the `EquipoServiceError` code union type (currently `'forbidden' | 'unknown'`).

**Rationale**: The hook layer needs to distinguish between "you can't do this because you're the last admin" and other errors to show the correct UI message. Extending the existing error class is cleaner than introducing a new error type.

### 5. Roles loaded once on hook mount

**Decision**: `useEquipo` calls `getRoles()` on mount and stores the result in state. The `roles` array is passed to `EquipoTable` as a prop.

**Rationale**: The `roles` table contains exactly 3 static seed records. Fetching once on mount is effectively free and avoids redundant network calls. No cache invalidation needed since roles don't change at runtime.

### 6. RLS policy for UPDATE on `miembros_tenant`

**Decision**: Create a single `FOR UPDATE` policy on `miembros_tenant` scoped to admin tenants (`get_admin_tenants_for_authenticated_user()`). The policy constrains both `USING` and `WITH CHECK` to admin tenants.

**Rationale**: Follows the exact same pattern as the existing `miembros_tenant_delete_admin` policy from US-0027. Only `rol_id` will be set in the UPDATE payload, but the policy doesn't restrict columns — RLS operates at the row level. The service function is responsible for sending only the intended column.

### 7. Backward-compatible table props

**Decision**: `EquipoTable` receives `roles?: RolOption[]` and `onCambiarRol?: (row, nuevoRol) => void` as optional props. When both are provided, the role column renders a `<select>`; otherwise it falls back to static text.

**Rationale**: Keeps the component reusable and avoids breaking existing usage patterns if the table were ever rendered in a non-admin context.

## Data Flow

```
Admin selects new role in <select>
  → EquipoTable calls onCambiarRol(row, nuevoRol)
    → EquipoPage sets rolChangeTarget state
      → CambiarRolModal renders (with self-demotion check)
        → Admin confirms
          → EquipoPage calls cambiarRol() from useEquipo
            → useEquipo calls cambiarRolMiembro() in equipo.service.ts
              → Service: count admins (last-admin guard)
              → Service: UPDATE miembros_tenant SET rol_id
              → Hook: refresh() reloads member list
              → UI: table row reflects new role, toast shown
```

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **Race condition on last-admin check**: Two admins could theoretically pass the count check simultaneously | Negligible in practice — requires two admin sessions acting on each other in the same millisecond window. A future enhancement could add a DB trigger for absolute safety. |
| **Self-demotion causes immediate loss of admin UI**: After changing their own role, the admin's next navigation will resolve a non-admin menu | The confirmation dialog includes a prominent warning. The role change is intentional and reversible by another admin. |
| **Role change takes effect immediately for the target user**: Their next page load will render a different menu and route access | This is the desired behavior, not a bug. No "pending" state is needed. |
| **UPDATE grant on `miembros_tenant`**: Broadens the permission surface | RLS policy restricts to admin tenants. The service only sends `rol_id` in the payload. No other columns are at risk. |

## Migration Plan

1. **Create migration** `YYYYMMDDHHMMSS_equipo_update_rol.sql`:
   - `CREATE POLICY miembros_tenant_update_rol_admin` for UPDATE on `miembros_tenant`
   - `GRANT UPDATE ON TABLE public.miembros_tenant TO authenticated` (verify if already granted)
2. Run `supabase db push` or `supabase migration up` to apply.
3. **Rollback**: Drop the policy and revoke the grant — no data changes, no schema changes.

## Open Questions

- None at this time. The scope is well-defined and the implementation follows established patterns.
