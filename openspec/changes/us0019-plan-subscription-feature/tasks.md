## 1. Branch Setup

- [x] 1.1 Create feature branch: `git checkout -b feat/us0019-plan-subscription-feature`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/<timestamp>_suscripciones_planes_feature.sql`
- [x] 2.2 Add `clases_plan integer` column to `public.suscripciones` with check constraint `(clases_plan is null or clases_plan >= 0)`
- [x] 2.3 Add `comentarios text` column to `public.suscripciones`
- [x] 2.4 Drop and recreate `suscripciones_estado_ck` constraint to include `'pendiente'` alongside `activa`, `vencida`, `cancelada`
- [x] 2.5 Add RLS `INSERT` policy `suscripciones_insert_own` on `public.suscripciones` restricting to `atleta_id = auth.uid()`
- [x] 2.6 Add RLS `SELECT` policy `suscripciones_select_own` on `public.suscripciones` restricting to `atleta_id = auth.uid()`
- [x] 2.7 Add RLS `INSERT` policy `pagos_insert_own` on `public.pagos` restricting to `suscripcion_id` owned by `auth.uid()`
- [ ] 2.8 Run `supabase db push` (or `supabase migration up`) and verify the migration applies cleanly _(manual — requires linked project)_

## 3. TypeScript Types

- [x] 3.1 Create `src/types/portal/suscripciones.types.ts` — define `SuscripcionEstado`, `Suscripcion`, `SuscripcionInsert` interfaces including `clases_plan`, `comentarios`, and `estado: SuscripcionEstado`
- [x] 3.2 Create `src/types/portal/pagos.types.ts` — define `PagoEstado`, `Pago`, `PagoInsert` interfaces

## 4. Services

- [x] 4.1 Create `src/services/supabase/portal/suscripciones.service.ts` — implement `createSuscripcion(payload: SuscripcionInsert): Promise<Suscripcion>` using the browser Supabase client
- [x] 4.2 Create `src/services/supabase/portal/pagos.service.ts` — implement `createPago(payload: PagoInsert): Promise<Pago>` using the browser Supabase client
- [x] 4.3 Export both new services from `src/services/supabase/portal/index.ts`

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/planes/usePlanesView.ts` — fetches active plans (`activo = true`) for a tenant using `PlanesService.listPlans`; returns `{ loading, error, planes }`
- [x] 5.2 Create `src/hooks/portal/planes/useSuscripcion.ts` — exposes `{ modalOpen, selectedPlan, openModal(plan), closeModal(), submit(data), isSubmitting, error, successMessage }`; includes duplicate `pendiente` guard (SELECT check before INSERT); calls `createSuscripcion` then `createPago` sequentially

## 6. Components

- [x] 6.1 Modify `src/components/portal/planes/PlanesTable.tsx` — add optional `readOnly?: boolean` prop to `PlanesTableProps`; when `true`, hide the Actions column header and render no action cells per row
- [x] 6.2 Create `src/components/portal/planes/SuscripcionModal.tsx` — controlled modal with plan summary (name, price, validity, included classes), optional `comentarios` textarea, `comprobante de pago` file input (display filename only), "Confirmar" / "Cancelar" buttons, loading state on Confirmar, inline error display, duplicate-guard error display with disabled Confirmar
- [x] 6.3 Create `src/components/portal/planes/PlanesViewPage.tsx` — read-only plan list accepting `tenantId: string` and `role: UserRole` props; uses `usePlanesView` and `useSuscripcion`; renders `<PlanesTable readOnly>` with "Adquirir" button per row for `usuario` only; renders `<SuscripcionModal>` when `modalOpen` is true

## 7. Route / Page

- [x] 7.1 Delete `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`
- [x] 7.2 Create `src/app/portal/orgs/[tenant_id]/(shared)/gestion-planes/page.tsx` — server component that resolves `tenant_id` from params and `role` from the server-side session; renders `<PlanesPage>` for `administrador` and `<PlanesViewPage>` for `usuario` / `entrenador`

## 8. Navigation

- [x] 8.1 Modify `src/types/portal.types.ts` — add `{ label: 'Planes', path: 'gestion-planes', icon: 'card_membership' }` to the `usuario` array in `ROLE_TENANT_ITEMS`
- [x] 8.2 Modify `src/types/portal.types.ts` — add `{ label: 'Planes', path: 'gestion-planes', icon: 'card_membership' }` to the `entrenador` array in `ROLE_TENANT_ITEMS`
- [x] 8.3 Verify the `administrador` entry for `gestion-planes` in `ROLE_TENANT_ITEMS` is unchanged

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` — add `(shared)/gestion-planes/page.tsx` to the directory structure and remove the `(administrador)/gestion-planes/page.tsx` entry
- [x] 9.2 Update `projectspec/03-project-structure.md` — add `PlanesViewPage.tsx`, `SuscripcionModal.tsx` to the `components/portal/planes/` slice listing
- [x] 9.3 Update `projectspec/03-project-structure.md` — add `usePlanesView.ts`, `useSuscripcion.ts` to the `hooks/portal/planes/` listing
- [x] 9.4 Update `projectspec/03-project-structure.md` — add `suscripciones.service.ts`, `pagos.service.ts` to the `services/supabase/portal/` listing
- [x] 9.5 Update `projectspec/03-project-structure.md` — add `suscripciones.types.ts`, `pagos.types.ts` to the `types/portal/` listing

## 10. Manual QA

- [ ] 10.1 _(manual)_ Log in as `administrador` — navigate to `/portal/orgs/[tenant_id]/gestion-planes` and verify full CRUD view renders as before
- [ ] 10.2 _(manual)_ Log in as `entrenador` — verify "Planes" appears in the sidebar and the page shows a read-only plan list with no action buttons
- [ ] 10.3 _(manual)_ Log in as `usuario` — verify "Planes" appears in the sidebar, each active plan row has an "Adquirir" button, and inactive plans are hidden
- [ ] 10.4 _(manual)_ As `usuario`, click "Adquirir" — verify `SuscripcionModal` opens with plan summary, comentarios textarea, and comprobante file input
- [ ] 10.5 _(manual)_ As `usuario`, confirm subscription — verify `suscripciones` and `pagos` rows appear in Supabase Studio with `estado = 'pendiente'`
- [ ] 10.6 _(manual)_ As `usuario`, attempt to subscribe to the same plan again — verify the modal shows _"Ya tienes una solicitud pendiente para este plan"_ and Confirmar is disabled

## 11. Commit and Pull Request

- [ ] 11.1 Stage all changes and create a commit with message: `feat(planes): add plan subscription flow for usuario/entrenador roles (US-0019)`
- [ ] 11.2 Push the feature branch and open a pull request with the following description:

  **Title:** `feat: Plan membership subscription feature (US-0019)`

  **Description:**
  - Migrates `gestion-planes` from `(administrador)` to `(shared)` route group (URL unchanged; admin CRUD unaffected)
  - Adds read-only plan catalogue for `usuario` and `entrenador` roles (`activo = true` filter)
  - Adds "Adquirir" flow for `usuario`: `SuscripcionModal` → `suscripciones` + `pagos` insert with `estado = 'pendiente'`
  - Blocks duplicate pending subscription for the same user/plan
  - DB: adds `clases_plan`, `comentarios` columns; extends `estado` constraint; adds RLS policies for suscripciones (INSERT/SELECT own) and pagos (INSERT own)
  - Adds "Planes" nav entry to `usuario` and `entrenador` in `ROLE_TENANT_ITEMS`
