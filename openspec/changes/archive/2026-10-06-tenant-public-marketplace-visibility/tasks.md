## 1. Branch setup

- [x] 1.1 Create the branch `feat/tenant-public-marketplace-visibility`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Database (local only)

- [x] 2.1 Create `supabase/migrations/20261010120000_tenants_publico.sql`: add `tenants.publico boolean not null default true` with its column comment, and recreate `solicitudes_insert_own` requiring `usuario_id = auth.uid()` and a public target tenant, all in one transaction
- [x] 2.2 Apply the migration to the local Supabase instance only (never push it to the remote server)
- [x] 2.3 Verify locally: every existing tenant has `publico = true`; an authenticated non-member insert into `miembros_tenant_solicitudes` is rejected for a private tenant and accepted for a public one; a non-administrator cannot update `tenants.publico`

## 3. Types

- [x] 3.1 `src/types/portal/tenant.types.ts`: add `publico: string` to `TenantEditFormValues`, `publico: boolean` to `TenantEditPayload`, and `isPublic: boolean` to `PortalTenantListItem`
- [x] 3.2 `src/types/portal/solicitudes.types.ts`: add `'private_org'` to the `SolicitudesServiceError` code union

## 4. Services

- [x] 4.1 `tenant.service.ts`: add `publico` to `TenantRow`, to the `fetchTenantById` select, and to `mapTenantToEditFormValues` as `String(tenant.publico ?? true)`
- [x] 4.2 `tenant.service.ts`: change `listVisibleTenantsForPortal(supabase, memberTenantIds)` to select `publico` and filter by `publico = true` or `id in memberTenantIds` (only `publico = true` when the list is empty), keeping the `public` tenant exclusion and the ordering
- [x] 4.3 `tenant.service.ts`: set `isPublic` in `mapPortalTenants`
- [x] 4.4 `solicitudes.service.ts`: in `createSolicitud`, select `requiere_perfil_completo, publico` and throw `SolicitudesServiceError('private_org', 'Esta organización no está recibiendo solicitudes de acceso.')` before the profile-completeness check when the tenant is private

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/tenant/useTenantBrandingImages.ts` with the logo/banner signed-URL fallback moved from `TenantIdentityCard` (returns `logoSrc`, `bannerSrc`, `onLogoError`, `onBannerError`)
- [x] 5.2 `useTenantView.ts`: in `directory` mode load memberships first, then call `listVisibleTenantsForPortal` with their tenant ids
- [x] 5.3 `useEditTenant.ts`: add `publico: 'true'` to `EMPTY_VALUES` and `publico: values.publico === 'true'` to `toPayload`

## 6. Components

- [x] 6.1 `TenantIdentityCard.tsx`: replace the inline image fallback with `useTenantBrandingImages`, with no visual change
- [x] 6.2 Create `src/components/portal/tenant/TenantDirectoryCard.tsx` following `EventoPublicoCard`: shell, banner area with placeholder, logo circle, italic name, clamped description, "Desde {mes} de {año}" (`es-CO`), stacked `primaryAction` / `secondaryAction` pinned to the bottom
- [x] 6.3 `TenantDirectoryCard.tsx`: add the "Miembro" chip with highlighted border when `isMember`, and the "Privada" chip when `isPublic` is false, with decorative icons and Spanish `alt` texts
- [x] 6.4 `TenantDirectoryList.tsx`: render `TenantDirectoryCard`, passing `isMember`, `isPublic`, the "Ingresar" link or `SolicitarAccesoButton` as `primaryAction`, and `VerPlanesButton` as `secondaryAction`
- [x] 6.5 `EditTenantForm.tsx`: add the "Organización pública" checkbox above `max_solicitudes`, its helper text with `aria-describedby`, and the `role="status"` notice shown while unchecked
- [x] 6.6 `PortalTenantsPage.tsx`: render "No hay organizaciones disponibles por ahora." when the list is empty

## 7. Manual verification

- [x] 7.1 As administrator: toggle the organization private and public from `gestion-organizacion`, confirm the value persists and the notice appears only while unchecked
- [x] 7.2 As non-member: a private organization is not listed; a public one is listed with "Solicitar acceso" and "Ver planes" working as before
- [x] 7.3 As member (administrador, entrenador, usuario): the organization is listed with "Miembro" and "Ingresar"; a private one also shows "Privada"
- [x] 7.4 Pending request: set the organization private, confirm the requester no longer sees the card, the admin still sees and accepts the request, and the user then sees the card
- [x] 7.5 Stale page: confirm "Solicitar acceso" on a now-private organization shows the inline message and creates no row
- [x] 7.6 Cards with and without banner, logo, description and founding date; 360 px width; empty directory state
- [x] 7.7 `gestion-organizacion` card looks unchanged; a public event and a pending invitation of a private organization still show its name

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: add `TenantDirectoryCard.tsx` and `useTenantBrandingImages.ts`, and note US-0133 on `orgs/page.tsx`, `tenant.service.ts`, `tenant.types.ts` and `solicitudes.service.ts`

## 9. Quality checks and delivery

- [x] 9.1 Run the type check (`npx tsc --noEmit`) and fix any error
- [x] 9.2 Run `npm run lint` and fix any error
- [x] 9.3 Run the test suite if one exists (the repository currently has no `test` script); do not run the build
- [x] 9.4 Write the commit message and the pull request description for the implementation
