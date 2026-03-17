## Why

The `gestion-planes` module is currently admin-only; `usuario` and `entrenador` roles have no visibility into available membership plans and no way to self-initiate enrollment. Enabling users to browse plans and submit subscription requests removes the administrative bottleneck of manually entering each enrolment.

## What Changes

- **BREAKING — Route migration**: Delete `(administrador)/gestion-planes/page.tsx` and replace it with a unified `(shared)/gestion-planes/page.tsx` that renders per role. Because Next.js route groups are URL-transparent, both paths resolve to the same URL; they cannot coexist, so the admin route must be removed.
- Add `PlanesViewPage` component — read-only plan catalogue for `usuario` and `entrenador` roles.
- Add `SuscripcionModal` component — subscription request modal (plan summary, optional comentarios, comprobante file input UI only) for `usuario` role.
- Modify `PlanesTable` to accept an optional `readOnly` prop that hides the Actions column.
- Add `usePlanesView` hook — fetches active tenant plans (no mutations).
- Add `useSuscripcion` hook — orchestrates the subscription request flow (open modal, submit, success/error state).
- Add `SuscripcionesService.createSuscripcion` and `PagosService.createPago` service methods.
- Add TypeScript types for `Suscripcion`, `SuscripcionInsert`, `Pago`, `PagoInsert`.
- Database migration: add `clases_plan` column (snapshot), add `comentarios` column, extend `estado` constraint to include `'pendiente'`, add RLS INSERT/SELECT policies for `suscripciones` (own record) and RLS INSERT for `pagos` (own subscription record).
- Update `ROLE_TENANT_ITEMS` in `portal.types.ts` to add a **"Planes"** nav entry for `usuario` and `entrenador` roles, pointing to `gestion-planes`.

## Capabilities

### New Capabilities

- `plan-subscription`: End-to-end subscription request flow — browsing active plans as a non-admin, submitting a `suscripciones` record with `estado = 'pendiente'` plus a linked `pagos` record, including the database schema changes (`clases_plan`, `comentarios`, updated `estado` constraint, RLS policies).

### Modified Capabilities

- `portal-role-navigation`: The sidebar navigation REQUIREMENTS change — `usuario` and `entrenador` roles must now include a **"Planes"** (`gestion-planes`) entry in their tenant-scoped menus, which is a spec-level behaviour change to the role-based sidebar rules.

## Impact

### Database
- `public.suscripciones`: two new columns (`clases_plan integer`, `comentarios text`), updated `estado` check constraint (adds `'pendiente'`).
- `public.pagos`: new RLS INSERT policy.
- New RLS policies scoped to `auth.uid()`.

### Routes
- **Deleted**: `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`
- **Created**: `src/app/portal/orgs/[tenant_id]/(shared)/gestion-planes/page.tsx`

### Components
- **Created**: `src/components/portal/planes/PlanesViewPage.tsx`
- **Created**: `src/components/portal/planes/SuscripcionModal.tsx`
- **Modified**: `src/components/portal/planes/PlanesTable.tsx` — add `readOnly` prop

### Hooks
- **Created**: `src/hooks/portal/planes/usePlanesView.ts`
- **Created**: `src/hooks/portal/planes/useSuscripcion.ts`

### Services
- **Created**: `src/services/supabase/portal/suscripciones.service.ts`
- **Created**: `src/services/supabase/portal/pagos.service.ts`

### Types
- **Created**: `src/types/portal/suscripciones.types.ts`
- **Created**: `src/types/portal/pagos.types.ts`
- **Modified**: `src/types/portal.types.ts` — `ROLE_TENANT_ITEMS` for `usuario` and `entrenador`

### Migrations
- **Created**: `supabase/migrations/<timestamp>_suscripciones_planes_feature.sql`

### Non-goals
- Supabase Storage upload and signed-URL persistence for `comprobante_url`.
- Administrator approval / rejection workflow for subscriptions and payments.
- Subscription lifecycle transitions beyond initial `pendiente` state.
- Displaying subscription history or status to the user.

## Implementation Plan

1. **Database Migration** — `clases_plan`, `comentarios` columns; updated `estado` constraint; RLS INSERT/SELECT for `suscripciones`; RLS INSERT for `pagos`.
2. **TypeScript Types** — `suscripciones.types.ts`, `pagos.types.ts`.
3. **Services** — `suscripciones.service.ts` (`createSuscripcion`), `pagos.service.ts` (`createPago`).
4. **Hooks** — `usePlanesView.ts`, `useSuscripcion.ts`.
5. **`SuscripcionModal` component** — plan summary, comentarios, comprobante file input (UI only), Confirmar/Cancelar, loading/error states.
6. **`PlanesViewPage` component** — read-only plan list; shows "Adquirir" per row for `usuario` only.
7. **`PlanesTable` read-only mode** — `readOnly?: boolean` prop hides Actions column.
8. **Unified Shared Route** — delete admin route; create shared route with role-aware rendering.
9. **Navigation** — add "Planes" entry to `usuario` and `entrenador` in `ROLE_TENANT_ITEMS`.
10. **Manual QA** — verify admin CRUD unchanged, usuario can subscribe, entrenador is read-only, `pendiente` records appear in Supabase Studio.
