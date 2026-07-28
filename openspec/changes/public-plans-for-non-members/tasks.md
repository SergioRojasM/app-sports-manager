## 1. Branch setup

- [x] 1.1 Create the working branch `feat/public-plans-for-non-members` from `develop`
- [x] 1.2 Verify the working branch is not `main`, `master` or `develop` before making any change

## 2. Database migration (local only)

- [x] 2.1 Create `supabase/migrations/20260728000100_planes_publicos.sql` adding `planes.es_publico boolean not null default false`, its column comment, and the partial index `idx_planes_es_publico (tenant_id) where es_publico`
- [x] 2.2 Add the `security definer stable` helper `get_member_tenants_for_authenticated_user()` returning the caller's `miembros_tenant.tenant_id` rows, granted to `authenticated`
- [x] 2.3 Add the `security definer stable` helpers `can_read_plan(uuid)`, `can_read_plan_tipo(uuid)` and `can_read_servicio(uuid)` implementing "member OR public OR already-subscribed" (services: member OR granted by a public plan subtype OR already held in `suscripcion_servicios`), granted to `authenticated`
- [x] 2.4 Add the `security definer stable` helper `can_subscribe_to_plan(uuid, uuid)` requiring the plan to be `activo` and either public or owned by a tenant the caller belongs to, granted to `authenticated`
- [x] 2.5 Replace the SELECT policies on `planes`, `plan_tipos`, `plan_tipos_servicios` and `planes_disciplina` to use the new helpers instead of `using (true)`
- [x] 2.6 Replace the SELECT policy on `servicios` with `using (public.can_read_servicio(id))`
- [x] 2.7 Replace `suscripciones_insert_own` with `atleta_id = auth.uid() and public.can_subscribe_to_plan(plan_id, tenant_id)`
- [x] 2.8 Apply the migration to the **local** Supabase stack only (never push to a remote project)
- [x] 2.9 Verify every replaced policy with SQL as four personas — tenant admin, tenant `usuario` member, non-member holding a subscription, non-member holding none — confirming private plans/subtypes/services/disciplinas are invisible to non-members and fully visible to members
- [x] 2.10 Verify the insert policy directly: a non-member insert against a public plan succeeds, the same insert against a private or inactive plan is rejected with `42501`, and admin-on-behalf creation still succeeds

- [x] 2.11 Create `supabase/migrations/20260728000200_receipts_storage_no_miembros.sql`: widen `athlete_upload_own_receipts` so the caller may be an active member **or** a subscription holder in the tenant (a non-member buyer has no `miembros_tenant` row and could not upload their comprobante)
- [x] 2.12 Add the missing `athlete_update_own_receipts` UPDATE policy so `uploadPaymentProof`'s `upsert: true` re-upload works — a pre-existing gap that broke re-uploads for every athlete, member or not
- [x] 2.13 Add `user_read_own_files` SELECT policy so a non-member buyer can read back their own comprobante (signed URL), while `org_member_read` keeps covering administrators validating the payment
- [x] 2.14 Verify over the Storage API: non-member upload, non-member upsert, non-member read + signed URL, administrator read, and rejection when writing into another user's folder

- [x] 2.15 Create `supabase/migrations/20260728000300_fix_select_policies_returning.sql`: rewrite the `planes` and `servicios` SELECT policies over the row's own columns instead of `can_read_plan(id)` / `can_read_servicio(id)`, which broke `INSERT ... RETURNING` (a STABLE function cannot see the row its own statement is inserting) and made plan/service creation fail with `42501`; drop the now-unused `can_read_servicio`
- [x] 2.16 Verify every write path that uses RETURNING: create plan (private/public/inactive), update plan, create plan subtype, create service, plus the `planes_disciplina` and `plan_tipos_servicios` inserts — and re-confirm the hardening still holds afterwards

## 3. Types

- [x] 3.1 Add `es_publico: boolean` to `Plan`, `esPublico?: boolean` to `CreatePlanInput`/`UpdatePlanInput`, `es_publico: boolean` to `PlanFormValues`, and `'es_publico'` to the `PlanFormField` union in `src/types/portal/planes.types.ts`
- [x] 3.2 Create `src/types/portal/planes-publicos.types.ts` with `PlanPublicoItem` (plan + resolved discipline names + active subtypes), `PlanPublicoTipoItem` (subtype + its service rows with names and units) and the hook's state contract
- [x] 3.3 Rename `src/types/portal/mis-suscripciones-y-pagos.types.ts` to `src/types/portal/mis-suscripciones.types.ts` and add `tenant_id: string` and `tenant_nombre: string` to `MiSuscripcionRow`

## 4. Services

- [x] 4.1 Add `es_publico` to the select lists and the insert/update payloads of `getPlanes`, `createPlan` and `updatePlan` in `src/services/supabase/portal/planes.service.ts`, mapping it in `mapPlanRow`
- [x] 4.2 Add `getPlanesPublicos(tenantId)` to `planes.service.ts` — one query filtered by `tenant_id`, `es_publico = true`, `activo = true`, embedding `planes_disciplina` and `plan_tipos → plan_tipos_servicios → servicios(nombre)`, reusing `mapPlanRow` and `mapPostgrestError`
- [x] 4.3 Replace `fetchMisSuscripcionesTenant` with `fetchMisSuscripciones(supabase, userId)` in `src/services/supabase/portal/mis-suscripciones.service.ts` — no tenant filter, add `tenant_id` and `tenant:tenants!suscripciones_tenant_id_fkey(nombre)` to the select, keep the existing `pagos` and `suscripcion_servicios` embeds and ordering, and update the type import path

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/planes-publicos/usePlanesPublicos.ts` — loads `getPlanesPublicos(tenantId)` and `listDisciplinesByTenant(tenantId)` on open, keeps only active subtypes via `getActiveTipos`, exposes `{ loading, error, plans, filteredPlans, search, setSearch, retry }`
- [x] 5.2 Implement the accent- and case-insensitive matcher in `usePlanesPublicos` covering plan name, description, benefits, subtype name and service name, keeping a plan visible when any nested match occurs, with no server request on keystroke
- [x] 5.3 Carry `es_publico` through `src/hooks/portal/planes/usePlanForm.ts` (initial values, `setFormFromPlan`, `setFormForDuplicate`, change handler) and `usePlanes.ts` (create/update payloads)
- [x] 5.4 Move `useMisSuscripciones.ts` to `src/hooks/portal/mis-suscripciones/` and add the `tenantFilter` state AND-ed with the existing status filters, plus a `tenantOptions` list derived from the loaded rows and a `clearFilters` that resets all three
- [x] 5.5 Move `useSubirComprobante.ts` to `src/hooks/portal/mis-suscripciones/` with no logic change and fix its imports

## 6. Components — public plans catalog

- [x] 6.1 Create `src/components/portal/planes-publicos/PlanPublicoCard.tsx` — plan name, modalidad, discipline chips, benefits, one row per active subtype with COP-formatted `precio`, `vigencia_dias` and granted services (unit count or "ilimitado"), plus the "Adquirir" action
- [x] 6.2 Create `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` — dialog (`role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape to close) with the organization name header, the "Buscar planes o servicios" input, loading/empty/no-results/error states, and the filtered card list
- [x] 6.3 Wire the acquisition inside `PlanesPublicosModal` by reusing `useSuscripcion({ tenantId })` and the existing `SuscripcionModal`, showing its success banner and mapping an RLS rejection to "Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente."
- [x] 6.4 Hide the "Adquirir" action for users who are `administrador` or `entrenador` of the browsed organization, resolved with `useTenantAccess(tenantId)` when the modal opens
- [x] 6.5 Create `src/components/portal/planes-publicos/VerPlanesButton.tsx` (owns modal open state, restores focus on close) and `index.ts`

## 7. Components — organizations directory and plan admin

- [x] 7.1 Add the optional `secondaryAction?: React.ReactNode` prop to `src/components/portal/tenant/TenantIdentityCard.tsx`, rendered in the same action row as the primary action / `customAction`, keeping all existing call sites source-compatible
- [x] 7.2 Pass `<VerPlanesButton />` as `secondaryAction` on both branches of `src/components/portal/tenant/TenantDirectoryList.tsx` (member "Ingresar" card and non-member "Solicitar acceso" card) and verify the layout on mobile
- [x] 7.3 Add the "Plan público" checkbox with helper text to `src/components/portal/planes/PlanFormModal.tsx`
- [x] 7.4 Add the admin-only `Visibilidad` column (Público/Privado) to `src/components/portal/planes/PlanesTable.tsx` behind a `showVisibilidad` prop, passed only by `PlanesPage`

## 8. Components and pages — Mis Suscripciones

- [x] 8.1 Move the `mis-suscripciones-y-pagos` component slice to `src/components/portal/mis-suscripciones/` (`MisSuscripcionesYPagosPage`, `MisSuscripcionesFilters`, `SuscripcionCard`, `PagoCard`, `index.ts`) and fix all import paths
- [x] 8.2 Change `MisSuscripcionesYPagosPage` props to `{ suscripciones, userId }`, pass each row's own `tenant_id` down to `SuscripcionCard`, and point the empty-state CTA at `/portal/orgs`
- [x] 8.3 Show the organization name on `SuscripcionCard` and add the "Organización" filter control to `MisSuscripcionesFilters`, fed by `tenantOptions`
- [x] 8.4 Create `src/app/portal/(atleta)/layout.tsx` — authenticated-only guard redirecting to `/auth/login?next=/portal/mis-suscripciones`, with no role gate
- [x] 8.5 Create `src/app/portal/(atleta)/mis-suscripciones/page.tsx` — server component resolving the user, calling `fetchMisSuscripciones` and rendering the page component
- [x] 8.6 Replace `src/app/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx` with a `redirect('/portal/mis-suscripciones')`
- [x] 8.7 Update `src/types/portal.types.ts` — remove `Mis Suscripciones` from `ROLE_TENANT_ITEMS.usuario` and add the portal-level entry to the `!tenantId` branch of `resolvePortalMenu`

## 9. Verification

- [x] 9.1 End-to-end as a non-member: browse `/portal/orgs` → "Ver planes" → search by a service name → acquire a subtype → confirm `suscripciones` (`pendiente`), `pagos` (`pendiente`) and `suscripcion_servicios` rows (null units preserved as unlimited)
- [x] 9.2 As the tenant administrator: confirm the non-member subscription is listed with the buyer's name and email in `gestion-suscripciones` and can be validated
- [x] 9.3 As the buyer: confirm the subscription and its service units appear in `/portal/mis-suscripciones` with the organization name, and that the org filter, status filters and proof upload work
- [x] 9.4 Confirm the buyer received no membership: `miembros_tenant` has no new row and the organization card still shows "Solicitar acceso"
- [x] 9.5 Un-publish the purchased plan and confirm the buyer still sees the correct plan, subtype and service names while the plan disappears from the public catalog
- [x] 9.6 Regression pass over `gestion-planes` (admin CRUD + read-only view), `gestion-servicios`, plan-subtype service assignment, `gestion-suscripciones`, booking with service-unit deduction, and training restriction editing showing service names
- [x] 9.7 Verify the duplicate-pending guard, the tenant-staff hidden "Adquirir" case, the legacy route redirect, and the unauthenticated redirect with the correct `next`

## 10. Documentation and delivery

- [x] 10.1 Update `projectspec/03-project-structure.md` — new `planes-publicos` slice (components/hooks/types), renamed `mis-suscripciones` slice, new `(atleta)` portal route group and `/portal/mis-suscripciones` route, new service functions, and the new DB helper functions in the Database Functions table
- [x] 10.2 Run `npm run type-check`, `npm run lint` and `npm test` and fix anything they report (do not run a build)
- [x] 10.3 Write the commit message and the pull request description for the implementation
