## Context

The public trainings marketplace lets a tenant publish a training so that any authenticated user can book it. Publishing writes a row to `entrenamientos_publicos`; a trigger then sets `entrenamientos.visibilidad = 'publico'`, and several RLS policies grant cross-tenant access based on that column. The events module replaced this feature. Trainings are now internal to the organization.

Coupling found outside the module's own folders:

```
events (stays)        ──imports types──▶ entrenamientos-publicos.types.ts
EntrenamientosPage    ──publish flow───▶ usePublicarEntrenamiento, service, PublicarEntrenamientoModal
useEntrenamientos     ──published ids──▶ entrenamientosPublicosService
reservas.service      ──skip plan──────▶ table entrenamientos_publicos
LoginForm/SignupForm  ──guided flow────▶ lib/.../guidedBooking.ts, GuidedBookingStepper
useSuscripcion        ──onSubscribed───▶ (only caller: PublicTrainingReservaModal)
RLS policies          ──public branch──▶ entrenamientos.visibilidad
bi.dim_entrenamientos ──es_publico─────▶ table entrenamientos_publicos
```

Constraints: no test suite exists; migrations are applied locally only, never pushed to the remote Supabase project from this change.

## Goals / Non-Goals

**Goals:**
- No route, menu entry or action for public trainings.
- No RLS policy grants access based on `entrenamientos.visibilidad`.
- Existing bookings by non-members stay intact and visible to their owner.
- Events behave exactly as before.
- The change is reversible at the database level (no data loss).

**Non-Goals:**
- Dropping tables, views, columns, triggers, functions or the `public` tenant (US-0124).
- Changing `book_and_deduct_service_units` or the pending / rejected reservation cascades.
- Changing analytics.
- Redirecting old URLs.

## Decisions

### 1. Two phases: close access now, drop later
Phase 1 deletes code and closes access; the table and columns stay. BI views join `entrenamientos_publicos`, and the booking RPC still carries skip-plan parameters, so dropping now would force rewriting both in the same release as a large frontend deletion.
- *Alternative:* drop everything in one change. Rejected: irreversible, and it couples a risky RPC rewrite to this change.

### 2. Unpublish with `activo = false`, do not delete rows
`update entrenamientos_publicos set activo = false` lets the existing sync trigger return each training to `privado`, and keeps `es_publico` history in BI (`ep.id is not null`). A second `update` on `entrenamientos` is a safety net in case the trigger missed any row.
- *Alternative:* `delete from entrenamientos_publicos`. Rejected: loses history and the trigger only fires on insert/update.

### 3. Non-members keep access to their own bookings
Policies are rewritten so that ownership, not visibility, grants the read:

| Policy | New rule |
|--------|----------|
| `entrenamientos_select_authenticated` | member of the tenant, or owns a booking on that training |
| `reservas_select_authenticated` | member of the tenant, or `atleta_id = auth.uid()` |
| `reservas_insert_authenticated` | member branch only |
| `entrenamiento_categorias_select_authenticated`, `ent_restricciones_select_authenticated` | members only |
| `servicios_select_authenticated` | drop the "required by a published training" branch |
| `athlete_upload_own_formulario_respuestas` (storage) | active members only |
| `public_training_formulario_respuesta_read` (storage) | keep, scoped to the caller's own path, no `visibilidad` condition |
| `public_training_banner_read` (storage) | drop |

Each policy is rebuilt from its latest definition (`20260916120200_miembros_pendiente_activacion.sql`; `servicios` from `20260729000200`; storage from `20260727010000`).
- *Alternative:* members-only everywhere. Rejected: non-members would lose their bookings from "Mis Reservas" and "Inicio".

### 4. Shared types move to `eventos.types.ts`
`CronogramaItem`, `IncluyeItem`, `PrecioItem` are only used by events once the module is gone, so events owns them. This is done first, so every later deletion compiles.
- *Alternative:* a new shared types file. Rejected: a single consumer does not justify it.

### 5. Skip-plan path: frontend only
`reservas.service.ts` stops reading `omitir_confirmacion_plan` and always sends `p_permitir_pendiente: false`, `p_plan_purchase: null`. The RPC, `confirm_pending_reservas_for_suscripcion` and the reservation states stay, so any booking already pending is still confirmed or rejected when its payment is validated.

### 6. `visibilidad` leaves the application layer, stays in the table
The service stops sending `visibilidad` (column default is `'privado'`) and sends `visible_para = tenantId` on insert. Saved templates that contain a `visibilidad` key keep loading; the key is ignored.

### 7. Old URLs return 404
Decided by the product owner. No `redirects()` entry in `next.config.ts`.

### 8. Work order follows page → component → hook → service → types
With one exception: the type move (decision 4) goes first, and the module's own types file is deleted last.

## Risks / Trade-offs

- [RLS recursion between `entrenamientos` and `reservas` policies] → The new `reservas` select policy no longer reads `entrenamientos`, so there is no cycle. If Postgres still reports recursion, move the booking lookup into a `security definer` function modelled on `get_member_tenants_for_authenticated_user`.
- [New `entrenamientos` policy branch adds a lookup on `reservas`] → Confirm an index covers `(entrenamiento_id, atleta_id)` in `20260302000300_reservas_indexes.sql`; add one in the migration if not.
- [Old frontend against new policies] → A cached old client could try to publish or book as a non-member and get an RLS error. Deploy the frontend first, then the migration.
- [Non-members with a future booking on a formerly public training] → They keep the booking and can see it, but cannot make new ones. Accepted by the product owner.
- [Pending bookings created through skip-plan] → Still handled by the untouched RPC cascade.
- [Hidden importers of deleted files] → `npx tsc --noEmit` plus a `git grep` for the module's identifiers must return clean.
- [Analytics keeps a "Público / Privado" panel] → It shows history only. Removed in US-0124.
- [Shared links to old pages break] → Accepted; 404 by decision.

## Migration Plan

1. Merge and deploy the frontend.
2. Apply `supabase/migrations/{timestamp}_deprecar_entrenamientos_publicos.sql` (locally via `supabase db reset` during development; production rollout is done by the owner, outside this change).
3. Verify: no training with `visibilidad = 'publico'`, no active publication, row count of `entrenamientos_publicos` unchanged.

**Rollback:** restore the previous policy definitions and grants from the migrations listed in decision 3, and redeploy the previous frontend. Publications would need to be reactivated by hand (`activo = true`), since the migration does not record which ones were active; if that matters, snapshot `select id from entrenamientos_publicos where activo` before applying.

## Open Questions

- None blocking. Whether to snapshot active publication ids before the production run is left to the owner.
