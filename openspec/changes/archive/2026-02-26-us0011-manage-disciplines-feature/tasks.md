## 1. Git Workflow Preparation

- [x] 1.1 Create a feature branch named `feat/manage-disciplines-feature` from the current integration branch
- [x] 1.2 Validate the active working branch is not `main`, `master`, or `develop` before starting implementation

## 2. Data Model and Security Baseline (Supabase)

- [x] 2.1 Review current `public.disciplinas` and related constraints in `supabase/migrations/20260221000100_migracion_inicial_bd.sql`
- [x] 2.2 Create a new migration file in `supabase/migrations/` to add admin-only `insert/update/delete` policies for `public.disciplinas`
- [x] 2.3 Apply migrations locally and validate admin-tenant authorization for discipline mutations (`allow` for managed tenant, `deny` otherwise)
- [x] 2.4 Validate database behavior for key constraints: duplicate `tenant_id + nombre` and delete blocked by `entrenamientos_disciplina_id_fkey`

## 3. Delivery Layer (Page)

- [x] 3.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx` as a presentation-only route entrypoint
- [x] 3.2 Ensure the page composes the feature root component and performs no direct Supabase/data-access calls

## 4. Presentation Layer (Components)

- [x] 4.1 Create `src/components/portal/disciplines/DisciplinesPage.tsx` as the feature container (header, CTA, table area, modal host)
- [x] 4.2 Create `src/components/portal/disciplines/DisciplinesTable.tsx` with required columns (`Discipline`, `Category`, `Status`, `Actions`) and row actions (`Edit`, `Delete`)
- [x] 4.3 Create `src/components/portal/disciplines/DisciplineFormModal.tsx` to support shared `create`/`edit` right-side modal behavior
- [x] 4.4 Create `src/components/portal/disciplines/DisciplinesHeaderFilters.tsx` for search/filter controls (if split improves SRP)
- [x] 4.5 Create `src/components/portal/disciplines/index.ts` and export feature components consistently
- [x] 4.6 Implement loading, empty, and error UI states for disciplines list and preserve table state on mutation errors

## 5. Application Layer (Hooks)

- [x] 5.1 Create `src/hooks/portal/disciplines/useDisciplines.ts` to orchestrate tenant loading, filtering, modal state, selected discipline, and mutations
- [x] 5.2 Create `src/hooks/portal/disciplines/useDisciplineForm.ts` (optional split) for form state and field validation concerns
- [x] 5.3 Implement submit safeguards: disable while pending and block invalid payloads before service calls
- [x] 5.4 Implement post-mutation list refresh strategy and user feedback for success/error outcomes

## 6. Infrastructure Layer (Services)

- [x] 6.1 Create `src/services/supabase/portal/disciplines.service.ts` with `listDisciplinesByTenant`, `createDiscipline`, `updateDiscipline`, and `deleteDiscipline`
- [x] 6.2 Enforce tenant scope in all service queries and payload handling (`tenant_id` boundary)
- [x] 6.3 Map database constraint failures to deterministic app-level errors (duplicate-name, FK dependency)
- [x] 6.4 Update `src/services/supabase/portal/index.ts` to export new discipline service contracts if required

## 7. Domain Layer (Types)

- [x] 7.1 Create `src/types/portal/disciplines.types.ts` with domain and UI contracts (`Discipline`, inputs, form values, table view model, field errors)
- [x] 7.2 Ensure all touched disciplines files consume shared types and avoid `any`

## 8. Role Navigation Integration

- [x] 8.1 Update role-based tenant navigation to include `gestion-disciplinas` entry for `administrador` only
- [x] 8.2 Validate that unauthorized tenant context does not render tenant menu entries and redirects to `/portal/orgs`

## 9. Validation and Quality Checks

- [x] 9.1 Validate end-to-end flows manually: list, create, edit, delete, duplicate-name error, and FK-restricted delete error
- [x] 9.2 Run lint/type checks for all touched files and resolve implementation-related issues

## 10. Documentation and Delivery

- [x] 10.1 Update `projectspec/03-project-structure.md` to include or confirm the disciplines feature slice structure
- [x] 10.2 Update `README.md` with a brief note about administrator disciplines capability
- [x] 10.3 Write a conventional commit message proposal summarizing the implemented feature and DB policy migration
- [x] 10.4 Draft the pull request description with scope, migrations, validation evidence, and rollout/rollback notes
