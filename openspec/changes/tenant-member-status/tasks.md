## 1. Branch Setup

- [x] 1.1 Create a new branch: `feat/tenant-member-status`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migrations

- [x] 2.1 Create migration `YYYYMMDDHHMMSS_miembros_tenant_estado.sql`: `ALTER TABLE public.miembros_tenant ADD COLUMN estado text NOT NULL DEFAULT 'activo'` with check constraint `miembros_tenant_estado_ck` against `('activo','mora','suspendido','inactivo')`
- [x] 2.2 In the same migration, add backfill: `UPDATE public.miembros_tenant mt SET estado = u.estado FROM public.usuarios u WHERE mt.usuario_id = u.id`
- [x] 2.3 In the same migration, add RLS UPDATE policy `miembros_tenant_update_estado_admin` allowing admins of the tenant to UPDATE the `estado` column
- [x] 2.4 Create migration `YYYYMMDDHHMMSS_miembros_tenant_novedades.sql`: `CREATE TABLE public.miembros_tenant_novedades` with columns `id`, `tenant_id`, `miembro_id`, `tipo`, `descripcion`, `estado_resultante`, `registrado_por`, `created_at`, all FKs, both check constraints (`tipo_ck`, `estado_resultante_ck`), `idx_miembros_novedades_miembro`, `idx_miembros_novedades_tenant` indexes, enable RLS, SELECT policy `novedades_select_tenant_admin`, INSERT policy `novedades_insert_admin` (no UPDATE/DELETE policies)
- [x] 2.5 In the same migration, create the `cambiar_estado_miembro(p_miembro_id, p_tenant_id, p_nuevo_estado, p_tipo, p_descripcion)` `SECURITY DEFINER` RPC that (1) checks admin role or raises `42501`, (2) updates `miembros_tenant.estado` or raises `P0002` if not found, (3) inserts into `miembros_tenant_novedades` with `registrado_por = auth.uid()`
- [x] 2.6 Create migration `YYYYMMDDHHMMSS_v_miembros_equipo.sql`: `CREATE OR REPLACE VIEW public.v_miembros_equipo` joining `miembros_tenant`, `usuarios`, `roles` and adding `inasistencias_recientes` lateral subquery using `reservas.atleta_id = mt.usuario_id` (NOT `usuario_id`) with `asistio = false` and `created_at >= now() - interval '30 days'`
- [x] 2.7 Apply migrations locally: `npx supabase db reset` (or `db push`) and verify all three migrations run without errors

## 3. Types

- [x] 3.1 In `src/types/portal/equipo.types.ts`, add `MiembroNovedadTipo = 'falta_pago' | 'inasistencias_acumuladas' | 'suspension_manual' | 'reactivacion' | 'otro'`
- [x] 3.2 Add `MiembroNovedad` type with fields: `id`, `miembro_id`, `tipo: MiembroNovedadTipo`, `descripcion: string | null`, `estado_resultante: MiembroEstado`, `registrado_por`, `created_at`
- [x] 3.3 Add `CambiarEstadoMiembroInput` type with fields: `miembroId`, `tenantId`, `nuevoEstado: MiembroEstado`, `tipo: MiembroNovedadTipo`, `descripcion?: string`
- [x] 3.4 Add `inasistencias_recientes: number` field to `MiembroRow`

## 4. Service Layer

- [x] 4.1 In `src/services/supabase/portal/equipo.service.ts`, replace the module-private `RawMiembroRow` type with the flat view shape: remove nested `usuarios` and `roles` sub-objects; add `estado: string`, `inasistencias_recientes: number`, and flattened user/role fields at top level
- [x] 4.2 Update `getEquipo` to query `.from('v_miembros_equipo').select('*')` instead of `miembros_tenant` with the join select string
- [x] 4.3 Update `mapRawRow` to read `estado` from `row.estado` (not `row.usuarios.estado`) and map `inasistencias_recientes: row.inasistencias_recientes ?? 0`
- [x] 4.4 Add `cambiarEstadoMiembro(input: CambiarEstadoMiembroInput): Promise<void>` — calls `supabase.rpc('cambiar_estado_miembro', { p_miembro_id, p_tenant_id, p_nuevo_estado, p_tipo, p_descripcion })` and throws `EquipoServiceError('forbidden', ...)` on `42501`, or `EquipoServiceError('unknown', ...)` on other errors
- [x] 4.5 Add `getNovedadesMiembro(miembroId: string, tenantId: string): Promise<MiembroNovedad[]>` — queries `miembros_tenant_novedades` filtered by `miembro_id` and `tenant_id`, ordered by `created_at desc`, returns typed array

## 5. Hook Layer

- [x] 5.1 In `src/hooks/portal/gestion-equipo/useEquipo.ts`, add `isCambiandoEstado: boolean` state (default `false`)
- [x] 5.2 Add `cambiarEstado(miembroId, nuevoEstado, tipo, descripcion?)` method: sets `isCambiandoEstado = true`, calls `equipoService.cambiarEstadoMiembro`, on success calls `refresh()`, on error rethrows; always sets `isCambiandoEstado = false` in finally
- [x] 5.3 Add `getNovedades(miembroId: string): Promise<MiembroNovedad[]>` method: calls `equipoService.getNovedadesMiembro(miembroId, tenantId)` (lazy, no cached state)
- [x] 5.4 Export `cambiarEstado`, `getNovedades`, `isCambiandoEstado` from `UseEquipoResult` type and the hook return value

## 6. Components

- [x] 6.1 Create `src/components/portal/gestion-equipo/CambiarEstadoModal.tsx`: controlled modal with props `member: MiembroTableItem | null`, `isOpen`, `onClose`, `onConfirm(nuevoEstado, tipo, descripcion?)`. Render member name in title, current estado via `EquipoStatusBadge`, `nuevoEstado` select (required), `tipo` select (required), `descripcion` textarea (optional, max 500 chars). Confirm button disabled while required fields empty. Show loading while in flight. Close on success. Show inline error on failure without closing.
- [x] 6.2 Create `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx`: read-only modal with props `member: MiembroTableItem | null`, `isOpen`, `onClose`, `getNovedades`. On open, lazily calls `getNovedades(member.miembro_id)`. Title: "Historial de novedades — [Nombre Apellido]". Renders rows with formatted `created_at`, `tipo` label, `descripcion` (or `—`), `estado_resultante` as `EquipoStatusBadge`, newest-first. Show loading skeleton while fetching. Show empty state when no novedades.
- [x] 6.3 In `src/components/portal/gestion-equipo/EquipoTable.tsx`, add `onCambiarEstado?: (row: MiembroTableItem) => void` and `onVerNovedades?: (row: MiembroTableItem) => void` props
- [x] 6.4 In `EquipoTable.tsx`, add **"Fallas (30d)"** column after **Estado**: render `—` (slate) for `0`, amber badge for `1-2`, red badge for `3+`
- [x] 6.5 In `EquipoTable.tsx`, add **"Cambiar Estado"** action button (`swap_horiz` or `label` icon, `hover:text-turquoise`, `title="Cambiar estado"`) rendered only when `onCambiarEstado` is provided
- [x] 6.6 In `EquipoTable.tsx`, add **"Ver Novedades"** action button (`history` icon, `hover:text-turquoise`, `title="Ver novedades"`) rendered only when `onVerNovedades` is provided
- [x] 6.7 In `src/components/portal/gestion-equipo/EquipoPage.tsx`, add state `cambiarEstadoTarget: MiembroTableItem | null` and `novedadesTarget: MiembroTableItem | null` (both default `null`)
- [x] 6.8 In `EquipoPage.tsx`, wire `onCambiarEstado` callback to `EquipoTable` (sets `cambiarEstadoTarget`) and `onVerNovedades` callback (sets `novedadesTarget`)
- [x] 6.9 In `EquipoPage.tsx`, render `<CambiarEstadoModal>` controlled by `cambiarEstadoTarget`; `onConfirm` calls `cambiarEstado(...)` from the hook, shows success toast on resolution, and resets `cambiarEstadoTarget` to `null`
- [x] 6.10 In `EquipoPage.tsx`, render `<NovedadesMiembroModal>` controlled by `novedadesTarget`; passes `getNovedades` from the hook; `onClose` resets `novedadesTarget` to `null`
- [x] 6.11 In `src/components/portal/gestion-equipo/index.ts`, export `CambiarEstadoModal` and `NovedadesMiembroModal`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: document `miembros_tenant.estado` as tenant-scoped status (distinct from `usuarios.estado`), `miembros_tenant_novedades` table, `v_miembros_equipo` view, `cambiar_estado_miembro` RPC, `CambiarEstadoModal`, and `NovedadesMiembroModal`

## 8. Commit & PR

- [x] 8.1 Stage all changes and create commit with message: `feat(equipo): tenant-scoped member status with audit log (US-0037)\n\n- Add miembros_tenant.estado column (backfilled from usuarios.estado)\n- Create miembros_tenant_novedades append-only audit table\n- Create v_miembros_equipo view with inasistencias_recientes counter\n- Add cambiar_estado_miembro SECURITY DEFINER RPC\n- Switch equipo.service to v_miembros_equipo, add cambiarEstadoMiembro + getNovedadesMiembro\n- Hook: expose cambiarEstado, getNovedades, isCambiandoEstado\n- New: CambiarEstadoModal, NovedadesMiembroModal components\n- EquipoTable: Fallas(30d) column + new action buttons`
- [x] 8.2 Open a Pull Request with title: `feat: Tenant-scoped member status and audit log (US-0037)` and description summarising: problem solved (global vs tenant estado), DB changes (3 migrations), new RPC, UI additions (Fallas column, CambiarEstadoModal, NovedadesMiembroModal), and the `atleta_id` column-name fix applied to the view
