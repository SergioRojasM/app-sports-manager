## Context

The `gestion-suscripciones` feature slice already supports validating payments (`ValidarPagoModal` + `useValidarPago`) and approving/cancelling subscriptions (`ValidarSuscripcionModal` + `useValidarSuscripcion`). Both follow the same pattern: a modal component receives a `SuscripcionAdminRow`, delegates to a focused hook, and calls `onSuccess` + `onClose` on completion. The page component (`GestionSuscripcionesPage`) mounts modals conditionally based on `selectedRow` + `modalType` state managed in `useGestionSuscripciones`.

US0032 adds two new mutations — full-field edit and permanent delete — that must slot into this established pattern without disrupting existing functionality.

---

## Goals / Non-Goals

**Goals:**
- Add `EditarSuscripcionModal` + `useEditarSuscripcion` for full-field edit following the existing modal/hook pattern.
- Add `EliminarSuscripcionModal` + `useEliminarSuscripcion` for delete-with-confirmation following the same pattern.
- Extend `gestionSuscripcionesService` with `editarSuscripcion` and `eliminarSuscripcion` service methods.
- Extend `useGestionSuscripciones` to expose `openEditarModal` and `openEliminarModal` handlers and updated `ModalType`.
- Add `EditarSuscripcionFormValues` to the types file.
- Add a Supabase migration granting DELETE on `public.suscripciones` and creating a tenant-scoped RLS policy.
- Wire new buttons into `SuscripcionesTable` Actions column.

**Non-Goals:**
- No changes to existing `ValidarPagoModal`, `ValidarSuscripcionModal`, or their hooks.
- No changes to athlete-facing views or athlete RLS.
- No bulk edit / bulk delete.
- No soft-delete or audit trail.
- No changes to the plan subscription flow (`SuscripcionModal`).

---

## Decisions

### 1. Reuse existing modal / hook / service pattern without abstraction

**Decision:** Each new action gets its own focused hook (`useEditarSuscripcion`, `useEliminarSuscripcion`) mirroring `useValidarPago` / `useValidarSuscripcion`. No shared base class or generic hook.

**Rationale:** The existing codebase has four focused hooks for four mutations; they are small, readable, and colocated. Introducing a generic mutation hook to DRY them up would add indirection without meaningful benefit at this scale. Consistency with the existing pattern beats premature abstraction.

**Alternative considered:** Generic `useSuscripcionMutation<T>` hook — rejected; the form state shape differs too much between edit and delete to share usefully.

---

### 2. Plan selector in `EditarSuscripcionModal` uses a lightweight inline fetch

**Decision:** `useEditarSuscripcion` will fetch the tenant's active plans once on mount (via `planesService.getPlanesByTenant` or a similar lightweight query) and store them in local state. The `plan_id` select renders from this list.

**Rationale:** The edit modal needs a current list of active plans. There is no global plans store in this feature slice. A short one-time fetch at modal open is consistent with how `ValidarSuscripcionModal` handles its own pre-computation. Sharing a cross-slice hook (e.g., `usePlanes`) would couple the `gestion-suscripciones` slice to `gestion-planes`.

**Alternative considered:** Pass plans list down from the page as a prop — rejected; it would require the page to always fetch plans even when the modal is never opened.

---

### 3. Extend `ModalType` union in `useGestionSuscripciones` rather than separate state

**Decision:** The existing `ModalType = 'pago' | 'suscripcion' | null` union is extended to `'pago' | 'suscripcion' | 'editar' | 'eliminar' | null`. Two new openers (`openEditarModal`, `openEliminarModal`) are added alongside the existing two.

**Rationale:** All four modals share `selectedRow` state and the same `closeModal` pattern. Keeping them in one union avoids multiple independent booleans that could conflict.

**Alternative considered:** Separate `editarRow` / `eliminarRow` state — rejected; would duplicate the existing selectedRow+type pair without benefit.

---

### 4. DELETE RLS via dedicated policy + GRANT, not extending the existing UPDATE policy

**Decision:** A new migration adds `GRANT DELETE ON public.suscripciones TO authenticated` and a new `suscripciones_delete_admin` policy using `FOR DELETE ... USING (tenant_id IN (SELECT ... FROM get_admin_tenants_for_authenticated_user()))`. The existing SELECT/UPDATE policies remain untouched.

**Rationale:** Supabase RLS policies are operation-scoped. The existing `suscripciones_select_admin` and `suscripciones_update_admin` policies cannot be repurposed for DELETE. A dedicated policy is required and keeps intent explicit. Cascading deletion of `pagos` is already handled by the existing `pagos.suscripcion_id → suscripciones.id ON DELETE CASCADE` FK — no additional policy work needed for `pagos`.

---

### 5. Component implementation follows page → component → hook → service → types order

**Implementation sequence:**
1. `EditarSuscripcionFormValues` type (extends types file)
2. `gestionSuscripcionesService.editarSuscripcion` + `eliminarSuscripcion` methods
3. `useEditarSuscripcion` hook
4. `useEliminarSuscripcion` hook
5. `useGestionSuscripciones` — extend `ModalType`, add openers
6. `EditarSuscripcionModal` component
7. `EliminarSuscripcionModal` component
8. `SuscripcionesTable` — add "Editar" + "Eliminar" buttons and `onEditar` / `onEliminar` props
9. `GestionSuscripcionesPage` — mount new modals
10. Database migration

---

## Risks / Trade-offs

- **[Risk] Accidental deletion of production data** → Mitigation: `EliminarSuscripcionModal` always shows the athlete name + plan name for visual confirmation; the delete RLS policy is tenant-scoped so admins cannot delete records from other tenants regardless of UI bypass.

- **[Risk] Plan list in edit modal is stale if plans change mid-session** → Mitigation: Plans are fetched fresh on each modal open, so the list is always current. Acceptable for an admin-only low-frequency action.

- **[Risk] Race condition: row deleted by another admin while edit modal is open** → Mitigation: Service errors are caught and displayed inline; the `update` call will return zero rows and Supabase will return no error (silent no-op). This is acceptable — the admin sees a success, refresh shows the row is gone. For a higher-stakes scenario a row version check would be warranted; it is out of scope here.

- **[Trade-off] Cascade delete is implicit** → The `pagos` rows are removed via FK cascade, not explicit service code. This is safe and correct given the schema, but is invisible to the admin. The confirmation dialog text should mention that associated payments will also be removed.

---

## Migration Plan

1. Create migration file: `supabase/migrations/YYYYMMDD000100_suscripciones_admin_delete_rls.sql`
   - `GRANT DELETE ON public.suscripciones TO authenticated;`
   - `DROP POLICY IF EXISTS suscripciones_delete_admin ON public.suscripciones;`
   - `CREATE POLICY suscripciones_delete_admin ON public.suscripciones FOR DELETE TO authenticated USING (tenant_id IN (SELECT id FROM public.get_admin_tenants_for_authenticated_user()));`
2. Apply migration via `supabase db push` (local) or Supabase dashboard (production).
3. **Rollback:** Drop the `suscripciones_delete_admin` policy and `REVOKE DELETE ON public.suscripciones FROM authenticated`. No data migrations required.

---

## Open Questions

- None blocking implementation.
