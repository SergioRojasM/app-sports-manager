## Context

The portal currently has a `gestion-planes` module scoped exclusively to the `(administrador)` route group. Non-admin roles have no view of available plans and cannot self-initiate enrolment. Because Next.js route groups are URL-transparent (both `(administrador)/gestion-planes` and `(shared)/gestion-planes` resolve to the same path), the admin-only route **must be deleted** and replaced with a single unified `(shared)` route that gate-renders by role.

The feature follows the portal's established **hexagonal architecture + feature-slice** pattern:

```
page (delivery) → component (presentation) → hook (application) → service (outbound) → types (domain)
```

Existing analogues:
- `PlanFormModal` / `ReservaFormModal` — modal interaction pattern to reuse.
- `usePlanes` / `useReservaForm` — hook pattern for CRUD + form orchestration.
- `reservas.service.ts` — service pattern for single-row Supabase insert with browser client.

---

## Goals / Non-Goals

**Goals:**
- Expose `gestion-planes` to `usuario` and `entrenador` roles (read-only).
- Allow `usuario` to submit a plan subscription request (`suscripciones` + `pagos` rows) with `estado = 'pendiente'`.
- Migrate the admin route from `(administrador)` to `(shared)` transparently — URL unchanged, admin CRUD behaviour unchanged.
- Add `clases_plan` (snapshot) and `comentarios` columns to `public.suscripciones`.
- Extend `estado` constraint to include `'pendiente'`.
- Add RLS policies for `suscripciones` (INSERT + SELECT own) and `pagos` (INSERT own).
- Add "Planes" nav entry for `usuario` and `entrenador` in `ROLE_TENANT_ITEMS`.

**Non-Goals:**
- Supabase Storage upload / signed-URL for `comprobante_url` (field stored as `null`).
- Admin approval / rejection of subscriptions or payments.
- Subscription lifecycle transitions beyond initial `pendiente`.
- Displaying subscription history to the user.

---

## Decisions

### 1. Unified `(shared)` route with role-aware rendering

**Decision:** Create one `(shared)/gestion-planes/page.tsx` that reads the user role server-side and renders `<PlanesPage>` (admin) or `<PlanesViewPage>` (others).

**Rationale:** Next.js route-group transparency means two groups cannot share the same slug. Centralising the route in `(shared)` avoids a 404 race between groups and eliminates duplication. The role gate belongs at the page (delivery) layer, not inside the component.

**Alternative considered:** Keep the admin route and add a separate `(atleta)` or `(shared)` route with a redirect. Rejected — two files resolving to the same URL is undefined behaviour in Next.js App Router.

---

### 2. New `PlanesViewPage` component — do NOT modify `PlanesPage`

**Decision:** Introduce `PlanesViewPage` as a separate component rather than adding conditional logic to the existing `PlanesPage`.

**Rationale:** `PlanesPage` owns full CRUD state (form modal, delete confirmation, etc.). Mixing `readOnly` guards into it would increase its surface area and risk regressions for admins. A separate component follows the single-responsibility principle and is consistent with how `EntrenamientosPage` vs. `EntrenamientosDisponiblesPage` were separated.

---

### 3. `PlanesTable` `readOnly` prop — minimal invasive change

**Decision:** Add optional `readOnly?: boolean` to `PlanesTableProps`. When `true`, omit the Actions column header and render no action cells per row.

**Rationale:** The table already renders the plan data; hiding the Actions column is the smallest possible change to support both admin and view contexts. No new component fork is needed.

---

### 4. Two-step insert: `suscripciones` then `pagos`

**Decision:** `useSuscripcion` calls `createSuscripcion` first, then `createPago` with the returned `id`. No DB transaction wrapper.

**Rationale:** Supabase browser client does not expose interactive transactions. The `pagos` row has a `suscripcion_id FK` so it must be inserted after. If `createPago` fails, the orphan `suscripciones` row with `estado = 'pendiente'` is benign — an admin can detect and clean it up. A full rollback (RPC function) is out of scope for this US.

**Alternative considered:** Postgres function (RPC) for atomic insert. Deferred to a future US when the payment flow matures.

---

### 5. `clases_plan` as a nullable integer snapshot

**Decision:** `clases_plan integer null` — nullable because some plans may have `clases_incluidas = null` (unlimited plans). The snapshot captures the value at subscription time so subsequent plan edits don't corrupt the user's entitlement.

---

### 6. `comprobante_url` stored as `null`

**Decision:** The file input in `SuscripcionModal` is UI-only (reads filename for display). `comprobante_url` is inserted as `null`. Storage integration is a future US.

---

### 7. Block duplicate `pendiente` subscription for the same user + plan

**Decision:** Before calling `createSuscripcion`, `useSuscripcion` queries `suscripciones` for a row matching `(atleta_id = auth.uid(), plan_id = selectedPlan.id, estado = 'pendiente')`. If one exists, the modal shows an inline error — _"Ya tienes una solicitud pendiente para este plan"_ — and the Confirmar button is disabled. No insert is made.

**Rationale:** Allowing multiple `pendiente` rows for the same plan/user creates confusion during admin review and may result in duplicate charges. The guard is a client-side check (cheap SELECT) that is sufficient given the existing RLS scope (`atleta_id = auth.uid()`).

**Alternative considered:** Unique DB constraint on `(atleta_id, plan_id)` filtered to `estado = 'pendiente'` (partial index). Deferred — constraint would need a migration and would generate a harder-to-surface DB error; a UI-layer guard is more user-friendly for now.

---

### 8. `PlanesViewPage` shows only `activo = true` plans

**Decision:** `usePlanesView` queries `planes` with `activo = true` filter. Inactive plans are not shown to `usuario` or `entrenador`.

**Rationale:** Non-admin roles cannot act on inactive plans; displaying them adds noise. Admins see all plans through `PlanesPage` (unchanged). The `activo` filter is applied at the service layer (`usePlanesView` / `PlanesService.listPlans` with an extra filter arg), keeping the query consistent with the existing `idx_planes_tenant_id` index.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Orphan `suscripciones` row if `createPago` fails | `estado = 'pendiente'` is safe; admin dashboard (future US) will surface these. Log the error client-side. |
| Admin accidentally hits the new shared route and sees the wrong view | Role is resolved server-side from the validated session; no client-side role spoofing possible. |
| `(administrador)/gestion-planes/page.tsx` deletion breaks any direct import | There are no direct imports of the page file (pages are entry-points only). Verified by grep — no other file imports this path. |
| `estado` constraint change requires a migration that runs against existing rows | All existing rows have `estado IN ('activa','vencida','cancelada')`; adding `'pendiente'` to the constraint is additive, non-breaking. |
| `PlanesTable` `readOnly` prop could be forgotten and accidentally expose edit buttons | TypeScript prop typing + explicit `readOnly={true}` call at `PlanesViewPage` instantiation site. |

---

## Migration Plan

1. **Apply Supabase migration** — run `supabase db push` (or `supabase migration up`) with the new SQL file. Safe to run on production: all changes are additive (`add column if not exists`, constraint drop+recreate, new policies).
2. **Deploy Next.js** — the route migration is zero-downtime: the URL `/portal/orgs/[tenant_id]/gestion-planes` continues to work; only the serving file changes.
3. **Rollback** — revert the Next.js deployment. Re-add the `(administrador)/gestion-planes/page.tsx` file. For the DB: the new columns and policies do not affect existing queries; leaving them in place is safe. Reversing the `estado` constraint is only needed if the `'pendiente'` value was written to production rows (unlikely without the new code deployed).

---

## Open Questions

_All questions resolved. See Decisions #7 and #8._
