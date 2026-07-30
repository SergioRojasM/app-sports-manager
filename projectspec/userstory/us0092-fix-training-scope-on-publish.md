# US-0092 — Sync training scope (`visibilidad`) when publishing/unpublishing to the marketplace

## ID
US-0092

## Name
Fix: publishing a training to the Public Training Marketplace does not flip the source training's scope to public, blocking non-member visitors from viewing the booking form or reserving

## As a
Tenant administrator (publisher) and any authenticated platform user who is **not** a member of the publishing tenant (visitor)

## I Want
The act of publishing a training (via "Publicar" / `entrenamientosPublicosService.publicarEntrenamiento`) to actually make the underlying `entrenamientos` row readable cross-tenant (`visibilidad = 'publico'`), and unpublishing to revert it — so that the entire booking pipeline (viewing categories/levels, restriction evaluation, form step, and the reservation itself) works for a visitor exactly as US-0089 already promises, instead of silently failing.

## So That
Prospective athletes who are not members of the publishing club can actually book a session they find on `/portal/entrenamientos-publicos`, instead of hitting "No se encontró el entrenamiento" or a booking form with no selectable levels — which today makes every published listing effectively unbookable by the exact audience it was built for.

---

## Description

### Current State

US-0089 introduced `entrenamientos_publicos` as a denormalized, publisher-curated snapshot of a training, explicitly deciding **not** to touch `entrenamientos.visibilidad`/`visible_para` (US-0013's older publico/privado flag) when publishing — the assumption being that the booking flow only ever needs to read `entrenamientos_publicos` plus create a `reservas` row through the existing pipeline.

That assumption is wrong in practice, because the *existing* booking pipeline (`reservasService`, reused as-is per US-0089 §4) reads the **source** `entrenamientos` row directly, and several other tables that are joined via `entrenamiento_id`, at multiple points:

- `entrenamientosPublicosService.publicarEntrenamiento` (`src/services/supabase/portal/entrenamientos-publicos.service.ts:99-177`) and `despublicarEntrenamiento` (line 179) only ever write to `entrenamientos_publicos`. **Neither ever updates `entrenamientos.visibilidad`/`visible_para` on the source row.**
- `entrenamientos_select_authenticated` (from `20260301000100_entrenamientos_visibilidad.sql`) only grants cross-tenant `SELECT` on `entrenamientos` when `visibilidad = 'publico'`. Since publish never sets this, the row stays `'privado'` and is invisible to a non-member — even though its marketing snapshot in `entrenamientos_publicos` is visible.
- `usePublicTrainingReserva.ts:55-60` selects `formulario_id, formulario_externo, formulario_obligatorio` directly from `entrenamientos` — blocked by RLS for a visitor, so the internal/external form step silently never triggers.
- `reservasService.validateBookingRestrictions` (`reservas.service.ts:305-314`) does a `.single()` select on `entrenamientos` — for a non-member this returns zero rows under RLS, `.single()` errors, and `create()` throws `ReservaServiceError('not_found', 'No se encontró el entrenamiento.')`. **This is the concrete failure a visitor hits when trying to book.**
- `reservasService.getCategoriasConDisponibilidad` (`reservas.service.ts:200-211`) selects from `entrenamiento_categorias`, whose RLS (`entrenamiento_categorias_select_authenticated`, `20260311000100_entrenamiento_categorias_niveles.sql:263-273`) requires tenant membership with **no** publico branch at all — a visitor gets zero categories back, so the booking form renders with no selectable level even before the `not_found` error above is reached.
- `reservasService.validateBookingRestrictions` also selects from `entrenamiento_restricciones` (line 336-341), whose RLS (`ent_restricciones_select_authenticated`, `20260319000100_entrenamiento_restricciones.sql:120-130`) is also membership-only with no publico branch. If this select is silently emptied by RLS instead of erroring, the code's "zero rows = unrestricted" fallback (line 346-348) would **incorrectly bypass** any non-servicio restriction (`usuario_estado`, `validar_nivel_disciplina`) a published training still carries — publish-time validation only ever blocked *servicio*-based restrictions (US-0089 §1a), so this is a real, silent gap, not just a UX annoyance.
- `reservasService.getMyReserva` (duplicate-booking check, line 126-148) and `getCapacidad` both select from `reservas`, whose RLS (`reservas_select_authenticated`, `20260302000200_reservas_rls_policies.sql:36-55`) is membership-only. For a visitor these silently return empty results, meaning the duplicate-booking guard and the capacity-availability check are both blind for cross-tenant bookings.
- The actual `INSERT` into `reservas` happens through the `book_and_deduct_service_units` RPC (`SECURITY DEFINER`, `20260723000100_formulario_respuestas.sql:77-223`), which bypasses table RLS entirely and does **not** independently check tenant membership — so the insert itself is not actually the blocker; the blockers above (mainly the `entrenamientos` `.single()` failing) are.
- A related but distinct gap: if a published training's attached form has an **image-type field**, `useFormularioRespuestaForm.uploadImage()` → `storageService.uploadFormularioRespuestaImage()` (`storage.service.ts:121-148`) uploads to Supabase **Storage** (`org-assets` bucket, path `orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/{campoNombre}-{timestamp}.{ext}`), then immediately calls `createSignedUrl()` on the same object. Both the **INSERT** (`athlete_upload_own_formulario_respuestas`, `20260723000200_formulario_respuestas_storage.sql:7-22`) and the only covering **SELECT** (`org_member_read`, `20260324000100_create_org_assets_bucket.sql:84-97`) policies on `storage.objects` are membership-gated with no public-training branch — this is a *Storage* RLS gap, a different policy surface than the four table-level policies above, and was missed in the first pass of this fix.

Net effect: **every published listing is unbookable by a true non-member visitor today**, and even a member browsing the marketplace UI for a listing outside a tenant they belong to hits the same wall. This directly matches the reported symptom: "los usuarios que no son miembros del equipo no pueden ver el formulario ni reservar."

Separately, while fixing this flow, `PublicarEntrenamientoModal.tsx`'s footer button labels were found to be unclear about what they actually do: the left button always reads "Despublicar" and the right primary button silently switches between "Publicar" and "Guardar cambios" depending on `isPublished`, with no visual distinction between "this button publishes/republishes" vs. "this button removes the public listing." An admin managing an already-published training sees two buttons ("Despublicar" and "Guardar cambios") with overlapping, ambiguous intent.

### Proposed Changes

This US has two independent parts: a database-only fix (below) and a small copy/clarity fix in the existing publish modal (§4). Neither requires new services, hooks, or route changes.

#### 1. Sync `entrenamientos.visibilidad`/`visible_para` from `entrenamientos_publicos.activo`

Add a trigger on `entrenamientos_publicos` that keeps the source training's scope in lock-step with its publication state, so the fix holds for the existing service code path **and** any future direct write to the table (same defense-in-depth spirit as the existing `entrenamientos_publicos_no_servicio_restriccion` trigger from US-0089):

- `AFTER INSERT OR UPDATE ON entrenamientos_publicos, FOR EACH ROW`:
  - When `NEW.activo = true`: set `entrenamientos.visibilidad = 'publico'` and `entrenamientos.visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'` (the `PUBLIC_TENANT_ID` sentinel already used by `resolveVisiblePara()` in `entrenamientos.service.ts:36-38` for the same `'publico'` case) on the row referenced by `NEW.entrenamiento_id`.
  - When `NEW.activo = false` (despublish): set `entrenamientos.visibilidad = 'privado'` and `entrenamientos.visible_para = NEW.tenant_id` on the same row — reverting to exactly what `resolveVisiblePara('privado', tenantId)` would compute.
  - The trigger runs as `SECURITY INVOKER` (no `security definer`, matching the existing sibling trigger's style) — this is safe because only a tenant admin can ever write to `entrenamientos_publicos` (existing insert/update RLS), and that same admin already has `UPDATE` rights on `entrenamientos` via `entrenamientos_update_trainer_admin`, so the trigger's own write to `entrenamientos` is never blocked by RLS.

#### 2. Backfill already-published trainings

A number of trainings may already have an active `entrenamientos_publicos` row (`activo = true`) whose source `entrenamientos.visibilidad` was never flipped, per the bug described above. Backfill them in the same migration so the fix applies retroactively without requiring admins to reopen "Gestionar publicación" on every listing.

#### 3. Extend RLS so the rest of the booking pipeline actually works for a public training, not just the `entrenamientos` row itself

Add a `visibilidad = 'publico'` branch (via the training's `entrenamiento_id`) to the following policies, alongside their existing membership check:

- `entrenamiento_categorias_select_authenticated` — so `getCategoriasConDisponibilidad` returns real levels/capacity to a visitor.
- `ent_restricciones_select_authenticated` — so `validateBookingRestrictions` actually evaluates any remaining non-servicio restriction instead of silently treating the training as unrestricted for a non-member.
- `reservas_select_authenticated` — so `getMyReserva` (duplicate check) and `getCapacidad` (availability) see the real reservation count for that specific public training. This intentionally exposes the same aggregate visibility level a tenant member already has for their own tenant's trainings (see how the current policy is not filtered by `atleta_id`); it does not expose any reservation on a *different, non-public* training.
- `reservas_insert_authenticated` — add a self-booking branch (`atleta_id = auth.uid()` and the target training is `publico`) for defense-in-depth/consistency with the RLS model, even though the actual insert goes through the `SECURITY DEFINER` `book_and_deduct_service_units` RPC and does not depend on this policy today.

None of the four policies above lose their existing membership branch — this is strictly additive.

#### 4. Clarify the publish/unpublish button labels in `PublicarEntrenamientoModal.tsx`

Update the footer (`src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx:198-228`) so each button's label unambiguously states what it does, driven by the same `isPublished` prop already passed in:

- **Not published** (`isPublished === false`): footer shows a single primary action, **"Publicar"** (`onSubmit`) — unchanged from today.
- **Already published** (`isPublished === true`): footer shows **both**:
  - The left, destructive-styled button (currently labeled "Despublicar", line 200-207) is relabeled **"Quitar publicación"** — same `onDespublicar` handler, no behavior change, just clearer wording (mirrors the "Publicar"/"unpublish" pairing so the two actions read as opposites).
  - The right, primary button (currently labeled "Guardar cambios", line 217-227) is relabeled **"Guardar cambios de la publicación"** — same `onSubmit` handler (still upserts `entrenamientos_publicos` with the edited nombre/descripcion/precio/banner), only the copy changes so it's clear this saves the *publication's* marketing fields, not the training itself. The `isSubmitting` loading label becomes "Guardando cambios..." to match.
- No handler, prop, or hook signature changes — this is a copy-only change confined to the JSX in `PublicarEntrenamientoModal.tsx`.

#### 5. Storage RLS for form-response image uploads on a published training

- Widen `athlete_upload_own_formulario_respuestas` (INSERT on `storage.objects`) in place with an additive `OR exists (...)` branch: allow the upload when there is no tenant membership, provided the path's `tenantId` + `formularioPlantillaId` (read via `storage.foldername(name)`) match an `entrenamientos` row with `visibilidad = 'publico'`. Safe to widen in place — the policy is already scoped to the caller's own `auth.uid()` folder, so this only ever lets someone touch their own uploaded files.
- Add a **new**, narrowly-scoped SELECT policy `public_training_formulario_respuesta_read` rather than widening the generic `org_member_read` (which covers every `org-assets` path — banners, logos, receipts — and would leak unrelated tenant assets to any authenticated user if widened). Mirrors the existing precedent of `public_training_banner_read` from US-0089 (a new, path-scoped policy, not a widened generic one). Scoped to the caller's own uploaded file (`[4] = auth.uid()::text`) under a published training's formulario path — a non-member only ever needs to preview their own submission.
- No change to `staff_upload_formulario_respuestas_on_behalf` — staff acting on behalf of an athlete are always tenant members already.
- **The publishing tenant's admin is unaffected and unchanged**: `org_member_read` already grants any active tenant member read access to *every* file under `orgs/{tenantId}/...` with no ownership restriction, so admin review of a cross-tenant visitor's submitted image already works today via that pre-existing policy — nothing here needs to grant or restricts that.

---

## Database Changes

New migration: `supabase/migrations/20260727010000_entrenamientos_publicos_sync_visibilidad.sql`

```sql
begin;

-- 1. Keep entrenamientos.visibilidad/visible_para in sync with entrenamientos_publicos.activo,
--    so the existing booking pipeline (which reads the SOURCE entrenamientos row directly, not
--    just entrenamientos_publicos) actually becomes visible/bookable cross-tenant once published.
create or replace function public.sync_entrenamiento_visibilidad_on_publicacion()
returns trigger
language plpgsql
as $$
begin
  if new.activo then
    update public.entrenamientos
       set visibilidad = 'publico',
           visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'
     where id = new.entrenamiento_id
       and visibilidad is distinct from 'publico';
  else
    update public.entrenamientos
       set visibilidad = 'privado',
           visible_para = new.tenant_id
     where id = new.entrenamiento_id
       and visibilidad = 'publico';
  end if;

  return new;
end;
$$;

create trigger entrenamientos_publicos_sync_visibilidad
  after insert or update on public.entrenamientos_publicos
  for each row execute function public.sync_entrenamiento_visibilidad_on_publicacion();

-- 2. Backfill: fix trainings that were already published before this migration existed.
update public.entrenamientos e
   set visibilidad = 'publico',
       visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'
  from public.entrenamientos_publicos ep
 where ep.entrenamiento_id = e.id
   and ep.activo = true
   and e.visibilidad is distinct from 'publico';

-- 3. Extend RLS so the rest of the booking pipeline can read what it needs for a public training.

drop policy if exists entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias;
create policy entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias
  for select to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos e
      join public.miembros_tenant mt on mt.tenant_id = e.tenant_id
      where e.id = entrenamiento_categorias.entrenamiento_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists ent_restricciones_select_authenticated on public.entrenamiento_restricciones;
create policy ent_restricciones_select_authenticated on public.entrenamiento_restricciones
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = entrenamiento_restricciones.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_restricciones.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = reservas.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists reservas_insert_authenticated on public.reservas;
create policy reservas_insert_authenticated on public.reservas
  for insert to authenticated
  with check (
    (
      exists (
        select 1 from public.miembros_tenant mt
        where mt.tenant_id = reservas.tenant_id
          and mt.usuario_id = auth.uid()
      )
      and (
        atleta_id = auth.uid()
        or reservas.tenant_id in (
          select ta.tenant_id
          from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
        )
      )
    )
    or (
      atleta_id = auth.uid()
      and exists (
        select 1 from public.entrenamientos e
        where e.id = reservas.entrenamiento_id
          and e.visibilidad = 'publico'
      )
    )
  );

-- 4. Storage RLS for form-response image uploads on a published training: the athlete
--    upload/read-back policies were membership-gated with no public-training branch,
--    so a non-member visitor's image field upload failed before it ever reached the
--    formulario_respuestas insert (which is otherwise fine — SECURITY DEFINER RPC).

drop policy if exists athlete_upload_own_formulario_respuestas on storage.objects;
create policy athlete_upload_own_formulario_respuestas on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and (
      exists (
        select 1 from public.miembros_tenant mt
        where mt.usuario_id = auth.uid()
          and mt.tenant_id = ((storage.foldername(name))[2])::uuid
          and mt.estado = 'activo'
      )
      or exists (
        select 1 from public.entrenamientos e
        where e.tenant_id = ((storage.foldername(name))[2])::uuid
          and e.formulario_id = ((storage.foldername(name))[6])::uuid
          and e.visibilidad = 'publico'
      )
    )
  );

-- New, narrowly-scoped SELECT policy (not a widening of org_member_read, which covers
-- every org-assets path — banners, logos, receipts — and would leak unrelated tenant
-- assets to any authenticated user). Scoped to the caller's own uploaded file under a
-- published training's formulario path; the publishing tenant's members already read
-- this same file via the pre-existing, unmodified org_member_read policy.
drop policy if exists public_training_formulario_respuesta_read on storage.objects;
create policy public_training_formulario_respuesta_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1 from public.entrenamientos e
      where e.tenant_id = ((storage.foldername(name))[2])::uuid
        and e.formulario_id = ((storage.foldername(name))[6])::uuid
        and e.visibilidad = 'publico'
    )
  );

commit;
```

**Rationale for the `PUBLIC_TENANT_ID` sentinel** — `'2a089688-3cfc-4216-9372-33f50079fbd1'` is the exact constant already exported as `PUBLIC_TENANT_ID` from `src/lib/constants.ts:7` and used by `resolveVisiblePara()` in `entrenamientos.service.ts:36-38` whenever the wizard (pre-US-0089) set a training to `'publico'`. Reusing it here keeps `visible_para` consistent with every other code path that has ever set `visibilidad = 'publico'`, even though no current RLS policy actually reads `visible_para` (it is set for consistency/future-proofing only, matching existing convention — do not treat this as license to start depending on it).

**Why the trigger does not also fire on `DELETE`** — the only way `entrenamientos_publicos` rows change today is insert (publish) and update (`activo` toggled by despublish/republish); there is no delete path in `entrenamientosPublicosService`. If a future US adds one, add an `AFTER DELETE` trigger branch reverting to `'privado'` at that time — out of scope here.

---

## API / Server Actions

No new service functions or signature changes. `entrenamientosPublicosService.publicarEntrenamiento` and `despublicarEntrenamiento` (`src/services/supabase/portal/entrenamientos-publicos.service.ts`) keep writing only to `entrenamientos_publicos`, exactly as today — the new DB trigger is what propagates the scope change to `entrenamientos`. This keeps the source-of-truth for "is this training public" in one place (the trigger) regardless of which code path writes to `entrenamientos_publicos`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260727010000_entrenamientos_publicos_sync_visibilidad.sql` | New trigger to sync `entrenamientos.visibilidad`/`visible_para` from `entrenamientos_publicos.activo`; backfill existing published trainings; extend RLS on `entrenamiento_categorias`, `entrenamiento_restricciones`, `reservas` (select + insert); widen `athlete_upload_own_formulario_respuestas` and add `public_training_formulario_respuesta_read` on `storage.objects` |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | Relabel footer buttons: "Despublicar" → "Quitar publicación" (line ~206); "Guardar cambios" → "Guardar cambios de la publicación" (line ~223); "Guardando..." → "Guardando cambios..." when `isPublished` |

No service, hook, or route changes are required for this US.

---

## Acceptance Criteria

1. Applying the migration locally creates the `entrenamientos_publicos_sync_visibilidad` trigger on `entrenamientos_publicos` (`AFTER INSERT OR UPDATE`).
2. As a tenant admin, publishing a training via "Publicar" (`entrenamientosPublicosService.publicarEntrenamiento`) results in the source `entrenamientos` row having `visibilidad = 'publico'` and `visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'` immediately after the call returns.
3. Clicking "Despublicar" (`despublicarEntrenamiento`, sets `activo = false`) results in the source `entrenamientos` row reverting to `visibilidad = 'privado'` and `visible_para = <tenant_id>`.
4. Republishing (reopening "Gestionar publicación" and saving again, `activo` re-set to `true`) flips `visibilidad` back to `'publico'`.
5. Running the migration against a database that already has one or more `entrenamientos_publicos` rows with `activo = true` updates those trainings' `visibilidad` to `'publico'` as part of the backfill, without requiring the admin to reopen the publish modal.
6. As an authenticated user who is **not** a member of the publishing tenant: opening `/portal/entrenamientos-publicos`, selecting a published listing, and clicking "Reservar" successfully loads `PublicTrainingReservaModal` with selectable category/level options (`getCategoriasConDisponibilidad` no longer returns an empty list due to RLS).
7. The same non-member visitor can submit the booking form and a `reservas` row is created (`reservasService.create` no longer throws `ReservaServiceError('not_found', 'No se encontró el entrenamiento.')`).
8. A published training with an attached internal form template (`formulario_id`) correctly routes the non-member visitor through `FormularioRespuestaModal` before booking — proving `usePublicTrainingReserva.ts`'s direct `entrenamientos` select for `formulario_id`/`formulario_externo`/`formulario_obligatorio` now succeeds under RLS.
9. A published training that still carries a non-servicio `entrenamiento_restricciones` row (e.g. `validar_nivel_disciplina`) correctly **rejects** a non-member visitor who doesn't meet it, with the same `NIVEL_INSUFICIENTE`/`USUARIO_INACTIVO` messaging used for same-tenant bookings — proving the restriction is now actually evaluated for a visitor instead of being silently skipped by RLS returning zero rows.
10. Attempting to book the same published training twice as the same non-member athlete is rejected as a duplicate booking (`getMyReserva` now correctly sees the visitor's own prior `reservas` row instead of an RLS-emptied result).
11. Booking a published training whose capacity is already full is rejected with `capacity_exceeded` for a non-member visitor exactly as it would be for a same-tenant member (`getCapacidad` now sees the real count).
12. Editing/publishing does not affect any *other*, non-published training's `visibilidad` — the trigger only ever touches the single row referenced by `entrenamientos_publicos.entrenamiento_id`.
13. A pre-existing legacy training whose `visibilidad` was already `'publico'` from before US-0089 (unrelated to this publish flow) is unaffected unless it is also published/despublished through this flow — despublishing an entry not currently `'publico'` is a no-op (the `UPDATE ... WHERE visibilidad = 'publico'` guard prevents unintended writes).
14. Opening "Publicar" on a training with no existing publication shows a single footer button labeled **"Publicar"**.
15. Opening "Gestionar publicación" on an already-published training shows two footer buttons: **"Quitar publicación"** (left, calls `onDespublicar`) and **"Guardar cambios de la publicación"** (right primary, calls `onSubmit`) — neither button reads "Despublicar" or the bare "Guardar cambios" anymore.
16. Editing nombre/descripción/precio/banner on an already-published training and clicking "Guardar cambios de la publicación" persists the changes to `entrenamientos_publicos` exactly as "Guardar cambios" did before the rename (no functional regression, copy-only change).
17. As a non-member visitor booking a published training whose attached form has an image-type field: uploading an image succeeds (`storageService.uploadFormularioRespuestaImage` no longer throws an RLS error on `.upload()`), and the returned signed URL resolves (the immediate `createSignedUrl()` read-back also succeeds).
18. The same upload attempt for a **non-published** (private) training's form is still rejected (regression check — the widened INSERT policy does not accidentally open uploads for private trainings).
19. An existing tenant member's image upload for any training in their own tenant (public or private) continues to work via the original membership branch (no regression).
20. The publishing tenant's admin can still read a non-member visitor's uploaded form image (e.g. when reviewing the `formulario_respuestas` row) via the pre-existing, unmodified `org_member_read` policy — this US neither grants nor restricts that access.

---

## Implementation Steps

- [ ] Create migration `20260727010000_entrenamientos_publicos_sync_visibilidad.sql` with the trigger, backfill, and four RLS policy updates above.
- [ ] Apply locally (`supabase migration up` / reset per project convention) and verify the trigger fires on both insert and update of `entrenamientos_publicos`.
- [ ] Verify the backfill: seed a scenario with an existing `activo = true` publication whose source training is still `visibilidad = 'privado'`, run the migration, confirm it flips.
- [ ] Manual test: as admin in Tenant A, publish a training; as a user with zero membership in Tenant A, open the marketplace, open the listing, confirm categories/levels load and the booking form is usable.
- [ ] Manual test: complete a booking as that non-member visitor; confirm a `reservas` row exists with the correct `atleta_id`/`entrenamiento_id`/`tenant_id`.
- [ ] Manual test: publish a training with a `validar_nivel_disciplina` restriction row (no servicio slots, since those are already blocked at publish time); confirm a non-qualifying non-member visitor is correctly rejected, not silently allowed through.
- [ ] Manual test: despublish, confirm `entrenamientos.visibilidad` reverts to `'privado'` and the training becomes unbookable/invisible again to the non-member visitor.
- [ ] Manual test: attempt the same non-member booking a second time for the same training; confirm the duplicate-booking rejection fires.
- [ ] Re-run the existing US-0089 manual test suite (same-tenant booking flows) to confirm none of the four widened RLS policies regressed member-only behavior.
- [ ] Relabel the two footer buttons in `PublicarEntrenamientoModal.tsx` per §4 ("Quitar publicación" / "Guardar cambios de la publicación"); manually verify both still call their existing, unchanged handlers (`onDespublicar` / `onSubmit`).
- [ ] Widen `athlete_upload_own_formulario_respuestas` and add `public_training_formulario_respuesta_read` per §5; verify via SQL: non-member upload+read succeeds for a published training's form, is rejected for a private one, an existing member's upload still works, and the tenant admin can still read the visitor's uploaded image via `org_member_read`.

---

## Non-Functional Requirements

- **Security**:
  - RLS remains the sole enforcement boundary; the trigger only ever writes to the single `entrenamientos` row matching `entrenamiento_id` on the `entrenamientos_publicos` row being written, scoped by that row's own insert/update RLS (admin-of-tenant only) — a visitor can never trigger this write themselves.
  - The `entrenamiento_restricciones` RLS widening is a **correctness fix, not a new exposure**: it makes real restrictions on published trainings actually enforced for non-members (previously silently bypassed), which is strictly more restrictive in outcome even though the policy itself is more permissive in read access.
  - The `reservas` SELECT widening only exposes reservation rows tied to a `publico`-visibility training (i.e., a training an admin explicitly published) — no additional exposure of any private-tenant reservation data.
- **Performance**: Each new RLS branch adds one indexed `exists (select 1 from entrenamientos where id = ... and visibilidad = 'publico')` lookup — `entrenamientos.id` is the primary key and `idx_entrenamientos_visibilidad` already exists from US-0013, so this is a cheap, indexed check on every affected query.
- **Error handling**: No new error paths are introduced; existing `ReservaServiceError`/`EntrenamientoPublicoServiceError` messaging is unchanged — this US only makes previously-unreachable-for-visitors code paths reachable, with their existing messages.
- **Data integrity**: The trigger's `WHERE visibilidad IS DISTINCT FROM 'publico'` / `WHERE visibilidad = 'publico'` guards avoid unnecessary writes (and avoid bumping `entrenamientos.updated_at` via its own `set_updated_at` trigger) when the value is already in the target state.
