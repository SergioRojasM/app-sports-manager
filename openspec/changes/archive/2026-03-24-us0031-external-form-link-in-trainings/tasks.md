## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0031-external-form-link-in-trainings` from `develop`
- [x] 1.2 Confirm working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260313000100_add_formulario_externo_entrenamientos.sql`
- [x] 2.2 Add `formulario_externo VARCHAR(500) DEFAULT NULL` to `entrenamientos_grupo` using `ADD COLUMN IF NOT EXISTS`
- [x] 2.3 Add `formulario_externo VARCHAR(500) DEFAULT NULL` to `entrenamientos` using `ADD COLUMN IF NOT EXISTS`
- [x] 2.4 Replace the `sync_entrenamientos_from_grupo()` trigger function to include `formulario_externo` in its `UPDATE SET` clause (alongside `punto_encuentro`)
- [x] 2.5 Apply migration locally: `npx supabase db reset` or `npx supabase migration up`

## 3. Types

- [x] 3.1 Add `formulario_externo: string | null;` to `TrainingGroup` in `src/types/portal/entrenamientos.types.ts`
- [x] 3.2 Add `formulario_externo: string | null;` to `TrainingInstance` in the same file
- [x] 3.3 Add `formulario_externo: string;` to `TrainingWizardValues`
- [x] 3.4 Add `'formulario_externo'` to the `TrainingField` union type

## 4. Service Layer

- [x] 4.1 Add `formulario_externo?: string | null` to the `group` property of `CreateTrainingSeriesInput` in `src/services/supabase/portal/entrenamientos.service.ts`
- [x] 4.2 Add `formulario_externo?: string | null` to `UpdateTrainingSeriesInput.groupPatch`
- [x] 4.3 Include `formulario_externo` in the group `INSERT` payload inside `createTrainingSeries`
- [x] 4.4 Include `formulario_externo` in the instance `INSERT` payload inside `generateSeriesInstances` (mirrors `punto_encuentro`)
- [x] 4.5 Include `formulario_externo` in the `instancePatch` object inside `syncGroupPatchToInstances` (inside `updateTrainingSeries`)
- [x] 4.6 Include `formulario_externo` in the `groupPatch` UPDATE call inside `updateTrainingSeries`
- [x] 4.7 Add `formulario_externo` to the Supabase `.select()` string in `listTrainingGroupsByTenant`
- [x] 4.8 Add `formulario_externo` to the Supabase `.select()` string in `listTrainingInstancesByTenantAndRange`
- [x] 4.9 Add `formulario_externo` to any additional `.select()` strings used after insert/update operations that return a `TrainingGroup` or `TrainingInstance`
- [x] 4.10 Map `formulario_externo: row.formulario_externo ?? null` in any `mapRowToTrainingGroup` / `mapRowToTrainingInstance` helper functions

## 5. Hook Layer

- [x] 5.1 Add `formulario_externo: ''` to `EMPTY_FORM` in `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`
- [x] 5.2 When loading an existing training group for editing, map `formulario_externo: entity.formulario_externo ?? ''`
- [x] 5.3 When building the service input payload (create), include `formulario_externo: values.formulario_externo.trim() || null`
- [x] 5.4 When building the `groupPatch` payload (update), include `formulario_externo: values.formulario_externo.trim() || null`

## 6. Components

- [x] 6.1 In `src/components/portal/entrenamientos/EntrenamientoWizard.tsx`, add a `<div className="md:col-span-2">` block with a `type="url"` input for `formulario_externo` immediately after the `punto_encuentro` field block
- [x] 6.2 Wire the new input to `values.formulario_externo` and `onChangeField('formulario_externo', event.target.value)` with `maxLength={500}` and placeholder `https://forms.example.com/registro`
- [x] 6.3 In `src/components/portal/entrenamientos/EntrenamientosList.tsx`, after the `punto_encuentro` display block, conditionally render an `<a>` link when `item.instance.formulario_externo` is truthy, with `target="_blank"` and `rel="noopener noreferrer"`
- [x] 6.4 In `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`, inside the `<header>` section after the subtitle paragraph, conditionally render an `<a>` link for `instance.formulario_externo` with `target="_blank"` and `rel="noopener noreferrer"`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` — in the `entrenamientos/` component list, add a note that `EntrenamientoWizard` includes the `formulario_externo` URL field and that `EntrenamientosList` and `ReservasPanel` render an external form link when set

## 8. Verification

- [x] 8.1 Run `npm run build` (or `tsc --noEmit`) to confirm no TypeScript errors
- [x] 8.2 Manually test: create a training with a URL in "Formulario externo" and verify it appears in the list view
- [x] 8.3 Manually test: edit a series with scope `'series'` and confirm the URL propagates to future instances
- [x] 8.4 Manually test: open the reservas panel for a training with `formulario_externo` set and confirm the link is visible
- [x] 8.5 Manually test: save a training with an empty "Formulario externo" and confirm `NULL` is stored

## 9. Commit & Pull Request

- [x] 9.1 Stage all changes and create a commit with message: `feat(entrenamientos): add formulario_externo URL field to training groups and instances`
- [x] 9.2 Push branch and open a pull request with the following description:

  **Title:** `feat: add external form link (formulario_externo) to trainings`

  **Description:**
  Adds an optional `formulario_externo` URL field to `entrenamientos_grupo` and `entrenamientos`. Coaches and administrators can attach an external registration or data-collection form link to a training session. The field propagates from training group to individual instances via the existing series sync mechanism (same pattern as `punto_encuentro`). The URL is displayed as a safe clickable link in the training list view and in the reservas panel.

  **Changes:**
  - DB migration: `formulario_externo VARCHAR(500) DEFAULT NULL` on both tables; trigger function updated
  - Types: `TrainingGroup`, `TrainingInstance`, `TrainingWizardValues`, `TrainingField`
  - Service: `entrenamientos.service.ts` — all create/update/select/sync paths
  - Hook: `useEntrenamientoForm.ts` — init, load, build payload
  - Components: `EntrenamientoWizard` (input), `EntrenamientosList` (link), `ReservasPanel` (link)
