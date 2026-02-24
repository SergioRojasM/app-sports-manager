## 1. Branch and Workspace Safety

- [x] 1.1 Create a working branch named `feat/refactor-tenant-membership-model`
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop`

## 2. Database Migration and Seed Alignment

- [x] 2.1 Refactor `supabase/migrations/20260221000100_migracion_inicial_bd.sql` so tenant-role ownership is modeled through `public.miembros_tenant(tenant_id, usuario_id, rol_id)`
- [x] 2.2 Add/confirm uniqueness constraint for one membership per (`tenant_id`, `usuario_id`)
- [x] 2.3 Update `supabase/migrations/20260223000100_seed_inicial.sql` to ensure roles `administrador`, `entrenador`, `usuario` and default tenant `public`
- [x] 2.4 Implement/adjust idempotent trigger/function flow to ensure each new auth user gets `usuarios` profile plus default membership (`public`, `usuario`)
- [x] 2.5 Update `supabase/migrations/20260224005002_add_column_to_tenant_table.sql` only if needed to remain consistent with membership-based model
- [x] 2.6 Backfill/validate migration path and drop legacy `usuarios.tenant_id` and `usuarios.rol_id`

## 3. Service Layer Refactor

- [x] 3.1 Refactor `src/services/supabase/portal.ts` to resolve role and tenant context from membership joins (`miembros_tenant`, `roles`, `tenants`)
- [x] 3.2 Update `src/services/supabase/portal/index.ts` exports/contracts to match membership-based resolvers
- [x] 3.3 Refactor `src/services/supabase/portal/organization-view.service.ts` to resolve tenant context from membership-selected `tenant_id`
- [x] 3.4 Ensure service queries are deterministic and do not rely on removed `usuarios` tenant/role columns

## 4. Types and Domain Contracts

- [x] 4.1 Update `src/types/portal.types.ts` with membership-backed role and tenant context contracts
- [x] 4.2 Add or adjust membership domain types to represent role-per-tenant semantics
- [x] 4.3 Update any affected `src/types/portal/*.types.ts` contracts used by portal organization flows

## 5. Delivery Layer and Page Flow

- [x] 5.1 Update `src/app/portal/bootstrap/route.ts` to consume membership-based context resolution
- [x] 5.2 Verify `/portal` welcome page keeps current content and header behavior unchanged
- [x] 5.3 Ensure signup flow integration supports default membership provisioning behavior defined in specs

## 6. Component and Navigation Behavior

- [x] 6.1 Refactor `src/components/portal/PortalNavMenu.tsx` (and related menu renderer if needed) to display only `Organizaciones Disponibles`
- [x] 6.2 Ensure simplified menu applies for `administrador`, `entrenador`, and `usuario` until tenant-selection UX is introduced
- [x] 6.3 Confirm organization view UI reads tenant data through service/hook path without direct Supabase calls from page/components

## 7. Hook Layer and Integration Validation

- [x] 7.1 Update impacted hooks under `src/hooks/portal/**` to consume membership-backed service contracts
- [x] 7.2 Validate page → component → hook → service → types flow for all changed portal paths
- [x] 7.3 Run local validation for signup/login/bootstrap and verify one default membership per user in `public` tenant
- [x] 7.4 Run project checks (lint/type/build or targeted checks) and document any follow-up fixes
