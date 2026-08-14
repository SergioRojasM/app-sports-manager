## Context

US-0067 adds two related capabilities to the `gestion-suscripciones` admin module:

1. **Service unit editing** — admins can manually override `unidades_restantes` in `suscripcion_servicios` from the edit modal. Currently the field is fetched and displayed in the table but is not editable anywhere in the UI. The `suscripcion_servicios` table has SELECT-only RLS; all writes go through SECURITY DEFINER functions.

2. **Table visual refactor** — `SuscripcionesTable` columns are adjusted per six specific layout rules to reduce horizontal density and improve information hierarchy.

The project has no installed icon library; icons are rendered as inline SVGs. The architecture follows a feature-slice pattern: page → component → hook → service → types. All changes are scoped to the `gestion-suscripciones` feature slice.

## Goals / Non-Goals

**Goals:**
- Introduce a SECURITY DEFINER RPC that allows admin-tenant members to update `unidades_restantes` on a `suscripcion_servicios` row.
- Extend `EditarSuscripcionFormValues` with a `servicios` array and update the hook and modal to pre-populate, edit, and persist per-service unit changes (only for changed rows).
- Refactor `SuscripcionesTable` with narrower ATLETA/PLAN columns, uniform-size date cells, a wider SERVICIOS column capped at 2 entries (finite-unit first) with a clickable "+X más" button, uniform-size VALIDACIÓN names, and SVG icon action buttons.
- Introduce a `VerServiciosModal` (read-only) opened by the "+X más" button.

**Non-Goals:**
- Bulk-reset of all service units to plan defaults.
- Editing `unidades_incluidas` (read-only snapshot).
- Adding or removing service rows from a subscription.
- Visual changes to any view outside `gestion-suscripciones`.

## Decisions

### D1: SECURITY DEFINER function vs. relaxed RLS

**Decision**: New SECURITY DEFINER function `admin_update_suscripcion_servicio_unidades`.

**Rationale**: The existing pattern for all writes to `suscripcion_servicios` uses SECURITY DEFINER functions (`populate_suscripcion_servicios`, `book_and_deduct_service_units`). Keeping the same pattern avoids the risk of inadvertently exposing the table to direct client writes, and the tenant-admin validation check can be performed inside the function itself using the existing `get_admin_tenants_for_authenticated_user()` helper — without adding a new RLS `UPDATE` policy that would be harder to audit. The function also enforces the `unidades_restantes >= 0` constraint before hitting the DB check.

**Alternative considered**: Add an `UPDATE` RLS policy scoped to admin tenants. Rejected because it requires the client to already hold the correct `suscripcion_id → tenant_id` mapping and doesn't validate the calling user's admin membership at the database level in a single place.

### D2: Submit strategy — diff only changed rows

**Decision**: `useEditarSuscripcion.submit()` compares `formValues.servicios[i].unidades_restantes` against `row.servicios[i].unidades_restantes` and calls the RPC only for changed entries.

**Rationale**: Subscriptions can have multiple services. Calling the RPC for every row on every save — even when nothing changed — introduces unnecessary write traffic and makes the audit trail noisy. Diffing in the hook is cheap (array length typically ≤ 5).

**Alternative considered**: Always send all rows. Simple but wasteful; rejected.

### D3: Error handling — save subscription fields first, then services

**Decision**: `submit()` calls `editarSuscripcion` for the subscription row first, then loops through service unit changes. If a service unit RPC call fails, the hook sets an error message and stops. The subscription fields are already saved; the user sees the error and can retry.

**Rationale**: The subscription field save (plan, estado, dates, comments) is the primary action; service units are supplementary. Rolling back the subscription save on a service unit failure adds complexity and is confusing UX — the admin intended to save both but the subscription save succeeded cleanly.

**Alternative considered**: Transaction-style all-or-nothing via a single RPC. Would require a new batch RPC accepting a JSONB array of `(servicio_id, unidades_restantes)` updates. Reasonable, but the per-row loop is simpler to implement and maintain for now; the batch RPC can be introduced if service count grows significantly.

### D4: Icon strategy — inline SVGs

**Decision**: All action button icons are inline SVGs (16×16 px viewBox).

**Rationale**: No icon library is installed in the project (`package.json` has no `lucide-react`, `heroicons`, or similar). Adding one for six icons is over-engineering. Inline SVGs keep the bundle clean and are copy-pasteable from any SVG source.

### D5: "+X más" click target — new VerServiciosModal

**Decision**: A dedicated `VerServiciosModal` rather than a tooltip or inline expand.

**Rationale**: The services list for a subscription can contain many entries. Tooltips are hard to interact with on mobile and clip long service names. Inline expand pushes table rows apart. A modal is consistent with the existing pattern (`VerDetallePagoModal`) and keeps the table compact.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Admin calls `admin_update_suscripcion_servicio_unidades` on a subscription that belongs to a different tenant | Function resolves `tenant_id` from `suscripciones` and cross-checks against `get_admin_tenants_for_authenticated_user()` before writing; raises `42501` otherwise |
| Partial save: subscription fields updated, one service unit RPC fails | User sees inline error; subscription save is not rolled back. The error message identifies the service-unit step so the admin knows to retry only that part |
| `row.servicios` and `formValues.servicios` index drift if the row prop changes mid-edit | `useEffect` on `row` resets `formValues.servicios` from `row.servicios` unconditionally; hook input `row` is only changed when a new modal is opened |
| Inline SVG maintenance burden | Icons are simple shapes (pencil, trash, check, x). Once defined in the component they rarely change |
| `SuscripcionesTable` truncation hides long names | `title` attribute on the truncated cell surfaces the full value on hover |

## Migration Plan

1. Create migration file `supabase/migrations/{timestamp}_admin_update_suscripcion_servicio_unidades.sql`.
2. Apply locally: `npx supabase db reset` or `npx supabase migration up`.
3. No column changes — function-only migration is safe to apply incrementally.
4. **Rollback**: `DROP FUNCTION IF EXISTS public.admin_update_suscripcion_servicio_unidades(uuid, uuid, integer)` — no data change is made by the migration itself.
5. Remote Supabase deployment: out of scope for this story; apply to remote only when the branch is merged.

## Open Questions

- None. All decisions are resolved based on existing codebase patterns.
