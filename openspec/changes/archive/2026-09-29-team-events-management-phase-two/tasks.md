## 1. Branch setup

- [x] 1.1 Create a new branch `feat/team-events-management-phase-two` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Pages

- [x] 2.1 Fill the empty `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx`: an async server page that awaits `params` and renders `<Suspense><EventoWizardPage tenantId={tenantId} /></Suspense>`. Suspense is required because the wizard reads `?paso`.
- [x] 2.2 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/editar/page.tsx`: same shape, rendering `<EventoWizardPage tenantId={tenantId} eventoId={eventoId} />`
- [x] 2.3 `src/components/portal/PortalBreadcrumb.tsx`: add `SLUG_LABELS` entries `nuevo` → "Nuevo evento" and `editar` → "Editar evento". Render the uuid segment after `gestion-eventos` as "Evento", never the raw id.

## 3. Wizard components (`src/components/portal/gestion-eventos/wizard/`)

- [x] 3.1 `EventoWizardStepper.tsx`:
  - `<ol aria-label="Pasos del evento">` with the 3 steps (icons `edit_calendar`, `confirmation_number`, `payments`)
  - `aria-current="step"`; completed steps show a check; error steps show the text "Revisar"
  - clicking a step calls `onGoTo(step)`
  - below `sm`, the compact "Paso N de 3 · {label}"
- [x] 3.2 `EventoWizardFooter.tsx`: sticky bar with:
  - "Atrás" and "Siguiente"
  - "Guardar borrador" (secondary, icon `save`): shown when the event is new or a draft; disabled with the hint when the name is empty; labelled "Borrador guardado" when there are no unsaved changes; plus the 4 s `role="status"` confirmation
  - the primary button: "Publicar evento" (step 3, new or draft) or "Guardar cambios" (every step, published)
  - "Guardando…" state
  - the `role="alert"` save-error block
- [x] 3.3 `SalirSinGuardarModal.tsx`: "Tienes cambios sin guardar. ¿Salir sin guardar?" dialog built on `EventoModalShell`
- [x] 3.4 `EventoPreview.tsx`:
  - *Página* / *Tarjeta* radiogroup
  - *Página* renders `PublicTrainingDetalleBody` with `toDetallePreviewItem(draft)`, `onReservar={() => {}}` and `reservarDisabled`
  - *Tarjeta* renders `EventoCard` with `toCardPreviewItem(draft)` and `hideActions`
  - memoized adapters
- [x] 3.5 `EventoEscenarioSelector.tsx`:
  - select with the active scenarios, "Sin escenario", and "+ Crear nuevo escenario"
  - the create option opens `ScenarioFormModal` driven by `useScenarios({ tenantId, onCreated })` and auto-selects the created scenario; cancelling restores the previous value
  - a stale snapshot is shown as "{nombre} (guardado en el evento)"
- [x] 3.6 `EventoEntrenadoresSelector.tsx`: searchable checkbox list of the tenant's trainers; for each selected trainer, a row with an `experiencia` textarea (max 500) and remove; no duplicates; selection order is preserved
- [x] 3.7 `EventoConfiguracionStep.tsx`: the step 1 layout, `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` with a sticky preview (collapsible "Ver vista previa" below `lg`). `GritCard` sections:
  - Información básica
  - Imagen (file input, preview, "Quitar imagen", inline errors)
  - Disciplina (with the stale "(ya no existe)" option)
  - Fecha y lugar
  - Entrenadores
  - Cupo y reservas
  - Contenido de la página (cronograma and incluye row editors, copied from or shared with `PublicarEntrenamientoModal` with zero behavior change)
  - Visibilidad (`publico`, and `activo` shown as "Oculto")
- [x] 3.8 `EventoBundleSelector.tsx`: searchable multi-select of the tenant's other non-cancelled events ("nombre · fecha"), excluding the current event; shows the dropped-ids warning
- [x] 3.9 `EventoCuponesEditor.tsx`: coupon rows with:
  - `nombre`
  - `cupon`, uppercased on input
  - `descuento` in %, with the "$X → $Y" preview
  - the validity window
  - delete
  - "Añadir cupón" disabled on free tickets, with the hint
  - indexed `aria-label`s
- [x] 3.10 `EventoEntradasEditor.tsx`: ticket cards with:
  - `nombre`
  - Sencilla / Múltiple radios; Múltiple shows the bundle selector, and switching back to Sencilla clears it
  - `valor` as a raw string
  - `valida_desde` / `valida_hasta`
  - move up / down
  - delete, with confirmation when the ticket has coupons
  - the collapsible `EventoCuponesEditor`
  - "Añadir entrada"
- [x] 3.11 `EventoFormularioSelector.tsx`: "Sin formulario" plus the active templates sorted by name; "Vista previa" through `useFormularioPreview` + `FormularioPreviewModal`; empty state linking to `gestion-formularios`
- [x] 3.12 `EventoEntradasStep.tsx`: the step 2 layout (tickets editor and form selector) and the "Agrega al menos una entrada" error
- [x] 3.13 `EventoMetodosPagoStep.tsx`:
  - active methods as checkbox cards (name, tipo badge, valor / url / comentarios)
  - "Seleccionar todos" / "Quitar todos"
  - stale snapshots checked with "(inactivo o eliminado)", and not re-checkable once removed
  - required-method error; free-only note; empty state linking to `gestion-organizacion`
  - summary panel
- [x] 3.14 `EventoWizardPage.tsx` (`'use client'`):
  - `GritPageHeader` ("Nuevo evento" / "Editar evento", the "Borrador" tag, "Último guardado") and "Volver a eventos"
  - stepper, active step, footer
  - focus management: the step `h2` gets focus on step change, the first invalid field on a failed validation
  - `beforeunload` while dirty
  - loading skeleton; not-found state ("Evento no encontrado" + back link); error state with "Reintentar"
- [x] 3.15 `index.ts` barrel exporting `EventoWizardPage`

## 4. Management page components (`src/components/portal/gestion-eventos/`)

- [x] 4.1 `GestionEventosPage.tsx`:
  - `onNuevo` → `router.push('/portal/orgs/{tenantId}/gestion-eventos/nuevo')`
  - `onEditar(evento)` → `router.push('/portal/orgs/{tenantId}/gestion-eventos/{id}/editar')`
  - remove the `'proximamente'` modal kind
  - read `?guardado=creado|editado`, show a dismissible success banner, then `router.replace` without `guardado` (keeping `vista`)
- [x] 4.2 Delete `EventoProximamenteModal.tsx` and its imports and exports
- [x] 4.3 `EventoCard.tsx`:
  - optional `hideActions` prop
  - "Borrador" tag (icon `edit_note`) instead of the estado badge for drafts
  - fallbacks: "Sin disciplina", and "Precio por definir" for drafts with an empty `precio`
  - comma-joined trainer names
- [x] 4.4 `EventosTable.tsx` and `EventosCalendar.tsx`: "Borrador" in the Estado cell or chip, a dashed outline plus draft text for calendar chips, fallbacks, and trainer names
- [x] 4.5 `EventoActionsMenu.tsx`: for drafts, show only "Continuar editando" and "Eliminar"; otherwise "Editar", Cancelar / Confirmar and Eliminar
- [x] 4.6 `EventosToolbar.tsx`: add the "Borrador" option to the Estado select. The Disciplina options are discipline names.
- [x] 4.7 `EventosStatsCards.tsx`: add a fourth card, "Borradores"

## 5. Hooks

- [x] 5.1 `src/hooks/portal/scenarios/useScenarios.ts`: optional `onCreated?: (scenario: Scenario) => void`, called after a successful create (before the reload). Existing callers are unchanged.
- [x] 5.2 `src/hooks/portal/gestion-eventos/useEventoWizardOptions.ts`: loads, in parallel:
  - `listDisciplineOptions`
  - `listTrainerOptions`
  - `listEventos` (for the bundle)
  - `getPlantillasByTenant` (filtered to active and sorted)
  - `getMetodosPago(tenantId, true)`

  Scenarios come from `useScenarios`. Exposes `loading`, `error` and `reload`.
- [x] 5.3 `src/hooks/portal/gestion-eventos/useEventoWizard.ts`:
  - mode `esNuevo` / `esBorrador`, with the client-generated `eventoId` in create mode
  - load through `getEventoCompleto` → `draftFromEventoCompleto`, with `notFound` / `error` states
  - `draft`, plus an `isDirty` computed against a baseline snapshot
  - step state synced to `?paso`; `goTo(step)` validates forward moves
  - mutators: fields, trainers, cronograma, incluye, tickets (add / remove / move / update / tipo switch clears the bundle), coupons (the code is uppercased)
  - banner file validation (JPEG/PNG/WebP, 5 MB), preview URL, remove
  - `validateStep(n)`, `validateAll()` and `validateDraft()`, applying the same rules as the RPC, with a per-step error map and a first-invalid-field ref
- [x] 5.4 `useEventoWizard` save:
  - `guardarBorrador()` and `publicar()` / `guardarCambios()`: upload the banner if a new file was chosen, call `guardarEventoCompleto`, then write the ids back by `clientKey`
  - reset the baseline and set `ultimoGuardado`
  - `savingKind`
  - first draft save: `router.replace('/…/{id}/editar?paso=N', { scroll: false })`, handing the draft over through a module-level `Map` handoff so the edit-mode mount hydrates without refetching
  - final save: `router.push('/…/gestion-eventos?guardado=creado|editado')`
  - `console.error` on unexpected errors
- [x] 5.5 `src/hooks/portal/gestion-eventos/useGestionEventos.ts`:
  - estado filter: `'borrador'` shows only drafts, and Confirmado / Cancelado exclude drafts
  - disciplina filter compares `disciplinaNombre`
  - stats: add `borradores`; Próximos confirmados excludes drafts

## 6. Services

- [x] 6.1 `src/services/supabase/portal/eventos.service.ts`:
  - `LIST_SELECT = '*'`; `toListItem` maps the snapshots (discipline name, venue name, comma-joined trainer names) and `borrador`
  - add `getEventoCompleto` (embedding `evento_entradas` and `evento_entrada_cupones`, sorted client-side)
  - add `guardarEventoCompleto` (the RPC, mapping the result to camelCase)
  - remove `createEvento`, `updateEvento` and `toPayload`
- [x] 6.2 Extend `mapServiceError`: `not_found`, `duplicate_entrada` and `duplicate_cupon` (from the `23505` constraint name); the `invalid_reference` codes (`FORMULARIO_INVALIDO`, `BUNDLE_INVALIDO`); a specific `invalid_data` message for each completeness code and for `NO_REVERTIR_A_BORRADOR`
- [x] 6.3 `src/services/supabase/portal/storage.service.ts`: add `uploadEventoBanner(supabase, tenantId, eventoId, file)`, mirroring `uploadEntrenamientoPublicoBanner` (upsert, returns `{ signedUrl, path }`)

## 7. Types and lib

- [x] 7.1 `src/types/portal/eventos.types.ts`:
  - update `Evento`: `disciplina_id: string | null`, `escenario_id: EventoEscenarioSnapshot | null`, `entrenador_id: EventoEntrenadorSnapshot[]`, `borrador`, `formulario_id`, `metodos_pago`
  - add the snapshot types, `EventoEntradaTipo` + labels, `EventoEntrada`, `EventoEntradaCupon`, `EventoCompleto`, `GuardarEventoPayload`, `GuardarEventoResult`, `EventoWizardStep`, the draft types with `clientKey` and raw-string amounts and dates, and `EventoWizardErrors`
  - `EventoListItem`: add `borrador`, remove `disciplinaId`
  - `EventosClientFilters.estado` accepts `'borrador'`; `EventosStats.borradores`
  - new error codes; remove `EventoInput`
- [x] 7.2 `src/types/portal/storage.types.ts`: add `buildEventoBannerPath(tenantId, eventoId, ext)` → `orgs/{tenantId}/eventos/{eventoId}.{ext}`
- [x] 7.3 `src/lib/portal/eventos.utils.ts`:
  - `emptyEventoDraft()`, `draftFromEventoCompleto()`, `draftToPayload()`
  - `toDetallePreviewItem()`, `toCardPreviewItem()`
  - Bogotá `datetime-local` ⇄ ISO helpers (`-05:00`)
  - `aplicarDescuento(valor, pct)`, `formatDescuento()`
- [x] 7.4 Fix every compile error in the phase-1 slice caused by 7.1: `npx tsc --noEmit`

## 8. Database (apply locally only — never push to remote)

- [x] 8.1 `supabase/migrations/20260929120000_eventos_fase2_entradas_cupones.sql`:
  - convert `disciplina_id` / `escenario_id` / `entrenador_id` to snapshots, with backfill (temp column + `UPDATE … FROM` + drop + rename)
  - make `disciplina_id` nullable; backfill blank names
  - add `borrador`, `formulario_id` (FK, `on delete set null`) and `metodos_pago`
  - add the checks: name required, published requires discipline, JSON shapes
  - drop and re-create the `eventos` SELECT policies and the public partial index with `borrador = false`
  - create `evento_entradas` and `evento_entrada_cupones`: draft-nullable fields, format checks, partial unique indexes, the GIN bundle index, triggers, grants and RLS
- [x] 8.2 `supabase/migrations/20260929120100_guardar_evento_completo.sql`:
  - the `security invoker` RPC, with `search_path = public`, in draft or final mode
  - validation codes, `NO_REVERTIR_A_BORRADOR`, child sync, derived `precio`, and the returned `client_key` map
  - `grant execute` to `authenticated`; `revoke` from `anon` and `public`
- [x] 8.3 `supabase/migrations/20260929120200_eventos_banner_storage.sql`: the `event_banner_read` SELECT policy for `authenticated` on `orgs/*/eventos/*`, mirroring `public_training_banner_read`
- [x] 8.4 Seed phase-1 events locally, apply the migrations with `supabase migration up` (local), and verify the data migration (discipline name, venue snapshot, one-element trainer array)
- [x] 8.5 Verify RLS in SQL as anon, non-member, `usuario`, pending member, trainer and admin: draft visibility, ticket read inheritance, coupon privacy, and the cross-tenant ticket insert
- [x] 8.6 Verify the RPC in SQL:
  - name-only draft
  - incomplete draft data
  - draft format errors
  - final-save atomic rejection
  - publishing a draft
  - `NO_REVERTIR_A_BORRADOR`
  - sync (update / insert / delete)
  - repeated saves with no duplicates
  - derived `precio`
  - immutable columns

## 9. Manual verification

- [x] 9.1 Create flow: publish a paid event with a new banner, a new inline scenario, 2 trainers with experience, 2 tickets (one Múltiple with a bundle), coupons, a form and 2 payment methods. Check the success banner and its appearance in cards, list and calendar.
- [x] 9.2 Draft flow:
  - name-only draft on step 1, and the URL switches to the edit URL without a reload
  - an incomplete ticket and coupon on step 2, then another draft save with no duplicates
  - close the tab, reopen via "Continuar editando" on the saved step
  - publish
  - the draft stays invisible to a member and to anon until it is published
- [x] 9.3 Edit round trip: every field restored; remove a ticket and a coupon and save; stale discipline, scenario and payment-method markers; a dropped bundle warning
- [x] 9.4 Validation: forward blocked; hidden-step error jump; empty value not coerced; duplicate coupon code; a free ticket has no coupons; a paid event needs a method; invalid URL; oversize banner; past date on create
- [x] 9.5 Error paths: RPC failure keeps the draft (simulate offline — NOT exercised in the browser; RPC rejections verified in SQL); not-found edit URL; load error with "Reintentar"; the unsaved-changes guard, including no prompt after a draft save
- [x] 9.6 Management page: "Nuevo evento" and "Editar" navigate to the wizard; the draft tag, filter, stat and restricted actions; the disciplina filter by name; the status change and delete still work
- [x] 9.7 Access: trainer and athlete are redirected from both wizard URLs — validated manually by the user
- [x] 9.8 Keyboard and screen reader — partially: aria wiring and focus moves verified via Playwright (focused field ids, aria-invalid); no manual keyboard-only or screen-reader pass: the stepper, radio groups, focus moves, dialog `Escape`
- [x] 9.9 Confirm that `ScenariosPage`, `PublicarEntrenamientoModal` and the trainings / public trainings behave as before (`git diff --stat` review)

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`:
  - the `nuevo` and `[evento_id]/editar` routes
  - the `gestion-eventos/wizard/` components
  - the new hooks, the `eventos.service` / `storage.service` changes and the `eventos.utils` helpers
  - the `eventos` column semantics (snapshots, `borrador`, `formulario_id`, `metodos_pago`, derived `precio`)
  - the `evento_entradas` / `evento_entrada_cupones` tables, the RLS matrix, and the `guardar_evento_completo` RPC in the functions table

## 11. Quality gates and delivery

- [x] 11.1 Run `npx tsc --noEmit` and `npx eslint` on the changed files, plus tests if any apply. Do not run a build.
- [x] 11.2 Write the commit message (`feat(team-events-management-phase-two): ...`) and the pull request description in `openspec/changes/team-events-management-phase-two/delivery.md`. The PR description covers:
  - why
  - the breaking schema and service changes
  - the ticket and coupon model with its RLS matrix
  - the draft vs. final save
  - the wizard steps
  - a note that the migrations are local only
