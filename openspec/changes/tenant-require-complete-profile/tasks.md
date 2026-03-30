## 1. Branch Setup

- [x] 1.1 Create a new branch: `feat/tenant-require-complete-profile`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260330000100_tenant_requiere_perfil_completo.sql` with `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS requiere_perfil_completo boolean NOT NULL DEFAULT false`
- [x] 2.2 Apply the migration locally (`npx supabase db reset` or `npx supabase migration up`) and verify the column exists in `public.tenants`

## 3. Types

- [x] 3.1 Add `'incomplete_profile'` to the `SolicitudesServiceError` code union in `src/types/portal/solicitudes.types.ts`
- [x] 3.2 Add `requiere_perfil_completo: string` to `TenantEditFormValues` in `src/types/portal/tenant.types.ts`
- [x] 3.3 Add `requiere_perfil_completo: boolean` to `TenantEditPayload` in `src/types/portal/tenant.types.ts`

## 4. Service — tenant.service.ts

- [x] 4.1 Add `requiere_perfil_completo: boolean` to the local `TenantRow` type in `src/services/supabase/portal/tenant.service.ts`
- [x] 4.2 Append `requiere_perfil_completo` to the select columns string in `fetchTenantById`
- [x] 4.3 Map `requiere_perfil_completo` in `mapTenantToEditFormValues` as `String(tenant.requiere_perfil_completo ?? false)`
- [x] 4.4 Add `requiere_perfil_completo: values.requiere_perfil_completo === 'true'` to `toPayload` inside `useEditTenant.ts` (see task 5.2)

## 5. Hook — useEditTenant.ts

- [x] 5.1 Add `requiere_perfil_completo: 'false'` to `EMPTY_VALUES` in `src/hooks/portal/tenant/useEditTenant.ts`
- [x] 5.2 Parse `requiere_perfil_completo` to boolean in `toPayload`: `requiere_perfil_completo: values.requiere_perfil_completo === 'true'`

## 6. Service — solicitudes.service.ts

- [x] 6.1 After Guard 2 (blocked check) in `createSolicitud`, add Guard 3: fetch `requiere_perfil_completo` from `public.tenants` for `input.tenant_id`
- [x] 6.2 When `requiere_perfil_completo = true`, query `public.usuarios` selecting `nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh` for `input.usuario_id`
- [x] 6.3 If any of the eight fields is `null` or empty string, throw `new SolicitudesServiceError('incomplete_profile', 'Esta organización requiere que completes tu perfil antes de solicitar acceso.')`

## 7. Hook — useSolicitudRequest.ts

- [x] 7.1 Add `isProfileIncomplete` boolean state (initial value `false`) to `useSolicitudRequest` in `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`
- [x] 7.2 In the `submit` catch block, detect `SolicitudesServiceError` with `code === 'incomplete_profile'` and set `isProfileIncomplete(true)`
- [x] 7.3 Reset `isProfileIncomplete` to `false` on successful submit
- [x] 7.4 Add `isProfileIncomplete` to the hook's return type and return value

## 8. Component — EditTenantDrawer.tsx

- [x] 8.1 Locate the access-settings section in `src/components/portal/tenant/EditTenantDrawer.tsx` (near the `max_solicitudes` field)
- [x] 8.2 Add a checkbox/toggle input for `requiere_perfil_completo` labelled **"Requerir perfil completo para solicitar acceso"** with an `aria-describedby` hint explaining the effect
- [x] 8.3 Wire the toggle to `updateField('requiere_perfil_completo', checked ? 'true' : 'false')`

## 9. Component — SolicitarAccesoButton.tsx

- [x] 9.1 Destructure `isProfileIncomplete` from `useSolicitudRequest` in `src/components/portal/tenant/SolicitarAccesoButton.tsx`
- [x] 9.2 Add render branch: when `isProfileIncomplete` is `true`, render a disabled button labelled **"Perfil incompleto"**
- [x] 9.3 Below the button, render a persistent informational banner with message _"Esta organización requiere que completes tu perfil antes de solicitar acceso."_ and a link **"→ Completar perfil"** pointing to `/portal/perfil`

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`: add `isProfileIncomplete` to the `useSolicitudRequest` entry under `hooks/portal/gestion-solicitudes/`
- [x] 10.2 Update the `SolicitarAccesoButton` entry to note the new `isProfileIncomplete` render state

## 11. Verification

- [ ] 11.1 Run `npx tsc --noEmit` and fix any TypeScript errors
- [ ] 11.2 Manual test — flag off: submit access request → succeeds as before
- [ ] 11.3 Manual test — flag on, incomplete profile: submit access request → blocked, button shows "Perfil incompleto" and banner appears
- [ ] 11.4 Manual test — flag on, complete profile: submit access request → succeeds, no banner
- [ ] 11.5 Manual test — admin toggle: enable/disable `requiere_perfil_completo` in edit drawer, save, verify DB value

## 12. Commit and Pull Request

- [ ] 12.1 Stage all changes and create a commit with message: `feat: add requiere_perfil_completo flag to tenants for access request profile validation (US-0047)`
- [ ] 12.2 Push branch and open a pull request with description:
  - **Summary**: Adds a per-tenant boolean flag `requiere_perfil_completo` that, when enabled, requires users to have all eight profile fields filled (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`) before submitting an access request.
  - **Changes**: migration + types + service guard + hook state + edit drawer toggle + button render state
  - **Testing**: manual happy/sad paths documented in task 11
