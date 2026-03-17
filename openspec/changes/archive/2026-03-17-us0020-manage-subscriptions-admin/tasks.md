## 1. Branch Setup

- [x] 1.1 Create a new git branch: `git checkout -b feat/us0020-manage-subscriptions-admin`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260305000100_gestion_suscripciones_admin_rls.sql`
- [x] 2.2 Add `grant select, update on public.suscripciones to authenticated;`
- [x] 2.3 Add RLS policy `suscripciones_select_admin`: FOR SELECT using `tenant_id in (select get_admin_tenants_for_authenticated_user())`
- [x] 2.4 Add RLS policy `suscripciones_update_admin`: FOR UPDATE with matching USING + WITH CHECK
- [x] 2.5 Add `grant select, update on public.pagos to authenticated;`
- [x] 2.6 Add RLS policy `pagos_select_admin`: FOR SELECT scoped to admin tenant IDs
- [x] 2.7 Add RLS policy `pagos_update_admin`: FOR UPDATE scoped to admin tenant IDs
- [x] 2.8 Apply migration locally: `supabase db push`
- [x] 2.9 Verify admin session can SELECT all tenant subscriptions and pagos
- [x] 2.10 Verify athlete session still only sees own subscriptions (existing `suscripciones_select_own` intact)

## 3. Types

- [x] 3.1 Create `src/types/portal/gestion-suscripciones.types.ts`
- [x] 3.2 Define `SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada'`
- [x] 3.3 Define `PagoEstado = 'pendiente' | 'validado' | 'rechazado'`
- [x] 3.4 Define `MetodoPago = 'transferencia' | 'efectivo' | 'tarjeta'`
- [x] 3.5 Define `PagoAdminRow` interface (id, monto, metodo_pago, comprobante_url, estado, validado_por, fecha_pago, fecha_validacion, created_at)
- [x] 3.6 Define `SuscripcionAdminRow` interface (id, tenant_id, plan_id, plan_nombre, plan_vigencia_meses, atleta_id, atleta_nombre, atleta_email, fecha_inicio, fecha_fin, clases_restantes, clases_plan, estado, comentarios, created_at, pago: PagoAdminRow | null)
- [x] 3.7 Define `SuscripcionesAdminStats` interface (activas, pendientes, pagoPendiente)
- [x] 3.8 Define `ValidarSuscripcionFormValues` interface (fecha_inicio, fecha_fin, clases_restantes — the editable approval fields)

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/gestion-suscripciones.service.ts`
- [x] 4.2 Implement `fetchSuscripcionesAdmin(tenantId: string): Promise<SuscripcionAdminRow[]>` — single joined query selecting `suscripciones(*, atleta:usuarios!suscripciones_atleta_id_fkey(nombre,apellido,email), plan:planes!suscripciones_plan_id_fkey(nombre,vigencia_meses,clases_incluidas), pagos(*))` ordered by `created_at desc`; mapper picks `pagos[0]` as latest payment (ensure pagos are ordered by `created_at desc`)
- [x] 4.3 Implement `updatePagoEstado(id: string, estado: 'validado' | 'rechazado', validadoPor: string): Promise<void>` — PATCH `pagos` setting estado, validado_por, and fecha_validacion (now) when approving
- [x] 4.4 Implement `updateSuscripcionEstado(id: string, action: 'aprobar' | 'cancelar', values?: ValidarSuscripcionFormValues): Promise<void>` — PATCH `suscripciones`; on aprobar sets estado='activa' + confirmed fecha_inicio/fecha_fin/clases_restantes; on cancelar sets estado='cancelada'
- [x] 4.5 Map Supabase errors to user-friendly messages (RLS denial → permission error; generic → fallback message)

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts`
- [x] 5.2 Implement fetch on mount via `fetchSuscripcionesAdmin(tenantId)`, expose `loading`, `error`, `rows`, `refresh`
- [x] 5.3 Implement `searchTerm` + `setSearchTerm` state; client-side filter over atleta_nombre, plan_nombre, partial id
- [x] 5.4 Implement `suscripcionFilter: SuscripcionEstado | 'all'` + `setSuscripcionFilter` state
- [x] 5.5 Implement `pagoFilter: PagoEstado | 'all'` + `setPagoFilter` state
- [x] 5.6 Compute `filteredRows` with `useMemo` combining search + both filter chips (AND logic)
- [x] 5.7 Compute `stats: SuscripcionesAdminStats` with `useMemo` derived from `rows` (no extra fetch)
- [x] 5.8 Implement `selectedRow: SuscripcionAdminRow | null` + `modalType: 'pago' | 'suscripcion' | null` state
- [x] 5.9 Expose `openPagoModal(row)`, `openSuscripcionModal(row)`, `closeModal()` actions
- [x] 5.10 Create `src/hooks/portal/gestion-suscripciones/useValidarPago.ts`
- [x] 5.11 `useValidarPago`: expose `isSubmitting`, `error`; implement `approve(pagoId, validadoPor)` and `reject(pagoId)` calling service functions; call `onSuccess` callback on completion
- [x] 5.12 Create `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`
- [x] 5.13 `useValidarSuscripcion`: accept `row: SuscripcionAdminRow` + plan data; pre-compute `formValues: ValidarSuscripcionFormValues` (fecha_inicio = today if null, fecha_fin = addMonths(fecha_inicio, vigencia_meses), clases_restantes = clases_plan if null); expose editable form state + `approve()` + `cancel()` + `isSubmitting` + `error`

## 6. Components

- [x] 6.1 Create `src/components/portal/gestion-suscripciones/SuscripcionEstadoBadge.tsx` — maps `SuscripcionEstado` to badge colour (pending → amber, activa → emerald, vencida|cancelada → slate)
- [x] 6.2 Create `src/components/portal/gestion-suscripciones/PagoEstadoBadge.tsx` — maps `PagoEstado` to badge colour (pendiente → amber, validado → emerald, rechazado → rose)
- [x] 6.3 Create `src/components/portal/gestion-suscripciones/SuscripcionesStatsCards.tsx` — renders three KPI cards from `SuscripcionesAdminStats` prop
- [x] 6.4 Create `src/components/portal/gestion-suscripciones/SuscripcionesHeaderFilters.tsx` — search input + subscription status chips + payment status chips; all filter values as controlled props
- [x] 6.5 Create `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` — table with all required columns; "Validate Payment" + "Validate Subscription" action buttons per row; uses `SuscripcionEstadoBadge` and `PagoEstadoBadge`; accessible `aria-label` on action buttons
- [x] 6.6 Create `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx` — receives `row: SuscripcionAdminRow`; shows full subscription + payment detail; `comprobante_url` rendered as clickable link; Approve + Reject buttons; uses `useValidarPago`; modal traps focus and is dismissible with Escape
- [x] 6.7 Create `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx` — receives `row: SuscripcionAdminRow`; shows editable `fecha_inicio`, `fecha_fin`, `clases_restantes` with pre-computed defaults; Approve + Cancel Subscription buttons; uses `useValidarSuscripcion`; modal traps focus and is dismissible with Escape
- [x] 6.8 Create `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` — assembles all sub-components; consumes `useGestionSuscripciones`; renders loading / empty / error states following `glass` panel pattern (mirrors `EquipoPage.tsx` / `PlanesPage.tsx` structure)
- [x] 6.9 Create `src/components/portal/gestion-suscripciones/index.ts` — barrel export for all public components

## 7. Route Page

- [x] 7.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones/page.tsx` — Server Component that extracts `params.tenant_id` and renders `<GestionSuscripcionesPage tenantId={tenantId} />`; no direct data-access calls in the page file

## 8. Navigation

- [x] 8.1 In `src/types/portal.types.ts`, add `{ label: 'Suscripciones', path: 'gestion-suscripciones', icon: 'subscriptions' }` to `ROLE_TENANT_ITEMS.administrador` array
- [x] 8.2 Verify the entry does NOT appear under `usuario` or `entrenador` role items

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` — add `gestion-suscripciones/` entries under components, hooks, services, and types directory trees

## 10. Verification

- [x] 10.1 Run `npm run dev` and navigate to the module as an admin user; verify stats cards show correct counts
- [x] 10.2 Verify search filters rows by athlete name, plan name, and partial subscription ID
- [x] 10.3 Verify subscription status chip and payment status chip combine correctly (AND logic)
- [x] 10.4 Open "Validate Payment" modal; approve a pending payment; verify DB values (`estado`, `validado_por`, `fecha_validacion`) and confirm badge updates in the table row
- [x] 10.5 Open "Validate Payment" modal; reject a payment; verify `estado = 'rechazado'`
- [x] 10.6 Open "Validate Subscription" modal; verify pre-computed defaults (fecha_inicio = today, fecha_fin = fecha_inicio + vigencia_meses, clases_restantes = clases_plan)
- [x] 10.7 Override fecha_fin in modal; approve; verify overridden value persisted in DB
- [x] 10.8 Cancel a subscription from the modal; verify `estado = 'cancelada'`
- [x] 10.9 Log in as an athlete; verify `gestion-suscripciones` is not visible in the sidebar and the URL is inaccessible (redirect)
- [x] 10.10 Run `npx tsc --noEmit` and confirm no TypeScript errors

## 11. Commit and PR

- [x] 11.1 Stage all changes and write a commit message:
  ```
  feat(us0020): add admin subscription management module

  - add gestion-suscripciones feature slice (types, service, hooks, components, route)
  - add migration 20260305000100: admin SELECT/UPDATE RLS on suscripciones + pagos
  - add Suscripciones entry to ROLE_TENANT_ITEMS.administrador in portal.types.ts
  - update projectspec/03-project-structure.md
  ```
- [x] 11.2 Create a Pull Request with title `feat(us0020): admin subscription management` and description:
  - **What**: New admin-only `gestion-suscripciones` module. Lists all tenant subscriptions with joined athlete/plan/payment data, stats cards, search + filter chips, and approve/reject modals for payments and subscriptions.
  - **Migration**: `20260305000100_gestion_suscripciones_admin_rls.sql` — additive RLS policies, no schema changes.
  - **Testing**: Verified with admin + athlete sessions; TypeScript clean.
  - **Note**: `fecha_fin` back-fill uses `vigencia_meses`; admin can override before approving.
