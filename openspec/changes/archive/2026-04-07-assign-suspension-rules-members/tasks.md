## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/assign-suspension-rules-members` from the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260407000200_miembros_tenant_regla_suspension.sql` with: `ALTER TABLE miembros_tenant ADD COLUMN tenant_regla_suspension_id uuid NULL`, FK constraint referencing `tenant_reglas_suspension(id) ON DELETE SET NULL`, and partial index `idx_miembros_tenant_regla_suspension`
- [x] 2.2 In the same migration, `DROP VIEW IF EXISTS v_miembros_equipo` and recreate it including the new `tenant_regla_suspension_id` column and a `LEFT JOIN tenant_reglas_suspension` for `regla_suspension_nombre`
- [x] 2.3 Apply the migration locally with `npx supabase db push --local` and verify the column, FK, index, and view exist

## 3. Types

- [x] 3.1 In `src/types/portal/equipo.types.ts`, add `tenant_regla_suspension_id: string | null` and `regla_suspension_nombre: string | null` to the `MiembroRow` type
- [x] 3.2 In `src/types/portal/equipo.types.ts`, add `AsignarReglaSuspensionInput` type: `{ tenantId: string; reglaId: string | null; miembroIds: string[] }`

## 4. Service

- [x] 4.1 In `src/services/supabase/portal/equipo.service.ts`, add `tenant_regla_suspension_id` and `regla_suspension_nombre` to the `RawMiembroRow` type
- [x] 4.2 In `mapRawRow`, map `tenant_regla_suspension_id` and `regla_suspension_nombre` from the raw row to `MiembroRow`
- [x] 4.3 Add `asignarReglaSuspension` method to `equipoService` that accepts `AsignarReglaSuspensionInput` and executes the bulk UPDATE on `miembros_tenant`

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/gestion-equipo/useConfigurarSuspension.ts` with step state (1 | 2), rule selection (`selectedReglaId`, `hasSelection`), member multi-select (`selectedMiembroIds`), search filter (`filterTerm`, `filteredMembers`), `isSubmitting`, navigation functions (`goToStep2`, `goBackToStep1`), `toggleMiembro`, `selectAll`, `deselectAll`, `submit`, and `reset`

## 6. Component

- [x] 6.1 Create `src/components/portal/gestion-equipo/ConfigurarSuspensionModal.tsx` with a centered dialog. Step 1: radio-group of active suspension rules (with summary line) plus "Quitar regla" option, "Siguiente →" button disabled until selection. Step 2: search input, scrollable member list with avatar/name/current-rule-badge/checkbox, "Seleccionar todos"/"Deseleccionar todos" toggle, footer with "← Atrás" and "Aplicar (N seleccionados)" buttons
- [x] 6.2 Wire toast notifications: success toast "Regla aplicada a N miembro(s)" or "Regla removida de N miembro(s)", error toast on failure

## 7. Page Integration

- [x] 7.1 In `src/components/portal/gestion-equipo/EquipoPage.tsx`, import and instantiate `useReglasSuspension` to get the active rules list
- [x] 7.2 Add a "Configurar Suspensión" button in the header area, visible only when `activeTab === 'equipo'` and the user role is `administrador`
- [x] 7.3 Disable the button with tooltip "No hay reglas de suspensión configuradas" when the tenant has zero active suspension rules
- [x] 7.4 Add state for modal open/close, render `ConfigurarSuspensionModal` and wire it to `useConfigurarSuspension` hook, passing `members` from `useEquipo` and `refresh` as `onSuccess`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` to document the new `ConfigurarSuspensionModal.tsx` component and `useConfigurarSuspension.ts` hook in their respective directory sections

## 9. Commit & PR

- [x] 9.1 Create a commit with message: `feat: assign suspension rules to team members (US-0055)` — include migration, types, service, hook, component, and page changes
- [x] 9.2 Write pull request description summarizing: data model change (FK + view), new bulk-assignment modal, files created/modified, and acceptance criteria covered
