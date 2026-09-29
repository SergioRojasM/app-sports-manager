## Why

Phase 1 (US-0118) shipped the `eventos` table and a read-only management page, where "Nuevo evento" and "Editar" only open a "próximamente" modal. Admins still cannot create or edit an event. They also cannot sell it: there are no ticket types, discount coupons, access form, or accepted payment methods. US-0119 adds a full-page, three-step wizard to create and edit events. Drafts can be saved at any time with only a name, so the work is never lost.

## What Changes

- **New pages**: `/gestion-eventos/nuevo` (fills the untracked empty placeholder) and `/gestion-eventos/[evento_id]/editar`, both under `(administrador)`. Each renders `EventoWizardPage`, which has a three-step stepper:
  1. **"Configura tu evento"**: full-page editor with a live preview (event page and card) of every `eventos` field, a banner upload, a discipline selector, a venue selector with inline "Crear nuevo escenario", and a trainer multi-select with an `experiencia` field per trainer.
  2. **"Configura tus entradas"**: ticket types (*Sencilla* / *Múltiple* with an event bundle), discount coupons per ticket, and the access form (a form template).
  3. **"Configura tus métodos de pago"**: selection from the tenant's active payment methods, plus a summary.
- **Drafts**: a "Guardar borrador" button on every step. It needs only `nombre`, keeps incomplete data, and moves a new event to its edit URL after the first save. "Publicar evento" validates everything. Drafts are visible only to the tenant's admins and trainers. A published event cannot go back to draft.
- **BREAKING (schema)**: on `eventos`:
  - `disciplina_id` changes from a uuid FK to `text` (the discipline name, nullable while the event is a draft).
  - `escenario_id` changes from a uuid FK to a `jsonb` venue snapshot.
  - `entrenador_id` changes from a uuid FK to a `jsonb` array of `{id, nombre, experiencia}`.
  - Existing rows are migrated.
- New `eventos` columns: `borrador`, `formulario_id` (FK to `formularios_plantillas`), and `metodos_pago` (jsonb snapshots). `precio` becomes derived from the tickets.
- New tables `evento_entradas` and `evento_entrada_cupones`, with RLS. Coupon codes are readable only by admins and trainers.
- New invoker RPC `guardar_evento_completo`. It saves the event, tickets and coupons atomically, with draft or final validation, and returns the persisted ids.
- A new storage read policy for `orgs/{tenantId}/eventos/` banners (admin writes are already covered).
- **BREAKING (service)**:
  - `eventosService.createEvento` and `updateEvento` are removed and replaced by `guardarEventoCompleto` and `getEventoCompleto`.
  - `listEventos` no longer embeds joins.
  - `EventoListItem.disciplinaId` is removed; the discipline filter matches by name.
- Management page: "Nuevo evento" and "Editar" navigate to the wizard, and `EventoProximamenteModal` is deleted. Drafts show a "Borrador" tag, have their own estado filter option and stats card, and use restricted actions. A success banner is shown after a publish.
- `useScenarios` gains an optional `onCreated` callback. The breadcrumb gains labels for `nuevo`, `editar` and the event id segment.

## Capabilities

### New Capabilities
- `team-events-wizard`: the create/edit wizard pages. Covers routing, the stepper and its navigation and validation rules, the three steps' UI and field rules, the live preview, the inline venue creation, draft vs. final save UX, the unsaved-changes guard, and the load, not-found and error states.
- `team-events-tickets-data`: the `evento_entradas` and `evento_entrada_cupones` tables (columns, format constraints, draft-nullable fields, uniqueness, cascades), their RLS matrix, and the `guardar_evento_completo` RPC contract: validation by mode, sync semantics, derived `precio`, and returned id map.

### Modified Capabilities
- `team-events-data`: the column type changes to snapshots for disciplina, escenario and entrenadores, the new `borrador`, `formulario_id` and `metodos_pago` columns, the name-required and published-completeness checks, read policies that hide drafts from non-staff, and a service contract that replaces create/update with `getEventoCompleto` / `guardarEventoCompleto` and adds error codes.
- `team-events-management`: "Nuevo evento" and "Editar" navigate to the wizard instead of opening the placeholder. Drafts appear with a tag, their own filter option and stats card, and restricted actions. A success banner is shown after a publish. The disciplina filter matches by name.
- `object-storage`: a new event banner path `orgs/{tenantId}/eventos/{eventoId}.{ext}`. Writes are covered by the existing `org_admin_*` policies; a new read policy lets any authenticated user read it, and the storage service gets an upload function for it.

## Non-goals

- Ticket purchase, attendees, payments, and coupon redemption (including the SECURITY DEFINER coupon-validation RPC).
- A public or member-facing event detail route and an event marketplace.
- Capacity per ticket type. Blocking edits or deletes once tickets are sold.
- Autosave. Turning a published event back into a draft.
- A trainer UI entry point: the route stays under `(administrador)`.
- Changing `estado` from the wizard: it stays a list action.
- Deleting orphaned banner files from storage.
- A fixed-amount coupon type: coupons are percentage only.
- Any change to trainings, public trainings, `PublicarEntrenamientoModal`, or `ScenariosPage` behavior.

## Files to Create or Modify

Order follows page → component → hook → service → types, then database and docs.

| Layer | File | Change |
|-------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Fill the empty placeholder: a server page rendering `<EventoWizardPage tenantId />` inside Suspense |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/editar/page.tsx` | New: `<EventoWizardPage tenantId eventoId />` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | New: wizard root |
| Component | `.../wizard/EventoWizardStepper.tsx`, `EventoWizardFooter.tsx`, `SalirSinGuardarModal.tsx` | New: stepper, sticky footer (draft/final save), leave guard |
| Component | `.../wizard/EventoConfiguracionStep.tsx`, `EventoPreview.tsx`, `EventoEscenarioSelector.tsx`, `EventoEntrenadoresSelector.tsx` | New: step 1 |
| Component | `.../wizard/EventoEntradasStep.tsx`, `EventoEntradasEditor.tsx`, `EventoBundleSelector.tsx`, `EventoCuponesEditor.tsx`, `EventoFormularioSelector.tsx` | New: step 2 |
| Component | `.../wizard/EventoMetodosPagoStep.tsx` | New: step 3 + summary |
| Component | `.../wizard/index.ts` | New barrel |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | Navigate to the wizard; success banner; remove the placeholder modal |
| Component | `.../gestion-eventos/EventoCard.tsx`, `EventosTable.tsx`, `EventosCalendar.tsx`, `EventosToolbar.tsx`, `EventosStatsCards.tsx`, `EventoActionsMenu.tsx`, `EventoEstadoBadge.tsx` | Draft tag and fallbacks, snapshot fields, "Borrador" filter and stat, draft actions, `hideActions` |
| Component | `.../gestion-eventos/EventoProximamenteModal.tsx` | **Delete** |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Labels for `nuevo` and `editar`, and for the uuid segment |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | New: draft state, steps, validation, save |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizardOptions.ts` | New: option lists |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | Draft filter and stat; disciplina filter by name |
| Hook | `src/hooks/portal/scenarios/useScenarios.ts` | Optional `onCreated` |
| Service | `src/services/supabase/portal/eventos.service.ts` | `getEventoCompleto`, `guardarEventoCompleto`, snapshot mapping, error codes; remove create/update |
| Service | `src/services/supabase/portal/storage.service.ts` | `uploadEventoBanner` |
| Types | `src/types/portal/eventos.types.ts` | Snapshots, tickets and coupons, drafts, payload and result, new error codes, `borrador` |
| Lib | `src/lib/portal/eventos.utils.ts` | Draft ⇄ payload and preview adapters, Bogotá datetime-local helpers, discount helpers |
| Migration | `supabase/migrations/20260929120000_eventos_fase2_entradas_cupones.sql` | Schema, data migration, tables, RLS |
| Migration | `supabase/migrations/20260929120100_guardar_evento_completo.sql` | RPC |
| Migration | `supabase/migrations/20260929120200_eventos_banner_storage.sql` | Storage read policy `event_banner_read` |
| Types | `src/types/portal/storage.types.ts` | `buildEventoBannerPath` |
| Docs | `projectspec/03-project-structure.md` | Routes, wizard sub-slice, tables, RPC, column semantics |

## Step-by-step Implementation Plan

1. Create a branch `feat/team-events-management-phase-two` from `develop`.
2. Write the three migrations and apply them locally only. Verify the data migration, RLS per actor, and the RPC in both modes, in SQL.
3. Update the types, then fix the compile errors in the phase-1 slice.
4. Update `eventosService` and `storage.service`, and add the adapters in `eventos.utils.ts`.
5. Add `onCreated` to `useScenarios`. Build `useEventoWizardOptions` and `useEventoWizard`.
6. Build the wizard components (stepper, footer, steps 1–3, preview, selectors, leave guard).
7. Build the two pages. Rewire `GestionEventosPage`, delete the placeholder modal, add the draft UI to the list views, and update the breadcrumb labels.
8. Test manually: publish flow, draft flow, edit round-trip, stale snapshots, error paths, and access as trainer and athlete.
9. Run type, lint and test checks (no build). Update `03-project-structure.md`. Write the commit message and PR description.

## Impact

- **Database**: breaking column changes on `eventos`, with an in-place data migration of phase-1 rows. Two new tables, one new invoker RPC, re-created `eventos` SELECT policies, and new storage policies. Migrations are applied **locally only**.
- **Frontend**: a new `wizard/` sub-slice and two routes. The phase-1 components adapt to the snapshot fields and drafts.
- **Security**: RLS remains the only data guard; the RPC is `security invoker`. Coupon codes are hidden from members and anon. Drafts are hidden from non-staff.
- **Dependencies**: none added. Errors are shown inline (no toast library).
- **Design reference**: no new mockup (confirmed). Visuals follow the `grit-arena-v2.pen` tokens and the `@/components/ui` grit kit. The preview reuses `PublicTrainingDetalleBody` and `EventoCard`.
