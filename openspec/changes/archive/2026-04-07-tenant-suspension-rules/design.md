## Context

The `gestion-organizacion` page already has an established card/list/modal pattern for admin-managed tenant settings, implemented in `TenantPaymentMethodsCard` + `MetodoPagoFormModal`. This US adds the same pattern for suspension rules configuration. The data layer requires a new Supabase table (`tenant_reglas_suspension`) with RLS policies consistent with the existing `tenant_metodos_pago` table. The business rule of a maximum of 3 rules per tenant is enforced at the application layer (hook guard + disabled button), not at the DB level, consistent with how similar quantity limits are handled elsewhere in the portal.

## Goals / Non-Goals

**Goals:**
- Introduce `tenant_reglas_suspension` table with RLS (admin write, all-authenticated read).
- Provide full CRUD UI for suspension rules on the `gestion-organizacion` page.
- Enforce 3-rule maximum at the application layer with a disabled add-button + tooltip.
- Display `duracion = 0` as "Permanente" and `por_dias_atras = 0` as "No aplica" everywhere.
- Surface DB and service errors as toast notifications; map duplicate-name DB error to an inline form field error under `nombre`.

**Non-Goals:**
- Automatic suspension execution (application of rules to real attendance data).
- DB-level trigger enforcing the 3-rule maximum.
- Pagination or filtering of rules (max 3 rows per tenant).
- Rule ordering / drag-and-drop.

## Decisions

### 1 — Mirror `TenantPaymentMethodsCard` pattern exactly
**Decision:** Reuse the same card → list-row → slide-in-modal structure from `TenantPaymentMethodsCard` / `MetodoPagoFormModal`.  
**Rationale:** Consistency with the existing admin settings UI. Reduces design decisions and keeps the component surface familiar for admins.  
**Alternative considered:** A standalone table component — rejected because the entity set is too small (≤ 3 rows) to warrant a full data table.

### 2 — Application-layer 3-rule guard (no DB trigger)
**Decision:** The hook (`useReglasSuspension`) checks `rules.length >= 3` before allowing `openCreateModal()`. The "Add Rule" button renders with `disabled` + tooltip when the count is at 3.  
**Rationale:** US explicitly calls this approach out. Adding a DB trigger would add migration complexity with little benefit since the UI is the only write path.  
**Alternative:** DB-level `BEFORE INSERT` trigger — deferred to a future hardening story if needed.

### 3 — Service layer via Supabase JS client (no edge functions)
**Decision:** All four CRUD functions live in `src/services/supabase/portal/reglas-suspension.service.ts` and call the Supabase JS client directly.  
**Rationale:** Consistent with all other portal services. No computed fields or complex joins require server-side logic.

### 4 — Validation: at-least-one-condition rule in the form
**Decision:** `react-hook-form` `validate` on `por_suscripcion`/`por_dias_atras` fields: if `por_suscripcion === false && (por_dias_atras ?? 0) <= 0` → inline error "Debe seleccionar al menos una condición".  
**Rationale:** This is a domain constraint, not a DB constraint. Inline form validation provides immediate feedback without a round-trip.

### 5 — `duracion` / `por_dias_atras` zero-value display helpers
**Decision:** Two small pure-function helpers (or inline ternaries in the row component): `duracion === 0 ? 'Permanente' : `${duracion} días`` and `por_dias_atras === 0 ? 'No aplica' : `Últimos ${por_dias_atras} días``.  
**Rationale:** Centralises display formatting so both the list row and form hint stay in sync.

## Risks / Trade-offs

- **Duplicate `nombre` error from DB:** The unique constraint `(tenant_id, nombre)` will throw a PostgREST 409. Risk: the generic toast catches it but doesn't map it to the field. Mitigation: catch the error code `23505` in the service/hook and set a `setError('nombre', ...)` on the form.
- **RLS `get_admin_tenants_for_authenticated_user()` performance:** All write policies call this set-returning function. Risk: slow if the function does a full join. Mitigation: already indexed and used in other tables — no new risk introduced here.
- **3-rule guard race condition:** Two simultaneous inserts from different browsers could bypass the app-layer guard. Mitigation: acceptable for MVP; add a DB trigger in a hardening story if needed.

## Migration Plan

1. Run migration `20260407000100_tenant_reglas_suspension.sql` via `supabase db push` or CI migration step.
2. No data backfill needed (new table, no existing rows).
3. Rollback: `DROP TABLE IF EXISTS public.tenant_reglas_suspension CASCADE;` (safe — no other table depends on it yet).
4. Deploy frontend changes after (or simultaneously with) migration — the new card is additive; it doesn't break any existing page if the table migration is applied first.

## Open Questions

- Should inactive rules (`activo = false`) count toward the 3-rule maximum? **Assumed YES** (consistent with the US description which refers to "rules", not "active rules"). This can be revisited if the product team wants inactive rules to be free slots.
