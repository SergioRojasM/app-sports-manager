## Context

- US-0118 delivered `public.eventos` (uuid FKs for disciplina, escenario and entrenador), `eventosService` (with the unused `createEvento` / `updateEvento`), and `GestionEventosPage`. The latter routes "Nuevo evento" and "Editar" through the `onNuevo` / `onEditar` seams to `EventoProximamenteModal`.
- US-0119 asks for a full-page wizard with three steps, snapshots instead of FKs, ticket and coupon tables, an access form, payment-method selection, and a "Guardar borrador" button available anywhere with only the name required.
- Existing building blocks:
  - Data sources: `entrenamientosService.listDisciplineOptions` / `listTrainerOptions`, `scenariosService.listScenariosByTenant`, `formulariosService.getPlantillasByTenant`, `metodosPagoService.getMetodosPago(tenantId, true)`.
  - UI: `ScenarioFormModal` + `useScenarios`, `useFormularioPreview` + `FormularioPreviewModal`, `PublicTrainingDetalleBody` (chrome-agnostic, `item: PublicTrainingListItem`), `EventoCard`.
  - Storage and editor patterns: `storageService.uploadEntrenamientoPublicoBanner` (stores a 1-year signed URL), and the `PublicarEntrenamientoModal` row editors for precio, cronograma and incluye.
- Storage: the `org_admin_upload` / `org_admin_update` policies already allow admins to write anywhere under `orgs/{tenantId}/`. Only a read policy for the new subpath is missing (`public_training_banner_read` is the precedent).
- Constraints:
  - US-0116 visual system (grit tokens and kit, one `h1`). No new mockup: the user confirmed to follow `grit-arena-v2`.
  - Migrations are applied **locally only**, never pushed to remote.
  - No toast system.
  - Layering: page → component → hook → service → types.

## Goals / Non-Goals

**Goals:**
- Create and edit events end to end, through a stepper with live preview.
- Each save is atomic. Drafts can be saved anytime with only a name, and a draft can never leak to members or anon.
- Snapshot semantics for disciplina, escenario, entrenadores and métodos de pago. Stale references are handled gracefully when editing.
- Phase-1 views keep working, adapted to snapshots and drafts.

**Non-Goals:**
- Purchase flow, coupon redemption, per-ticket capacity, autosave, and reverting a published event to draft.
- A trainer route.
- Changing trainings or public trainings.

## Architecture

```
app/.../gestion-eventos/nuevo/page.tsx ──┐
app/.../gestion-eventos/[id]/editar/page.tsx ─┴─► <EventoWizardPage tenantId eventoId?>
                                                   │
      ┌───────────────────────────── components/portal/gestion-eventos/wizard/ ─────────────────────────────┐
      │ Stepper · Footer(Guardar borrador / Publicar | Guardar cambios) · SalirSinGuardarModal               │
      │ Step1: EventoConfiguracionStep ─ EventoPreview(PublicTrainingDetalleBody | EventoCard)               │
      │        EventoEscenarioSelector ─ ScenarioFormModal(useScenarios{onCreated})                          │
      │        EventoEntrenadoresSelector                                                                     │
      │ Step2: EventoEntradasEditor ─ EventoBundleSelector · EventoCuponesEditor · EventoFormularioSelector  │
      │ Step3: EventoMetodosPagoStep (+ summary)                                                             │
      └──────────────────────────────────────────────────────────────────────────────────────────────────────┘
                     │ uses
      hooks: useEventoWizard (draft, steps, validation, save)   useEventoWizardOptions (6 option lists)
                     │                                                   │
      lib/portal/eventos.utils.ts  (draft ⇄ payload, preview adapters, Bogotá datetime, discount math)
                     │
      services: eventosService.getEventoCompleto / guardarEventoCompleto   storageService.uploadEventoBanner
                     │                                                   │
      Supabase: rpc guardar_evento_completo (security invoker, 1 txn)    storage org-assets/orgs/{t}/eventos/
                ├─ eventos (borrador, snapshots, formulario_id, metodos_pago, precio derived)
                ├─ evento_entradas
                └─ evento_entrada_cupones
```

Save sequence:

```
[Guardar borrador | Publicar]
  → validateDraft() | validateAll()      (client, same rules as RPC)
  → uploadEventoBanner()  (only if a new file; deterministic path, upsert)
  → rpc guardar_evento_completo(p_borrador)
       ├ role / tenant / reference checks
       ├ completeness checks (final only)
       ├ upsert eventos, sync entradas + cupones (delete-missing, upsert-present)
       ├ derive eventos.precio
       └ return {evento_id, borrador, entradas:[{client_key,id,cupones:[…]}]}
  → draft:  attach ids by client_key, reset dirty baseline, first save → router.replace(/{id}/editar?paso=N)
    final:  router.push(/gestion-eventos?guardado=creado|editado)
```

## Decisions

### D1. Snapshots stored in the existing column names
`disciplina_id` becomes text (a name), `escenario_id` a jsonb object, and `entrenador_id` a jsonb array. The US explicitly asks to change the *types* of these columns. Keeping the names avoids renaming them across the phase-1 service, types and spec. Each column gets a comment documenting its semantics.
- *Alternative*: rename to `disciplina`, `escenario`, `entrenadores`. Clearer, but it deviates from the US. It is a one-line change per column in the migration if the reviewer prefers it.
- *Why snapshots*: the event page is a published document. Renaming or deleting a venue must not rewrite past events. The cost is that there is no referential integrity; stale values are handled in the UI (D8).

### D2. One invoker RPC for every save, with a draft/final mode
`guardar_evento_completo` performs the whole write (event, ticket sync, coupon sync, derived `precio`) in one transaction, so a failed save never leaves partial rows. It is **security invoker**: every statement runs under the caller's RLS. The function adds atomicity and cross-row validation, not privilege.
- *Alternatives*:
  - Multiple PostgREST calls from the client: not atomic, and the ticket/coupon sync is error-prone.
  - A SECURITY DEFINER function: unnecessary privilege, and it would duplicate the RLS logic.
- Sync semantics: delete the child rows missing from the payload, then `insert … on conflict (id) do update` the present ones. `tenant_id` and `evento_id` are forced server-side. An id that belongs to another event raises `42501`.

### D3. Drafts: `borrador` column, relaxed completeness, strict format
- `borrador boolean default false`.
- Completeness (discipline, ≥1 ticket, ticket name and value, bundle for Múltiple, coupon fields, payment method when paid, active form) is checked **only on final save**, by the client and again by the RPC.
- Format errors (negative value, `desde >= hasta`, malformed code, discount outside 1–100, cross-tenant references, duplicate names or codes) are **always** rejected, because they are wrong in any state and the table checks enforce them.
- The ticket and coupon fields that may be missing in a draft are therefore nullable, and their unique indexes are partial (`where … is not null`).
- The one completeness rule that fits on a single row lives in the table: `check (borrador or disciplina_id is not null)`.
- *Alternatives*:
  - A separate `borrador_datos jsonb` blob: two sources of truth, and the list page could not render drafts consistently.
  - `estado = 'borrador'`: collides with the confirmado⇄cancelado actions and their check constraint.
  - Reusing `activo = false`: already means "hidden/archived" in phase 1.
- One-way: an RPC call with `p_borrador = true` on a stored published event raises `NO_REVERTIR_A_BORRADOR`. The UI hides the draft button for published events, so a live event is never left incomplete.

### D4. Drafts are hidden by RLS, not by the UI
The phase-1 `eventos` SELECT policies are dropped and re-created, with `borrador = false` added to the anon and member branches. The admin/trainer branch is unchanged. `evento_entradas` SELECT policies use `exists (select 1 from eventos …)`, so they inherit the rule automatically. The partial public index is re-created with `and borrador = false`.

### D5. Client-generated ids and `client_key` mapping
- The event id is generated client-side (`crypto.randomUUID()`) on create. The banner path is then known before the first save, and the draft → edit URL switch needs no extra round trip.
- Each ticket and coupon row carries a `clientKey` (a uuid made when the row is added, never persisted) plus its optional persisted `id`. The RPC returns the `client_key` → `id` map. After a draft save the hook writes the ids back, so the next save updates rows instead of inserting duplicates.
- *Alternative*: refetch the whole event after each draft save. Simpler, but it would clobber edits typed while the save was in flight, and it would reset the UI (open collapsibles, focus).

### D6. Draft → edit URL switch without remount
After the first draft save of a new event, the hook calls `router.replace('/…/{id}/editar?paso=N', { scroll: false })`. The two routes render the same client component, but Next.js would remount it across different route segments. To avoid losing state and flashing a load:
1. The hook stores the last-saved draft in a module-level `Map<eventoId, EventoDraft>` handoff (cleared on read).
2. On mount in edit mode, the hook first checks the handoff. If an entry is present, it hydrates from it and skips the fetch; otherwise it fetches normally.

The handoff is memory-only, so a hard reload always fetches from the DB, which is the source of truth.
- *Alternative*: a single catch-all route (`[[...evento]]`) to avoid the remount. It changes the routing shape that the US specifies and complicates the server page. Rejected.

### D7. Live preview through adapters, not new components
`toDetallePreviewItem(draft)` maps the draft to a `PublicTrainingListItem` for `PublicTrainingDetalleBody`; `toCardPreviewItem(draft)` maps it to an `EventoListItem` for `EventoCard` (new `hideActions` prop). Fields without an event equivalent are neutral (`0`, `[]`, `null`). Both are pure and memoized on the draft. `useDeferredValue` is applied to `descripcion_larga` if Markdown rendering lags.
- *Alternative*: new event-specific detail components. Duplicated work, and the look would drift away from the public detail page that the event page will later reuse.

### D8. Stale snapshot handling in edit mode
- The option lists are live (current disciplines, active scenarios, trainers, active payment methods). The stored value is shown even when it no longer matches an option:
  - a discipline name → an extra option "(ya no existe)"
  - an escenario snapshot → "(guardado en el evento)"
  - a payment-method snapshot → checked, with the tag "(inactivo o eliminado)"; once unchecked it cannot be re-checked
- Bundle ids that no longer exist are dropped, with a warning on the ticket card.
- This way nothing is silently lost or silently changed.

### D9. Inline scenario creation reuses `useScenarios`
The wizard's escenario selector uses `useScenarios({ tenantId, onCreated })`: its list is the selector source (one fetch) and its form state drives `ScenarioFormModal`. The new optional `onCreated(scenario)` fires after a successful create; the wizard selects the new scenario from it. The hook is otherwise unchanged, so `ScenariosPage` keeps its behavior.

### D10. `eventos.precio` is derived
The RPC rewrites `precio` from the complete tickets (`nombre` and `valor` not null), ordered by `orden`. Phase-1 cards and the table keep their "Gratis / $X / Desde $X" logic with no join. Drafts with no complete ticket have `precio = []`; the list shows "Precio por definir" for drafts instead of "Gratis".

### D11. Banner storage mirrors public trainings
- Path: `orgs/{tenantId}/eventos/{eventoId}.{ext}`, uploaded with `upsert`. The stored value is the 1-year signed URL, the same convention as `uploadEntrenamientoPublicoBanner`.
- Writes are already covered by the `org_admin_*` policies (admin only, which matches the route).
- A new `event_banner_read` SELECT policy for `authenticated` mirrors `public_training_banner_read`, so that members of other tenants can later see public event banners.
- `uploadEventoBanner(supabase, tenantId, eventoId, file)` returns `{ signedUrl, path }`, with a matching `buildEventoBannerPath` in `storage.types.ts`.

### D12. Coupons are percentage-only and unreadable by non-staff
The `evento_entrada_cupones` RLS is a single `for all` policy for admins and trainers, and `anon` gets no grant. Denormalized `evento_id` and `tenant_id` columns allow the per-event unique code index and a cheap RLS check. Redemption (a later phase) will use a SECURITY DEFINER RPC that returns only the discount.

### D13. Client and server validate the same rules
`useEventoWizard` implements `validateStep(n)`, `validateAll()` and `validateDraft()` with the same rules as the RPC, so the admin gets inline, field-level errors before any request. The RPC errors map to specific Spanish messages and act as a safety net for races (for example, a form deactivated in another tab).

## Risks / Trade-offs

- [The data migration of phase-1 rows fails if `USING (subquery)` is rejected in `ALTER COLUMN … TYPE`] → Use the temp-column / `UPDATE … FROM` / drop / rename pattern for all three columns. Test on seeded local data before committing.
- [Dropping and re-creating the `eventos` SELECT policies briefly changes access during the migration] → It is one transaction (`begin … commit`), so there is no window.
- [Snapshots drift from their source (renamed venue, changed trainer name)] → Intended (D1). The edit UI shows stale markers (D8).
- [Draft rows can hold incomplete tickets that a future purchase flow might read] → Purchases must require `borrador = false`, and RLS already hides draft events. The final save guarantees completeness. This is documented in the tickets spec.
- [Direct PostgREST writes by an admin can bypass the RPC's completeness checks] → Accepted: only admins or trainers of the tenant can write. The purchase phase must still validate ticket completeness server-side.
- [Remount on the draft → edit URL switch loses state] → Module-level handoff (D6). Fallback: a normal fetch, which is correct but shows a brief loader.
- [An uploaded banner is orphaned if the RPC then fails] → Deterministic path, overwritten on retry. Cleanup is out of scope.
- [A signed URL expires after one year] → The same limitation as public trainings. Consistency first; migrating both to stored paths is a separate concern.
- [Large bundle lists with many events] → `listEventos` is already loaded per tenant (expected < a few hundred). The bundle selector filters client-side with search.

## Migration Plan

1. `20260929120000_eventos_fase2_entradas_cupones.sql`: column conversions with backfill, `borrador`, `formulario_id`, `metodos_pago`, the name-required and published-completeness checks, re-created SELECT policies and public index, the new tables, indexes, triggers and RLS.
2. `20260929120100_guardar_evento_completo.sql`: the RPC, `grant execute` to `authenticated`, and `revoke` from `anon` and `public`.
3. `20260929120200_eventos_banner_storage.sql`: the `event_banner_read` policy.
4. Apply locally only (`supabase migration up` / `db reset`). **Never push to remote.** Regenerate local types if the project uses generated types.

**Rollback**: a down script recreates the uuid columns (the values from snapshots whose ids still exist), drops the new tables, the RPC and the policy, and restores the phase-1 policies. Because snapshot → uuid is lossy (the trainer array → first element), rollback is best-effort. Acceptable, since the feature is unreleased.

## Open Questions

- Column names (D1): keep the US wording (current plan) or rename to `disciplina` / `escenario` / `entrenadores`? Decide in PR review. It does not block implementation.
