## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/tenant-suspension-rules`
- [x] 1.2 Validate that the working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260407000100_tenant_reglas_suspension.sql` with the table definition, unique constraint `(tenant_id, nombre)`, check constraints (`num_inasistencias >= 1`, `por_dias_atras >= 0`, `duracion >= 0`), cascade FK, and `idx_tenant_reglas_suspension_tenant_id` index
- [x] 2.2 Add the `set_updated_at` trigger call for `tenant_reglas_suspension` in the migration
- [x] 2.3 Add RLS policies: `enable row level security`, grant `select/insert/update/delete` to `authenticated`, and the four named policies (select open to all authenticated, insert/update/delete restricted to `get_admin_tenants_for_authenticated_user()`)
- [x] 2.4 Apply the migration locally: `supabase db push` (or `supabase db reset` in dev) and verify the table exists with correct structure

## 3. Types

- [x] 3.1 Create `src/types/portal/reglas-suspension.types.ts` exporting `ReglaSuspension`, `ReglaSuspensionCreatePayload`, `ReglaSuspensionUpdatePayload`, and `ReglaSuspensionFormValues`

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/reglas-suspension.service.ts` with `getReglasSuspension(tenantId)` — selects all rows for tenant ordered by `created_at ASC`
- [x] 4.2 Add `createReglaSuspension(payload)` — inserts and returns the created row via `.single()`
- [x] 4.3 Add `updateReglaSuspension(id, payload)` — updates by `id` and returns the updated row via `.single()`
- [x] 4.4 Add `deleteReglaSuspension(id)` — deletes by `id`, returns void

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/tenant/useReglasSuspension.ts` that fetches rules on mount via `getReglasSuspension`
- [x] 5.2 Implement `openCreateModal()` (no-op guard when `rules.length >= 3`), `openEditModal(rule)`, `closeModal()`
- [x] 5.3 Implement `handleCreate(payload)` — calls service, optimistically adds to list, shows success toast; on error shows error toast
- [x] 5.4 Implement `handleUpdate(id, payload)` — calls service, updates item in list, shows success toast; on error shows error toast
- [x] 5.5 Implement `handleDelete(id)` — calls service, removes item from list, shows success toast; on error shows error toast
- [x] 5.6 Expose `isLoading`, `isSubmitting`, `rules`, `modalMode`, `isModalOpen`, `selectedRule`

## 6. Form Modal Component

- [x] 6.1 Create `src/components/portal/tenant/ReglaSuspensionFormModal.tsx` as a right-side slide-in modal (reuse the slide-in pattern from `MetodoPagoFormModal`)
- [x] 6.2 Add form fields: `nombre` (text, required, max 100), `num_inasistencias` (integer, min 1, required), `por_suscripcion` (toggle), `por_dias_atras` (integer, min 0), `duracion` (integer, min 0), `activo` (toggle)
- [x] 6.3 Implement cross-field validation: if `por_suscripcion === false && (por_dias_atras ?? 0) <= 0` → show inline error "Debe seleccionar al menos una condición"
- [x] 6.4 Add display hints: `duracion = 0` → show "Permanente (sin límite de días)"; `por_dias_atras = 0` → show "No aplica" near the input
- [x] 6.5 Pre-fill all fields from `selectedRule` when `modalMode === 'edit'`
- [x] 6.6 Map duplicate-name DB error (Postgres code `23505`) to inline field error under `nombre`: "Ya existe una regla con este nombre"
- [x] 6.7 On submit call `handleCreate` or `handleUpdate` based on `modalMode`

## 7. List Card Component

- [x] 7.1 Create `src/components/portal/tenant/TenantReglasSuspensionCard.tsx` consuming `useReglasSuspension(tenantId)`
- [x] 7.2 Render loading skeleton while `isLoading`
- [x] 7.3 Render empty-state "No hay reglas configuradas" when `rules.length === 0` (admin view)
- [x] 7.4 Render compact row for each rule showing: `nombre`, `num_inasistencias`, condition dimension (`por_suscripcion` → "Por suscripción" / `por_dias_atras > 0` → "Últimos N días" / both → combined), and `duracion` (0 → "Permanente", else "N días")
- [x] 7.5 Render edit and delete buttons per row — visible only to admin users
- [x] 7.6 Render "Add Rule" button: disabled + `aria-disabled="true"` + tooltip "Máximo 3 reglas por organización" when `rules.length >= 3`; enabled otherwise — visible to admin only
- [x] 7.7 Apply dimmed style (e.g., `opacity-50`) to rows where `activo === false`

## 8. Page Integration

- [x] 8.1 In `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`, import `TenantReglasSuspensionCard` and render `<TenantReglasSuspensionCard tenantId={tenantId} />` below `<TenantPaymentMethodsCard />`

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` to document the new `reglas-suspension` service, hook, and components; add `tenant_reglas_suspension` to the database schema section

## 10. Verification

- [x] 10.1 Verify RLS policies in Supabase Studio: attempt insert/update/delete as a non-admin user → expect row-level security error
- [x] 10.2 Test manually: create 1st, 2nd, 3rd rule → verify Add button disables; delete one → verify button re-enables
- [x] 10.3 Test form validation: submit with empty `nombre`, with `num_inasistencias = 0`, with no condition selected → verify inline errors
- [x] 10.4 Test `duracion = 0` and `por_dias_atras = 0` display as "Permanente" / "No aplica" in list and form hints
- [x] 10.5 Test edit: change `nombre` and `num_inasistencias` → verify list reflects updated values immediately
- [x] 10.6 Run TypeScript compiler check: `npx tsc --noEmit`

## 11. Commit and PR

- [x] 11.1 Stage all changes and create a commit with message: `feat(tenant): add suspension rules configuration (US-0054)`
- [x] 11.2 Create pull request with title "feat(tenant): Tenant Suspension Rules Configuration (US-0054)" and description summarising: new `tenant_reglas_suspension` table + RLS, CRUD service and hook, `TenantReglasSuspensionCard` and `ReglaSuspensionFormModal` components, integration into `gestion-organizacion` page
