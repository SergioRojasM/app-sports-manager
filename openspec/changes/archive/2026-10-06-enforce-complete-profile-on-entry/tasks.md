## 1. Branch setup

- [x] 1.1 Create a new branch `feat/enforce-complete-profile-on-entry`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Page and layout

- [x] 2.1 Create `src/app/portal/completar-perfil/[tenant_id]/page.tsx` (server component): no session → `/auth/login?next=/portal/orgs`; `getCachedTenantAccess` → `pendingActivation` → `/portal/activar-cuenta/{tenantId}`, `!allowed` → `/portal/orgs`, `!profileIncomplete` → `/portal/orgs/{tenantId}`; read the tenant `nombre`; render `CompletarPerfilPage` with `tenantId`, `tenantNombre`, `missingFields`
- [x] 2.2 In `src/app/portal/orgs/[tenant_id]/layout.tsx`, add `if (decision.profileIncomplete) redirect('/portal/completar-perfil/{tenantId}')` after the existing session, pending-activation and membership checks

## 3. Components

- [x] 3.1 Create `src/components/portal/perfil/CompletarPerfilPage.tsx` reusing the `ActivarCuentaPage` layout (`GritPageHeader` "Completa tu perfil" + subtitle with the tenant name, centered glass card) and `PerfilPersonalForm` with `visibleFields={missingFields}`
- [x] 3.2 Add the actions: "Guardar y continuar" submit button ("Guardando…" and disabled while loading/submitting) and "Volver a organizaciones" link to `/portal/orgs`
- [x] 3.3 Handle states: profile loading, load error with "Reintentar", inline `role="alert"` banner on save failure; on success call `router.replace('/portal/orgs/{tenantId}')` then `router.refresh()`
- [x] 3.4 Export `CompletarPerfilPage` from `src/components/portal/perfil/index.ts`
- [x] 3.5 Update the `requiere_perfil_completo` toggle in `src/components/portal/tenant/EditTenantForm.tsx`: label "Requerir perfil completo para ingresar a la organización" and the new help text covering invited and existing members
- [x] 3.6 Add `'completar-perfil': 'Completar perfil'` to the segment labels in `src/components/portal/PortalBreadcrumb.tsx`

## 4. Hook

- [x] 4.1 Add `options?: { requiredFields?: FormularioPerfilCampo[] }` to `usePerfil` in `src/hooks/portal/perfil/usePerfil.ts`
- [x] 4.2 In `submit()`, add a field error for each empty required field (`telefono`, `fecha_nacimiento`, `tipo_identificacion` + `numero_identificacion`, `fecha_exp_identificacion`, `rh`) with the messages from US-0136, and skip persisting while errors exist
- [x] 4.3 Confirm `PerfilPage` and `InlineProfileCompletionStep` (no options) keep their current validation

## 5. Services and lib

- [x] 5.1 Create `src/lib/portal/perfil-completo.ts` with `PERFIL_COMPLETO_SELECT`, `PerfilCompletoRow`, `getPerfilCamposFaltantes` and `isPerfilCompleto`
- [x] 5.2 Extend `canUserAccessTenant` in `src/services/supabase/portal/tenant.service.ts`: for an active membership read `tenants.requiere_perfil_completo` and, when true, the caller's `usuarios` row; set `profileIncomplete` / `profileMissingFields` on every return branch; log and fail open on read errors; leave `allowed` / `role` untouched
- [x] 5.3 Refactor Guard 3 of `createSolicitud` in `src/services/supabase/portal/solicitudes.service.ts` to use `PERFIL_COMPLETO_SELECT` and `isPerfilCompleto`, keeping the `incomplete_profile` error

## 6. Types

- [x] 6.1 Add `profileIncomplete: boolean` and `profileMissingFields: FormularioPerfilCampo[]` to `TenantAccessDecision` in `src/types/portal/tenant.types.ts`

## 7. Verification

- [x] 7.1 Verify RLS on the local database: a user can select/update their own `usuarios` row, and a member of a private tenant (`publico = false`) can read `tenants.requiere_perfil_completo`
- [x] 7.2 Test invitation acceptance with a new account and with an existing account (flag on) → completion screen → organization
- [x] 7.3 Test a provisioned account: activation first, then completion
- [x] 7.4 Test an existing member after enabling the flag, for each of `usuario`, `entrenador` and `administrador`, including a direct deep link
- [x] 7.5 Test flag off, a user in two tenants with different settings, and clearing a field in `/portal/perfil`
- [x] 7.6 Test the completion route guards (non-member, complete profile, no session) and the save-failure path
- [x] 7.7 Regression: access-request flow still shows "Perfil incompleto"; `/portal/perfil` and the booking-modal profile step save as before; `/portal/orgs` still lists the gated organization as a membership

## 8. Documentation and delivery

- [x] 8.1 Update `projectspec/03-project-structure.md`: new route, `CompletarPerfilPage`, `perfil-completo.ts`, the extended layout gate, `usePerfil` option and `TenantAccessDecision` fields
- [x] 8.2 Run the type check (`npx tsc --noEmit`) and lint (`npm run lint`); run tests if a runner is configured (none exists in `package.json` today); do not run the build
- [x] 8.3 Write the commit message and the pull request description for the implementation
