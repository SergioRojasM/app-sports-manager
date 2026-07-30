## Why

Publishing a training to the Public Training Marketplace (US-0089) never flips the source `entrenamientos.visibilidad` field to `'publico'`. Because the *existing* booking pipeline (`reservasService`, reused as-is by the marketplace) reads the source `entrenamientos` row directly — plus `entrenamiento_categorias`, `entrenamiento_restricciones`, and `reservas`, all gated by membership-only RLS — every published listing is effectively unbookable by the exact non-member audience it was built for: the booking form loads with zero selectable categories and submitting fails with "No se encontró el entrenamiento." Separately, the publish modal's footer buttons ("Despublicar" / "Guardar cambios") don't clearly communicate what each one does once a training is already published.

## What Changes

- Add a database trigger on `entrenamientos_publicos` that syncs `entrenamientos.visibilidad`/`visible_para` whenever a publication is activated (`activo = true` → `'publico'`) or deactivated (`activo = false` → `'privado'`), so publish/despublish actually changes the source training's cross-tenant readability.
- Backfill `entrenamientos.visibilidad` for trainings that already have an active `entrenamientos_publicos` row, fixing already-published listings that are stuck broken today.
- Extend RLS on `entrenamiento_categorias` (SELECT), `entrenamiento_restricciones` (SELECT), and `reservas` (SELECT + INSERT) with an additional branch that permits access when the target training is `visibilidad = 'publico'` — closing the remaining gaps that block a non-member from loading categories, having restrictions correctly evaluated, and having their own booking/capacity visible.
- Extend Storage RLS on `storage.objects` (widen `athlete_upload_own_formulario_respuestas`; add a new, narrowly-scoped `public_training_formulario_respuesta_read`) so a non-member visitor can upload and preview an image-type field on a published training's attached form — a separate policy surface (Storage, not table RLS) that the first pass of this fix missed.
- Relabel `PublicarEntrenamientoModal.tsx`'s footer buttons: "Despublicar" → "Quitar publicación"; "Guardar cambios" → "Guardar cambios de la publicación" (copy-only, same handlers).

## Capabilities

### New Capabilities
- `public-training-booking-access`: cross-tenant read access and scope-sync mechanics that make a published training's booking pipeline (categories, restrictions, capacity, duplicate-check, reservation insert) actually work for a visitor who is not a member of the publishing tenant, plus the publish-modal button labeling that makes the publish/unpublish actions unambiguous.

### Modified Capabilities
(none — the existing `training-management`/`training-booking`/`training-booking-restrictions` specs describe manual visibility toggling and same-tenant booking; this change adds a new, additive sync/access mechanism on top rather than altering those documented requirements)

## Impact

- **Database**: new migration `supabase/migrations/20260727010000_entrenamientos_publicos_sync_visibilidad.sql` — trigger + backfill + 4 table RLS policy updates (`entrenamiento_categorias_select_authenticated`, `ent_restricciones_select_authenticated`, `reservas_select_authenticated`, `reservas_insert_authenticated`) + 2 Storage RLS updates on `storage.objects` (`athlete_upload_own_formulario_respuestas` widened, `public_training_formulario_respuesta_read` added).
- **Frontend**: `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` — footer button copy only, no handler/prop changes.
- **No changes** to any service, hook, route, or type — the existing booking pipeline (`reservasService`, `usePublicTrainingReserva`, `PublicTrainingReservaModal`) works unmodified once the rows it already queries are visible.
