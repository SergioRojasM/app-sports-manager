## 1. Branch Setup

- [x] 1.1 Create a new Git branch named `feat/us0026-blocked-access-request-control`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/YYYYMMDDHHMMSS_blocked_access_request_control.sql`
- [x] 2.2 Add `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_solicitudes smallint NOT NULL DEFAULT 2 CONSTRAINT tenants_max_solicitudes_ck CHECK (max_solicitudes >= 1 AND max_solicitudes <= 10)`
- [x] 2.3 Create `public.miembros_tenant_bloqueados` table with columns: `id`, `tenant_id` (FK → tenants), `usuario_id` (FK → usuarios), `bloqueado_por` (FK → usuarios, nullable), `bloqueado_at`, `motivo`, `created_at`; unique constraint on `(tenant_id, usuario_id)`
- [x] 2.4 Add indexes: `idx_bloqueados_tenant (tenant_id)` and `idx_bloqueados_usuario_tenant (usuario_id, tenant_id)`
- [x] 2.5 Enable RLS on `miembros_tenant_bloqueados` and grant `select, insert, delete` to `authenticated`
- [x] 2.6 Add RLS policy `bloqueados_select_own`: user can SELECT rows where `usuario_id = auth.uid()`
- [x] 2.7 Add RLS policy `bloqueados_select_admin`: admin can SELECT all rows for their tenants via `get_admin_tenants_for_authenticated_user()`
- [x] 2.8 Add RLS policy `bloqueados_insert_admin`: admin can INSERT rows for their tenants
- [x] 2.9 Add RLS policy `bloqueados_delete_admin`: admin can DELETE rows for their tenants
- [x] 2.10 Apply migration locally with `npx supabase db reset` and verify table + column exist

## 3. Types

- [x] 3.1 Add `BloqueadoRow` type to `src/types/portal/solicitudes.types.ts` (fields: `id`, `tenant_id`, `usuario_id`, `bloqueado_por`, `bloqueado_at`, `motivo`, `created_at`, plus joined `nombre`, `apellido`, `email`, `foto_url`)
- [x] 3.2 Add `BloquearUsuarioInput` type to `src/types/portal/solicitudes.types.ts` (`tenant_id`, `usuario_id`, `bloqueado_por`, `motivo?`)
- [x] 3.3 Add `'blocked'` to the `SolicitudesServiceError` code union in `src/types/portal/solicitudes.types.ts`
- [x] 3.4 Add `tenant_id: string` and `usuario_id: string` fields to `RechazarSolicitudInput` in `src/types/portal/solicitudes.types.ts`
- [x] 3.5 Add `max_solicitudes: number` to `TenantEditPayload` and `TenantEditFormValues` in `src/types/portal/tenant.types.ts`

## 4. Services

- [x] 4.1 Add `getUserBloqueadoForTenant(tenantId: string, userId: string): Promise<boolean>` to `src/services/supabase/portal/solicitudes.service.ts` — COUNT query on `miembros_tenant_bloqueados`
- [x] 4.2 Add `getBloqueadosByTenant(tenantId: string): Promise<BloqueadoRow[]>` to `solicitudes.service.ts` — SELECT with `usuarios` join, ordered by `bloqueado_at desc`
- [x] 4.3 Add `bloquearUsuario(input: BloquearUsuarioInput): Promise<void>` to `solicitudes.service.ts` — INSERT with `on conflict (tenant_id, usuario_id) do nothing`; throw `SolicitudesServiceError('blocked', ...)` only if the record already existed before the call
- [x] 4.4 Add `desbloquearUsuario(tenantId: string, usuarioId: string): Promise<void>` to `solicitudes.service.ts` — DELETE where `(tenant_id, usuario_id)`
- [x] 4.5 Modify `createSolicitud` in `solicitudes.service.ts`: replace the rejection-count guard with a `getUserBloqueadoForTenant` check; throw `SolicitudesServiceError('blocked', 'Has alcanzado el límite de solicitudes rechazadas para esta organización.')` if blocked
- [x] 4.6 Modify `rechazarSolicitud` in `solicitudes.service.ts`: add `tenant_id` and `usuario_id` to the call; after updating to `rechazada`, count total `rechazada` rows for `(tenant_id, usuario_id)`, fetch `tenants.max_solicitudes`, and call `bloquearUsuario` if `count >= max_solicitudes`
- [x] 4.7 Add `getTenantMaxSolicitudes(tenantId: string): Promise<number>` to `src/services/supabase/portal/tenant.service.ts` — SELECT `max_solicitudes` from `tenants`
- [x] 4.8 Add `max_solicitudes` to `TenantRow` local type in `tenant.service.ts`
- [x] 4.9 Extend `updateTenant` in `tenant.service.ts` to pass `max_solicitudes` from the payload to Supabase UPDATE
- [x] 4.10 Update `mapTenantToEditFormValues` in `tenant.service.ts` to map `tenant.max_solicitudes` to the form values

## 5. Hooks

- [x] 5.1 Modify `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`: add `isBanned` state; in `loadData`, run `getUserBloqueadoForTenant` and `getUserSolicitudesForTenant` concurrently via `Promise.all`; replace `isBlocked = rejectionCount >= 3` with `isBlocked = isBanned`; add `isBanned` to the return type
- [x] 5.2 Modify `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts`: add `bloquear(solicitud: SolicitudRow, motivo?: string): Promise<void>` method that calls `solicitudesService.bloquearUsuario(...)` then `refresh()`; update the hook's return type and callers to pass the new `tenant_id` + `usuario_id` fields in `rechazarSolicitud` calls
- [x] 5.3 Create `src/hooks/portal/gestion-solicitudes/useBloqueados.ts` with return type `{ bloqueados, loading, error, desbloquear, refresh }` — fetches via `getBloqueadosByTenant`, `desbloquear` calls `desbloquearUsuario` then `refresh`

## 6. Components

- [x] 6.1 Create `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTable.tsx` — table with columns: avatar+name, email, `bloqueado_at` (formatted), `motivo` (`—` if null), actions; per-row "Desbloquear" button with inline confirmation (same pattern as `SolicitudesTable` reject confirm)
- [x] 6.2 Create `src/components/portal/gestion-equipo/gestion-solicitudes/BloqueadosTab.tsx` — props: `bloqueados`, `loading`, `error`, `desbloquear`, `refresh`; renders loading / error / empty / `BloqueadosTable` states (same patterns as `SolicitudesTab`)
- [x] 6.3 Modify `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx`: add `onBloquear: (solicitud: SolicitudRow, motivo?: string) => void` prop; add "Bloquear" action button for rows with `estado === 'pendiente' | 'rechazada'`; add separate `bloqueandoId` state + optional `motivoBloqueo` text input for inline confirm
- [x] 6.4 Modify `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx`: add `bloquear: (solicitud: SolicitudRow, motivo?: string) => Promise<void>` to `SolicitudesTabProps`; pass it to `SolicitudesTable` as `onBloquear`
- [x] 6.5 Modify `src/components/portal/gestion-equipo/EquipoPage.tsx`: extend `ActiveTab` to `'equipo' | 'solicitudes' | 'bloqueados'`; instantiate `useBloqueados({ tenantId })`; add "Bloqueados" tab button in the nav bar; render `BloqueadosTab` when `activeTab === 'bloqueados'`; pass `bloquear` from `useSolicitudesAdmin` down to `SolicitudesTab`
- [x] 6.6 Modify `src/components/portal/tenant/EditTenantForm.tsx`: add `max_solicitudes` numeric input (min 1, max 10, integer) with label "Máximo de solicitudes rechazadas antes de bloqueo"; add client-side validation (range 1–10); wire to `TenantEditFormValues.max_solicitudes`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add `BloqueadosTab.tsx` and `BloqueadosTable.tsx` under `gestion-solicitudes/` component slice; add `useBloqueados.ts` under `hooks/portal/gestion-solicitudes/`

## 8. Final Verification

- [x] 8.1 Run `npx tsc --noEmit` and fix any TypeScript errors
- [x] 8.2 Run `npx next build` (or `npm run build`) and verify no build errors
- [ ] 8.3 Manually verify the full flow: reject a user request twice → confirm auto-block fires → "Bloqueados" tab shows the user → "Desbloquear" removes the block → user can submit again
- [ ] 8.4 Manually verify manual block: click "Bloquear" in Solicitudes tab → confirm block record created → user sees blocked message on `SolicitarAccesoButton`
- [ ] 8.5 Manually verify `max_solicitudes` edit: change value in org edit form → save → reject requests up to new value → confirm auto-block fires at new threshold

## 9. Commit and Pull Request

- [ ] 9.1 Stage all changes and create a commit with message: `feat(us0026): blocked access request control — persistent block table, configurable threshold, admin block/unblock UI`
- [ ] 9.2 Push branch and open a Pull Request with title: `feat/us0026-blocked-access-request-control` → `develop`; PR description: summarize the 4 improvements (configurable threshold, persistent block table, Bloqueados tab, manual block action), reference US0026, list files changed
