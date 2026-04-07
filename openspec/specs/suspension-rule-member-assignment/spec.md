## ADDED Requirements

### Requirement: miembros_tenant has nullable FK to tenant_reglas_suspension
The `miembros_tenant` table SHALL have a column `tenant_regla_suspension_id uuid NULL` with a foreign key constraint referencing `tenant_reglas_suspension(id)` with `ON DELETE SET NULL`. A partial index `idx_miembros_tenant_regla_suspension` SHALL exist on this column filtering `WHERE tenant_regla_suspension_id IS NOT NULL`.

#### Scenario: Column exists after migration
- **WHEN** migration `20260407000200_miembros_tenant_regla_suspension.sql` is applied
- **THEN** `miembros_tenant` SHALL have a `tenant_regla_suspension_id` column of type `uuid`, nullable, with the FK constraint and partial index

#### Scenario: NULL means no rule assigned
- **WHEN** a member row has `tenant_regla_suspension_id = NULL`
- **THEN** the member is not assigned any suspension rule

#### Scenario: Valid rule ID is accepted
- **WHEN** `tenant_regla_suspension_id` is set to the `id` of an existing `tenant_reglas_suspension` row
- **THEN** the update SHALL succeed

#### Scenario: ON DELETE SET NULL cascades on rule deletion
- **WHEN** a `tenant_reglas_suspension` row is deleted
- **THEN** all `miembros_tenant` rows referencing that rule SHALL have `tenant_regla_suspension_id` set to `NULL`

---

### Requirement: v_miembros_equipo exposes suspension rule columns
The `v_miembros_equipo` view SHALL include `tenant_regla_suspension_id` and `regla_suspension_nombre` (left-joined from `tenant_reglas_suspension.nombre`). When no rule is assigned, `regla_suspension_nombre` SHALL be `NULL`.

#### Scenario: View includes rule columns for assigned member
- **WHEN** a member has `tenant_regla_suspension_id` pointing to a rule named "Regla A"
- **THEN** the view row SHALL include `tenant_regla_suspension_id = '<rule-id>'` and `regla_suspension_nombre = 'Regla A'`

#### Scenario: View returns NULL for unassigned member
- **WHEN** a member has `tenant_regla_suspension_id = NULL`
- **THEN** the view row SHALL include `tenant_regla_suspension_id = NULL` and `regla_suspension_nombre = NULL`

---

### Requirement: Service provides bulk suspension rule assignment
`src/services/supabase/portal/equipo.service.ts` SHALL export an `asignarReglaSuspension` function on the `equipoService` object. It SHALL accept `{ tenantId: string; reglaId: string | null; miembroIds: string[] }` and execute `UPDATE miembros_tenant SET tenant_regla_suspension_id = $reglaId WHERE id = ANY($miembroIds) AND tenant_id = $tenantId`. When `reglaId` is `null`, it SHALL set `tenant_regla_suspension_id = NULL` (unassign). The function SHALL throw `EquipoServiceError` on failure.

#### Scenario: Assign rule to multiple members
- **WHEN** `asignarReglaSuspension({ tenantId, reglaId: '<rule-id>', miembroIds: ['m1', 'm2'] })` is called
- **THEN** both members SHALL have `tenant_regla_suspension_id = '<rule-id>'`

#### Scenario: Unassign rule from members
- **WHEN** `asignarReglaSuspension({ tenantId, reglaId: null, miembroIds: ['m1'] })` is called
- **THEN** the member SHALL have `tenant_regla_suspension_id = NULL`

#### Scenario: RLS prevents non-admin from calling
- **WHEN** a non-admin user calls `asignarReglaSuspension`
- **THEN** the operation SHALL fail due to the existing RLS admin UPDATE policy on `miembros_tenant`

---

### Requirement: Types include suspension rule fields on member rows
`src/types/portal/equipo.types.ts` SHALL export `MiembroRow` with additional fields `tenant_regla_suspension_id: string | null` and `regla_suspension_nombre: string | null`. `MiembroTableItem` (which extends `MiembroRow`) SHALL inherit these fields. A new type `AsignarReglaSuspensionInput` SHALL be exported with shape `{ tenantId: string; reglaId: string | null; miembroIds: string[] }`.

#### Scenario: MiembroRow includes suspension rule fields
- **WHEN** `MiembroRow` is checked by TypeScript
- **THEN** it SHALL include `tenant_regla_suspension_id: string | null` and `regla_suspension_nombre: string | null`

#### Scenario: AsignarReglaSuspensionInput shape is correct
- **WHEN** `AsignarReglaSuspensionInput` is used
- **THEN** it SHALL have `tenantId: string`, `reglaId: string | null`, and `miembroIds: string[]`

---

### Requirement: useConfigurarSuspension hook manages 2-step modal state
`src/hooks/portal/gestion-equipo/useConfigurarSuspension.ts` SHALL export a hook that manages:
- `step: 1 | 2` — current step in the modal flow
- `selectedReglaId: string | null` — the selected rule ID (null for "Quitar regla")
- `hasSelection: boolean` — true when a radio option has been picked (including "Quitar regla")
- `selectedMiembroIds: Set<string>` — multi-select state for members
- `filterTerm: string` — search term for filtering members in Step 2
- `filteredMembers: MiembroTableItem[]` — members filtered by `filterTerm`
- `isSubmitting: boolean`
- `goToStep2()` — advance to Step 2
- `goBackToStep1()` — return to Step 1
- `toggleMiembro(id)` — toggle a member in the selection set
- `selectAll()` — select all currently filtered members
- `deselectAll()` — clear selection
- `submit()` — call `equipoService.asignarReglaSuspension` and invoke the `onSuccess` callback
- `reset()` — reset all state to initial

The hook SHALL accept `{ members: MiembroTableItem[]; tenantId: string; onSuccess: () => void }`.

#### Scenario: Initial state is Step 1 with no selections
- **WHEN** the hook is initialized
- **THEN** `step` SHALL be `1`, `selectedReglaId` SHALL be `null`, `hasSelection` SHALL be `false`, `selectedMiembroIds` SHALL be empty

#### Scenario: goToStep2 advances to Step 2
- **WHEN** `goToStep2()` is called
- **THEN** `step` SHALL be `2`

#### Scenario: goBackToStep1 returns to Step 1
- **WHEN** `goBackToStep1()` is called from Step 2
- **THEN** `step` SHALL be `1` and member selections SHALL be preserved

#### Scenario: selectAll selects all filtered members
- **WHEN** `selectAll()` is called with 5 filtered members
- **THEN** `selectedMiembroIds` SHALL contain all 5 member IDs

#### Scenario: deselectAll clears all selections
- **WHEN** `deselectAll()` is called
- **THEN** `selectedMiembroIds` SHALL be empty

#### Scenario: submit calls service and invokes onSuccess
- **WHEN** `submit()` is called with a selected rule and 3 selected members
- **THEN** `equipoService.asignarReglaSuspension` SHALL be called with the correct input, and on success, `onSuccess` SHALL be invoked

#### Scenario: reset clears all state
- **WHEN** `reset()` is called
- **THEN** step, selections, filter, and submitting state SHALL return to initial values

---

### Requirement: ConfigurarSuspensionModal renders a 2-step centered modal
`src/components/portal/gestion-equipo/ConfigurarSuspensionModal.tsx` SHALL render a centered dialog (not a slide-in drawer) with two steps:

**Step 1 — Select rule:**
- Title: "Configurar Suspensión"
- A radio-group list of active suspension rules showing rule name and a summary line: "Máx. N inasistencias · [Por suscripción | Últimos X días] · [Duración: Y días | Permanente]"
- A "Quitar regla" option (value: `null`) as the first radio item
- A "Siguiente →" button disabled until a selection is made

**Step 2 — Select members:**
- Title: "Seleccionar Miembros"
- A search input to filter members by name or email (case-insensitive, client-side)
- A scrollable multi-select list of members showing: avatar placeholder or foto_url, nombre + apellido, current `regla_suspension_nombre` as a badge (if any), and a checkbox per row
- "Seleccionar todos" / "Deseleccionar todos" toggle
- Footer with "← Atrás" button and "Aplicar (N seleccionados)" button (disabled when N = 0)

#### Scenario: Step 1 shows all active rules plus Quitar regla
- **WHEN** the modal opens with 2 active rules
- **THEN** Step 1 SHALL render 3 radio options: "Quitar regla" and the 2 rules with their summaries

#### Scenario: Siguiente is disabled until selection
- **WHEN** no radio option is selected
- **THEN** the "Siguiente →" button SHALL be disabled

#### Scenario: Siguiente is enabled after selection
- **WHEN** the admin selects any radio option (including "Quitar regla")
- **THEN** the "Siguiente →" button SHALL be enabled

#### Scenario: Step 2 shows member list with current rule badges
- **WHEN** Step 2 is displayed and a member has `regla_suspension_nombre = 'Regla B'`
- **THEN** that member's row SHALL show a badge with text "Regla B"

#### Scenario: Search filters member list
- **WHEN** the admin types "juan" in the search input
- **THEN** only members whose name or email contains "juan" (case-insensitive) SHALL be visible

#### Scenario: Select all selects filtered members
- **WHEN** the admin clicks "Seleccionar todos" while 3 members are visible (filtered)
- **THEN** all 3 visible members SHALL be checked

#### Scenario: Aplicar is disabled when no members selected
- **WHEN** no members are checked
- **THEN** the "Aplicar" button SHALL be disabled

#### Scenario: Aplicar shows selected count
- **WHEN** 5 members are checked
- **THEN** the button SHALL read "Aplicar (5 seleccionados)"

#### Scenario: Successful apply shows success toast and closes modal
- **WHEN** the admin clicks "Aplicar" and the operation succeeds
- **THEN** a success toast SHALL appear (e.g., "Regla aplicada a 5 miembro(s)") and the modal SHALL close

#### Scenario: Successful unassign shows removal toast
- **WHEN** "Quitar regla" was selected and apply succeeds
- **THEN** the toast SHALL read "Regla removida de N miembro(s)"

#### Scenario: Error keeps modal open
- **WHEN** the apply operation fails
- **THEN** an error toast SHALL appear and the modal SHALL remain open

---

### Requirement: EquipoPage shows "Configurar Suspensión" button for admins
`src/components/portal/gestion-equipo/EquipoPage.tsx` SHALL render a "Configurar Suspensión" button in the page header/toolbar area. The button SHALL only be visible when `activeTab === 'equipo'`. The button SHALL be hidden for non-admin roles (`entrenador`, `usuario`). The button SHALL be disabled with tooltip "No hay reglas de suspensión configuradas" when the tenant has zero active suspension rules. Clicking the enabled button SHALL open the `ConfigurarSuspensionModal`.

#### Scenario: Button visible for admin on equipo tab
- **WHEN** an admin user views the EquipoPage with the "Equipo" tab active
- **THEN** the "Configurar Suspensión" button SHALL be visible

#### Scenario: Button hidden on other tabs
- **WHEN** the active tab is "Solicitudes" or "Bloqueados"
- **THEN** the "Configurar Suspensión" button SHALL NOT be rendered

#### Scenario: Button hidden for non-admin roles
- **WHEN** a user with `entrenador` or `usuario` role views the page
- **THEN** the "Configurar Suspensión" button SHALL NOT be rendered

#### Scenario: Button disabled when no active rules
- **WHEN** the tenant has zero active suspension rules
- **THEN** the button SHALL be disabled with a tooltip "No hay reglas de suspensión configuradas"

#### Scenario: Clicking enabled button opens modal
- **WHEN** the admin clicks the enabled "Configurar Suspensión" button
- **THEN** the `ConfigurarSuspensionModal` SHALL open at Step 1

#### Scenario: Modal close refreshes team list
- **WHEN** the modal closes after a successful apply
- **THEN** the team member list SHALL refresh to reflect updated rule assignments
