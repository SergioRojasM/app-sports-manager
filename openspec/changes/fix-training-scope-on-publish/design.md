## Context

US-0089 built the Public Training Marketplace on top of a new, denormalized `entrenamientos_publicos` table and deliberately left the older `entrenamientos.visibilidad`/`visible_para` flag (US-0013) untouched by the publish flow. That decision assumed the booking flow only needed `entrenamientos_publicos` plus the existing `reservasService`. In reality `reservasService` (reused as-is per US-0089 §4) reads the **source** `entrenamientos` row and three other tables (`entrenamiento_categorias`, `entrenamiento_restricciones`, `reservas`) directly, all gated by membership-only RLS with no "this training is publicly published" branch except `entrenamientos` itself (which already has a `visibilidad = 'publico'` OR-branch from US-0013, but nothing ever sets it). Net result: every published listing is unbookable by a non-member visitor today. Full trace is documented in `projectspec/userstory/us0092-fix-training-scope-on-publish.md`.

Separately, `PublicarEntrenamientoModal.tsx`'s footer buttons ("Despublicar" / "Guardar cambios") don't clearly state what each does for an already-published training.

## Goals / Non-Goals

**Goals:**
- Make `entrenamientos.visibilidad` track `entrenamientos_publicos.activo` automatically, for both the existing service code path and any future direct write.
- Fix the already-broken production data (backfill).
- Close the remaining RLS gaps so the *existing, unmodified* booking pipeline works end-to-end for a non-member visitor.
- Make the publish modal's two possible footer actions unambiguous.

**Non-Goals:**
- No changes to `reservasService`, `usePublicTrainingReserva`, `PublicTrainingReservaModal`, or any hook/type — the booking pipeline logic is correct today; it's only blind due to RLS.
- No change to the `entrenamiento_restricciones` servicio-based publish-time block (US-0089 §1a) — out of scope here.
- No new "my reservations across tenants" view — still an explicitly documented US-0089 known limitation.
- No removal of the legacy `visibilidad`/`visible_para` mechanism or its original radio-toggle history — this change only adds an automatic writer (the trigger) on top of the existing column.

## Decisions

**1. Sync via a DB trigger on `entrenamientos_publicos`, not a service-layer write.**
Alternative considered: have `entrenamientosPublicosService.publicarEntrenamiento`/`despublicarEntrenamiento` explicitly update `entrenamientos.visibilidad` after their own write. Rejected because the codebase already has a precedent for this exact pattern — the `entrenamientos_publicos_no_servicio_restriccion` trigger from US-0089 — and a trigger guarantees the sync holds atomically in the same transaction as the `entrenamientos_publicos` write, for the current service code path *and* any future direct write (e.g. a scratch script, a future admin bulk-action), without needing every future writer to remember to also patch `entrenamientos`.

**2. Trigger runs `SECURITY INVOKER` (no `SECURITY DEFINER`).**
The acting user (a tenant admin, per `entrenamientos_publicos`'s own insert/update RLS) already has `UPDATE` rights on `entrenamientos` via `entrenamientos_update_trainer_admin`, so the trigger's own write is never blocked. Keeping it invoker-scoped (matching the sibling servicio-restriction trigger's style) avoids granting the function owner's elevated privileges where they aren't needed.

**3. Reuse the existing `PUBLIC_TENANT_ID` sentinel for `visible_para`, not `NULL`.**
`resolveVisiblePara()` in `entrenamientos.service.ts` already computes `visible_para = PUBLIC_TENANT_ID` for any training set to `'publico'` through the (now-removed) wizard radio toggle. Reusing the same constant keeps `visible_para` consistent with every other code path that has ever set `visibilidad = 'publico'`, even though no current RLS policy reads `visible_para` — this is a consistency/future-proofing choice, not a functional requirement.

**4. Widen RLS with an additive `visibilidad = 'publico'` branch, not a new booking pipeline.**
Alternative considered: build a parallel, marketplace-specific set of read functions/RPCs that bypass RLS (like `book_and_deduct_service_units` already does for the insert). Rejected — it would duplicate logic that already exists and is already reused (per US-0089's explicit "no new booking pipeline" design goal), and would create two divergent code paths to maintain. An additive `OR exists (... visibilidad = 'publico')` branch on each of the four affected policies is the minimal, most consistent fix, symmetric with how `entrenamientos_select_authenticated` already does exactly this for the `entrenamientos` table itself.

**5. `reservas_insert_authenticated` widened for defense-in-depth even though the RPC bypasses it today.**
The actual `INSERT` happens through `book_and_deduct_service_units`, a `SECURITY DEFINER` RPC that bypasses table RLS and does not itself check tenant membership — so this specific policy change is not required for the marketplace flow to function. It is still included so the RLS model accurately reflects what the system actually allows, in case a future code path does a direct `.insert()` on `reservas` instead of going through the RPC.

**6. Storage RLS: widen the athlete INSERT policy in place, but add a new, narrowly-scoped SELECT policy rather than widening `org_member_read`.**
The generic `org_member_read` policy covers *every* `org-assets` path — banners, logos, receipts, not just form-response images — so widening it with a public-training branch would leak unrelated tenant assets (e.g. another org's banner) to any authenticated user who happens to satisfy the join. Instead, a new policy (`public_training_formulario_respuesta_read`) is scoped precisely to the `.../users/{ownUid}/formularios/...` path shape, and further restricted to the caller's own uploaded file (`[4] = auth.uid()::text`) since a visitor only ever needs to preview their own submission. This mirrors the existing precedent of `public_training_banner_read` from US-0089 (a new, path-scoped policy rather than a widened generic one). The INSERT policy (`athlete_upload_own_formulario_respuestas`), by contrast, is already narrowly scoped to the caller's own folder, so widening it in place is safe. Critically, this design leaves `org_member_read` completely untouched — the publishing tenant's admin already has full read access to a visitor's uploaded image via that existing, unmodified policy, since it has no ownership restriction; this was explicitly verified (see Migration Plan).

**7. Publish modal button relabel is copy-only.**
User story clarification: keep the "save while already published" action (don't remove it), just make its label state what it does ("Guardar cambios de la publicación") instead of the ambiguous "Guardar cambios". No handler, prop, or hook change — confirmed via `AskUserQuestion` during story authoring that the recommended resolution was to rename, not remove.

## Risks / Trade-offs

- **[Risk] The `entrenamiento_restricciones` RLS widening changes *what silently happens* for non-servicio restrictions on a published training** (previously: silently bypassed because RLS hid the rows; now: correctly evaluated and potentially rejects the visitor) → **Mitigation**: this is a correctness fix, not a new exposure — the spec explicitly calls out the "before" behavior as a real bug (a restriction that should block a visitor was being silently ignored). Covered by an explicit scenario/AC and a manual test step.
- **[Risk] Trigger fires on every `UPDATE` of `entrenamientos_publicos`, including saves that don't change `activo`** → **Mitigation**: the `WHERE visibilidad IS DISTINCT FROM 'publico'` / `WHERE visibilidad = 'publico'` guards make repeated saves a no-op after the first sync, avoiding unnecessary writes or bumping `entrenamientos.updated_at`.
- **[Risk] A pre-existing legacy training with `visibilidad = 'publico'` from before US-0089 (unrelated to this publish flow) could have its scope silently reverted if it is ever despublished through this new flow** → **Mitigation**: this can only happen if that training is also run through `entrenamientosPublicosService.publicarEntrenamiento`/`despublicarEntrenamiento`, which is a deliberate admin action; accepted as a rare edge case, same class as other legacy-data edge cases already accepted in US-0089 (e.g. AC #9).
- **[Trade-off] No new RLS policy for `formulario_id`/`formulario_externo`/`formulario_obligatorio` specifically** — these are plain columns on `entrenamientos`, already covered by the widened-via-trigger `visibilidad = 'publico'` on the `entrenamientos_select_authenticated` policy (US-0013), so no additional policy change is needed there.
- **[Risk] A formulario template shared across multiple trainings in the same tenant becomes upload-accessible to non-members as soon as *any one* of those trainings is published**, even if the visitor is technically filling out a response tied to a different (private) training that happens to reuse the same template → **Mitigation**: accepted — the path only ever grants access to the caller's *own* folder (`auth.uid()`), and the practical scenario (a visitor reaching this upload path at all) only happens via the booking flow for a training they can already see, which is gated by `entrenamientos_select_authenticated`'s own `visibilidad = 'publico'` check upstream.

## Migration Plan

1. Write and apply the migration locally only (`supabase migration up` / local reset) — never push directly to the remote Supabase project per project convention.
2. Verify the trigger and backfill against local seed/test data covering: a training with no publication, an active publication, and a despublished (`activo = false`) publication.
3. Verify each widened RLS policy independently (as both a tenant member and a non-member session) before wiring up any manual end-to-end booking test — including a dedicated check that the publishing tenant's admin can still read a non-member visitor's uploaded form image via the unmodified `org_member_read` policy.
4. Ship the `PublicarEntrenamientoModal.tsx` copy change in the same PR (no coordination needed — independent of the DB change).
5. No rollback complexity beyond a standard reverse migration (drop trigger/function, restore prior policy definitions) if needed — no data is irreversibly destroyed; the backfill only flips `visibilidad`/`visible_para` on rows that are already, by definition, actively published.

## Open Questions

None — scope, sentinel value, and button-label resolution were confirmed against the source user story and its `AskUserQuestion` clarification during authoring.
