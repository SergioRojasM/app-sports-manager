## Why

To sell a team training to people outside the team (tickets, prices, payment methods), an administrator must retype it in the three-step event wizard. The name, description, date and time, duration, place, discipline, trainer, capacity, lead times and form all have to be entered again. A "Publicar en eventos" shortcut on a future training removes that duplicate work (US-0132). It reuses the unsaved pre-fill approach that US-0122 established for "Duplicar".

## What Changes

- New **"Publicar en eventos"** option in the training options modal (`EntrenamientoActionModal`), between "Ver reservas" and "Editar", shown only to administradores.
  - Enabled only for **future** trainings (`fecha_hora > now`), in any `estado`, one-time or part of a series.
  - Disabled with the reason `Solo los entrenamientos futuros se pueden publicar como evento.` otherwise.
- The option navigates to `/portal/orgs/{tenantId}/gestion-eventos/nuevo?desdeEntrenamiento={entrenamientoId}` (the specific occurrence). Nothing is written to the database until the admin saves.
- The create-event route accepts `desdeEntrenamiento` (UUID only; `duplicar` wins when both are present).
- The wizard loads the training, re-checks that it is future, and builds an **unsaved, dirty** draft:
  - Copied: name, description (moved to "Descripción larga" when > 300 chars), date, duration, capacity, lead times, discipline name, scenario snapshot, meeting point, trainer, internal form.
  - Left empty: tickets, payment methods and banner.
  - External form links are not copied.
- **Capacity is not shared.** The event's capacity starts with the training's value but is independent. This is stated while creating, in two places:
  - A line in the dismissible notice above the stepper.
  - A non-dismissible hint on "Cupo máximo".
- New wizard empty states: "Entrenamiento no encontrado" (missing or foreign id) and "Este entrenamiento ya pasó" (past or undated training).
- The private scenario `toSnapshot` helper is promoted to a shared `toEscenarioSnapshot` utility. This is a refactor with no behavior change.

## Non-goals

- Event → training direction (creating a training from an event).
- Publishing past trainings or trainings without a date.
- Turning a whole recurring series into several events.
- Shared capacity, or keeping the training and the event linked or in sync after creation (no FK, no "already published" badge).
- Buying event tickets with team plans.
- Any database, RLS, RPC or migration change.

## Capabilities

### New Capabilities
- `team-events-from-training`: Publishing one future team training as a new event. Covers the admin-only, future-only "Publicar en eventos" entry point, the `?desdeEntrenamiento=` create route, what the unsaved draft carries and leaves out, the explicit "capacity is not shared" messaging, and the not-found / past / error states.

### Modified Capabilities
<!-- None: the wizard's existing create, draft-save, final-save and unsaved-changes requirements apply unchanged to the pre-filled draft. -->

## Impact

**Design**: No new screens and no mockup. The UI reuses existing patterns:
- the option card styling of `EntrenamientoActionModal` (enabled and disabled states, as in "Editar");
- the US-0122 duplicate notice (`role="status"`, cyan info, close button);
- the wizard's existing empty state and field `hint`.

**Files** (page → component → hook → service → types):

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Validate `desdeEntrenamiento`; `duplicar` precedence; new `key`; pass the prop |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | `desdeEntrenamientoId` prop; training-origin notice with the capacity line; two new empty-state variants |
| Component | `src/components/portal/gestion-eventos/wizard/EventoConfiguracionStep.tsx` | Capacity hint on "Cupo máximo" while created from a training |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEscenarioSelector.tsx` | Use the shared `toEscenarioSnapshot` |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | "Publicar en eventos" card (enabled / disabled with reason) |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Admin-only wiring, future check, navigation |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | `desdeEntrenamientoId` load branch; `origenEntrenamiento`; `notFoundKind` |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | `getEntrenamientoParaEvento` (single-row read with discipline / scenario / trainer embeds) |
| Lib | `src/lib/portal/entrenamiento-evento.utils.ts` | **New**: `esEntrenamientoFuturo`, `draftFromEntrenamiento` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Export `toEscenarioSnapshot` |
| Types | `src/types/portal/eventos.types.ts` | `EventoDesdeEntrenamientoAjustes` |
| Types | `src/types/portal/entrenamientos.types.ts` | `EntrenamientoParaEvento` |
| Docs | `projectspec/03-project-structure.md` | Document the param, action, lib file, service function and helper |

**APIs / systems**: No new route handler, server action or RPC. The existing `guardar_evento_completo` creates the event. The training is read under the existing `entrenamientos` SELECT policy. No dependency changes.

## Implementation Plan

1. Types: `EventoDesdeEntrenamientoAjustes`, `EntrenamientoParaEvento`.
2. Lib: export `toEscenarioSnapshot`; create `entrenamiento-evento.utils.ts` (`esEntrenamientoFuturo`, `draftFromEntrenamiento`).
3. Service: `entrenamientosService.getEntrenamientoParaEvento`.
4. Hook: `useEventoWizard` `desdeEntrenamientoId` mode (load, future re-check, `origenEntrenamiento`, `notFoundKind`).
5. Page: `nuevo/page.tsx` reads and validates `?desdeEntrenamiento=`.
6. Components: wizard page notice and empty states; capacity hint in step 1; selector refactor; "Publicar en eventos" card and its admin-only, future-only wiring.
7. Lint, type-check, and manual tests (happy path and edge cases from US-0132).
8. Update `projectspec/03-project-structure.md`.
