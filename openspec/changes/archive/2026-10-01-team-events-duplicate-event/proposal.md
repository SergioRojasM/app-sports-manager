## Why

A new team event always starts from an empty wizard (US-0119), so an admin who runs similar or recurring events retypes the description, cronograma, trainers, tickets, coupons, form and payment methods every time. US-0122 (phase 2.1 of the events module, `projectspec/userstory/us0122-team-events-duplicate-event.md`) adds a "Duplicar" action that opens the create wizard pre-filled from an existing event.

## What Changes

- New **"Duplicar"** item in the event actions menu, in the cards, list and calendar views, for every event (published, draft, cancelled, inactive, past).
- The create route accepts `?duplicar={eventoId}`: `/portal/orgs/{tenantId}/gestion-eventos/nuevo?duplicar={eventoId}` opens the wizard with an unsaved copy of that event.
- The copy is built in the client by a pure mapper: name prefixed with "Copia de ", new ticket and coupon identities, the past event date cleared, expired ticket / coupon validity windows cleared.
- **Nothing is written until the admin saves.** The copy is created by the existing `guardar_evento_completo` RPC on "Guardar borrador" or "Publicar evento".
- On the first save the inherited banner is copied to the new event's own storage path, so later changes to the source banner do not affect the copy.
- A dismissible notice in the wizard says the event is a copy and lists what was adjusted.

## Non-goals

- Duplicating into another tenant.
- Bulk duplication or generating a recurring series.
- Copying purchases, tickets sold, attendees or coupon usage.
- Any database, RLS or RPC change.
- A "Duplicar" button inside the wizard or on the public event pages.
- New visual design: the menu item and the notice reuse the existing `EventoActionsMenu` item style and the status-banner style of `GestionEventosPage`, so no mockup is required.

## Capabilities

### New Capabilities
- `team-events-duplication`: duplicating an existing team event from the management page into the create wizard — entry point, copy rules, wizard behavior in duplicate mode, banner copy, and error states.

### Modified Capabilities
<!-- None. The existing requirements of team-events-management and team-events-wizard keep their behavior; the new behavior is additive and specified in team-events-duplication. -->

## Impact

No migration, no new dependency, no new route. Files, in page → component → hook → service → types order:

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Await `searchParams`, accept `duplicar` only as a UUID, pass `duplicarDeId` and `key` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | `duplicarDeId` prop; dismissible duplicate notice |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | `onDuplicar` handler passed to the three views |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | Optional `onDuplicar`; "Duplicar" item; `MENU_HEIGHT_ESTIMATE = 260` |
| Component | `src/components/portal/gestion-eventos/EventoCard.tsx`, `EventosGrid.tsx`, `EventosTable.tsx`, `EventosCalendar.tsx` | Forward `onDuplicar` to the menu |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | `duplicarDeId` argument; load source and build the copy; `duplicadoDe` / `duplicadoAjustes`; banner copy on the first save |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `copyEventoBanner` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Add `draftFromEventoDuplicado`, `EVENTO_DUPLICADO_PREFIJO` |
| Types | `src/types/portal/eventos.types.ts` | Add `EventoDuplicadoAjustes` |
| Docs | `projectspec/03-project-structure.md` | Document the `?duplicar=` param, the menu item, the mapper, the storage function and the hook's duplicate mode |

Reused unchanged: `eventosService.getEventoCompleto`, `eventosService.guardarEventoCompleto`, `storageService.uploadEventoBanner`, the `(administrador)` layout guard and all existing RLS / storage policies.

## Implementation Plan

1. Types: add `EventoDuplicadoAjustes`.
2. Lib: add the pure mapper `draftFromEventoDuplicado`.
3. Service: add `copyEventoBanner`.
4. Hook: extend `useEventoWizard` with duplicate mode.
5. Components: wizard notice; "Duplicar" menu item threaded through the views.
6. Page: read and validate `?duplicar=`.
7. Type-check, lint, manual verification, documentation, commit message and PR description.
