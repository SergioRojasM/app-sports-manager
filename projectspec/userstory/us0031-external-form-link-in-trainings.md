# US0031 — External Form Link in Trainings

| Field       | Value                                               |
|-------------|-----------------------------------------------------|
| **ID**      | US0031                                              |
| **Name**    | External Form Link in Trainings                     |
| **Module**  | Training Management (gestion-entrenamientos)        |
| **Priority**| Medium                                              |

---

## User Story

**As a** trainer or administrator,
**I want** to attach an optional external form URL to a training group (and its generated instances),
**So that** athletes can access an external registration or data-collection form directly from the training detail.

---

## Description

Organizations often require athletes to fill out external forms (e.g., Google Forms, Typeform, or custom registration pages) before or after attending a training session. Currently there is no way to associate such a link with a training.

This user story adds a new optional field `formulario_externo` (external form URL) to both the `entrenamientos_grupo` (training series) and `entrenamientos` (individual sessions) tables. The field will propagate from the group to generated instances following the same pattern as `punto_encuentro`.

The URL will be editable in the training wizard form and displayed as a clickable link in the training list view and the reservas (booking) panel for athletes and coaches.

---

## Acceptance Criteria

1. A new optional field **"Formulario externo"** appears in the training creation/edit wizard (Step 1 — general details), placed immediately after the "Punto de encuentro" field.
2. The field accepts a valid URL (max 500 characters) with `https://` or `http://` scheme.
3. When a training group is created, `formulario_externo` is stored on `entrenamientos_grupo` and propagated to each generated `entrenamientos` instance.
4. When editing a training series (scope: `future` or `series`), the field syncs to affected instances following the existing sync pattern.
5. When editing a single instance, the field can be overridden independently (respecting `bloquear_sync_grupo`).
6. In the training list view (`EntrenamientosList`), if `formulario_externo` is present, a clickable link/icon is shown (opens in a new tab).
7. In the `ReservasPanel`, athletes and coaches can see the external form link for the current training.
8. The field is **optional** — leaving it empty has no side effects.
9. RLS policies do not need changes (the field inherits existing row-level access).

---

## Database Changes

### Migration: `YYYYMMDD000100_add_formulario_externo_entrenamientos.sql`

```sql
-- Add formulario_externo to entrenamientos_grupo
ALTER TABLE entrenamientos_grupo
  ADD COLUMN formulario_externo VARCHAR(500) DEFAULT NULL;

-- Add formulario_externo to entrenamientos
ALTER TABLE entrenamientos
  ADD COLUMN formulario_externo VARCHAR(500) DEFAULT NULL;

-- Update sync trigger function to propagate the new field
-- (modify the existing sync_entrenamientos_from_grupo() function
--  to include formulario_externo in the UPDATE SET clause)
```

**Notes:**
- `VARCHAR(500)` to accommodate long URLs with query parameters.
- No NOT NULL constraint — it is fully optional.
- The `sync_entrenamientos_from_grupo()` trigger function must be updated to include `formulario_externo` in its column list so new/existing instances receive the value when the group is updated.

---

## Files to Modify

### 1. Database migration
| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD000100_add_formulario_externo_entrenamientos.sql` | **Create** — new migration |

### 2. Types (Domain layer — Ports)
| File | Changes |
|------|---------|
| `src/types/portal/entrenamientos.types.ts` | Add `formulario_externo: string \| null` to `TrainingGroup`, `TrainingInstance`. Add `formulario_externo: string` to `TrainingWizardValues`. Add `'formulario_externo'` to `TrainingField` union. |

### 3. Services (Infrastructure layer — Outbound adapters)
| File | Changes |
|------|---------|
| `src/services/supabase/portal/entrenamientos.service.ts` | Include `formulario_externo` in: `createTrainingSeries` (group insert + instance generation), `updateTrainingSeries` (`groupPatch`), `updateTrainingInstance`, `listTrainingInstancesByTenantAndRange` select, `listTrainingGroupsByTenant` select. Add `formulario_externo` to `CreateTrainingSeriesInput.group` and `UpdateTrainingSeriesInput.groupPatch`. |

### 4. Hooks (Application layer — Use cases)
| File | Changes |
|------|---------|
| `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Initialize `formulario_externo: ''` in default form values. Map it from the loaded entity on edit. Include it when building the service input payload. |

### 5. Components (Presentation layer — Inbound adapters)
| File | Changes |
|------|---------|
| `src/components/portal/entrenamientos/EntrenamientoWizard.tsx` | Add a new `<input type="url">` field after `punto_encuentro` with label **"Formulario externo"**, placeholder `https://...`, `maxLength={500}`. Wire `values.formulario_externo` and `onChangeField('formulario_externo', …)`. |
| `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Below the `punto_encuentro` display, conditionally render a clickable link icon/text when `formulario_externo` is set. Use `target="_blank"` and `rel="noopener noreferrer"`. |
| `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Show the external form link in the training detail section of the panel (if present). |

---

## Detailed Implementation Steps

### Step 1 — Database migration

1. Create the migration file in `supabase/migrations/`.
2. Add `formulario_externo VARCHAR(500) DEFAULT NULL` to both `entrenamientos_grupo` and `entrenamientos`.
3. Update the `sync_entrenamientos_from_grupo()` trigger function to include `formulario_externo` in its `UPDATE SET` and `INSERT ... SELECT` clauses, following the same pattern used for `punto_encuentro`.
4. Run `npx supabase db reset` or `npx supabase migration up` to apply locally.

### Step 2 — Types

1. In `entrenamientos.types.ts`:
   - Add `formulario_externo: string | null;` to `TrainingGroup`.
   - Add `formulario_externo: string | null;` to `TrainingInstance`.
   - Add `formulario_externo: string;` to `TrainingWizardValues`.
   - Add `| 'formulario_externo'` to the `TrainingField` union type.

### Step 3 — Service layer

1. In `entrenamientos.service.ts`:
   - Add `formulario_externo?: string | null` to the `group` property of `CreateTrainingSeriesInput`.
   - Add `formulario_externo: string | null` to `UpdateTrainingSeriesInput.groupPatch`.
   - Include `formulario_externo` in the Supabase `.insert()` and `.update()` calls for both `entrenamientos_grupo` and `entrenamientos`.
   - Include `formulario_externo` in the `.select()` calls for listing queries.

### Step 4 — Hook layer

1. In `useEntrenamientoForm.ts`:
   - Add `formulario_externo: ''` to the initial form values.
   - When loading an existing entity for editing, map `formulario_externo ?? ''`.
   - When building the `CreateTrainingSeriesInput` / `UpdateTrainingSeriesInput`, include `formulario_externo: values.formulario_externo.trim() || null`.

### Step 5 — Wizard form

1. In `EntrenamientoWizard.tsx`, after the `punto_encuentro` `<div>`, add:
   ```tsx
   <div className="md:col-span-2">
     <label htmlFor="formulario_externo" className="mb-1 block text-xs text-slate-300">
       Formulario externo
     </label>
     <input
       id="formulario_externo"
       type="url"
       maxLength={500}
       value={values.formulario_externo}
       onChange={(event) => onChangeField('formulario_externo', event.target.value)}
       className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
       placeholder="https://forms.example.com/registro"
     />
   </div>
   ```

### Step 6 — List view display

1. In `EntrenamientosList.tsx`, after the `punto_encuentro` section, conditionally render:
   ```tsx
   {item.instance.formulario_externo && (
     <a
       href={item.instance.formulario_externo}
       target="_blank"
       rel="noopener noreferrer"
       className="inline-flex items-center gap-1 text-xs text-turquoise hover:underline"
     >
       <ExternalLinkIcon className="h-3 w-3" />
       Formulario externo
     </a>
   )}
   ```

### Step 7 — Reservas panel

1. In `ReservasPanel.tsx`, in the training detail header/summary area, add a conditional link similar to Step 6 so athletes see the external form when opening the bookings panel.

---

## Validation Rules

| Rule | Detail |
|------|--------|
| **Format** | Must be a valid URL starting with `http://` or `https://`. Use `type="url"` for native browser validation. |
| **Max length** | 500 characters (enforced at DB level with `VARCHAR(500)` and at UI with `maxLength`). |
| **Required** | No — field is fully optional. |
| **Sanitization** | Trim whitespace before saving. Store `null` when empty. |

---

## Non-Functional Requirements

### Security
- The URL is rendered with `rel="noopener noreferrer"` and `target="_blank"` to prevent tabnapping.
- No server-side fetching or proxying of the external URL is performed — it is a plain client-side link.
- Input is stored as plain text; no HTML rendering. XSS risk is mitigated by React's default escaping.

### Performance
- No additional queries — the field is read alongside existing columns in the same select calls.
- No indexes needed on `formulario_externo` (not used for filtering or sorting).

### Accessibility
- The input uses `type="url"` for semantic correctness.
- The link includes descriptive text ("Formulario externo") — not just an icon.

---

## Out of Scope

- Embedding or previewing the external form within the app.
- Validating that the URL is reachable or returns a 200 status.
- Analytics or tracking of link clicks.
- Per-category or per-level external form differentiation (one URL per training is sufficient for now).
