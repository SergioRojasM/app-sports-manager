## Why

Organizations frequently require athletes to fill out external forms (Google Forms, Typeform, custom registration pages) before or after attending a training session — for waivers, health declarations, pre-session surveys, or event-specific sign-ups. Currently there is no way to associate such a link with a training, forcing coaches to share URLs through side channels (WhatsApp, email) which is error-prone and disconnected from the training workflow.

## What Changes

- Add a new optional `formulario_externo` column (`VARCHAR(500)`) to both `entrenamientos_grupo` and `entrenamientos` tables.
- Update the `sync_entrenamientos_from_grupo()` trigger to propagate the field from group to instances, following the same pattern as `punto_encuentro`.
- Extend the training wizard form with a URL input field ("Formulario externo") placed after "Punto de encuentro".
- Display the external form link as a clickable element in the training list view and the reservas (booking) panel.
- Propagate the field through create, edit (single/future/series scopes), and sync flows.

## Capabilities

### New Capabilities

_(none — this feature extends an existing capability)_

### Modified Capabilities

- `training-management`: Adding a new optional `formulario_externo` field to the training data model, form, list view, and booking panel. This extends the training entity schema and its CRUD lifecycle with a new URL field that propagates through series sync.

## Non-goals

- Embedding or previewing the external form within the app (iframe/modal).
- Validating that the external URL is reachable or returns a valid response.
- Analytics or tracking of form link clicks.
- Per-category or per-discipline-level differentiated form links (one URL per training is sufficient).
- Changes to RLS policies (the new column inherits existing row-level access).

## Impact

- **Database**: New migration adding one column to two tables; update to the existing sync trigger function.
- **Types**: `TrainingGroup`, `TrainingInstance`, `TrainingWizardValues`, and `TrainingField` gain the new field.
- **Service**: `entrenamientos.service.ts` — create, update, list operations include the new column.
- **Hook**: `useEntrenamientoForm.ts` — form initialization, mapping, and payload building.
- **Components**: `EntrenamientoWizard.tsx` (form input), `EntrenamientosList.tsx` (link display), `ReservasPanel.tsx` (link display for athletes/coaches).
- **No breaking changes** — the field is nullable with `DEFAULT NULL`; all existing data remains valid.
