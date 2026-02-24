## 1. Setup and branch safety

- [x] 1.1 Create a feature branch named `feat/edit-organization-drawer`
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop`
- [x] 1.3 Review `projectspec/03-project-structure.md` and confirm `organization-view` feature-slice paths

## 2. Page integration (delivery)

- [x] 2.1 Update `src/app/portal/(administrador)/gestion-organizacion/page.tsx` to wire edit-flow state and drawer mounting point
- [x] 2.2 Ensure route behavior and role-gated access remain unchanged while enabling edit entrypoint

## 3. Component implementation (presentation)

- [x] 3.1 Update `src/components/portal/organization-view/OrganizationInfoCards.tsx` with `Edit organization` CTA trigger
- [x] 3.2 Create `src/components/portal/organization-view/EditOrganizationDrawer.tsx` with right-side overlay/drawer close interactions (close icon, cancel, overlay click, `Esc`)
- [x] 3.3 Create `src/components/portal/organization-view/EditOrganizationForm.tsx` with editable tenant fields and inline validation rendering
- [x] 3.4 Add submit/loading/error/success UI states consistent with existing portal patterns

## 4. Hook orchestration (application)

- [x] 4.1 Create `src/hooks/portal/organization-view/useEditOrganization.ts` for drawer open/close, initial values, submit lifecycle, and error handling
- [x] 4.2 Implement validation and normalization in hook flow (`trim`, required checks, URL/email format checks, optional empty-to-`null`)
- [x] 4.3 Integrate post-save refresh with `src/hooks/portal/organization-view/useOrganizationView.ts`

## 5. Service updates (infrastructure)

- [x] 5.1 Extend `src/services/supabase/portal/organization-view.service.ts` with tenant read-for-edit method scoped by authenticated `tenant_id`
- [x] 5.2 Add tenant update method that persists only to `public.tenants` using `id = tenant_id`
- [x] 5.3 Ensure service error propagation supports non-blocking save error feedback in UI

## 6. Type contracts (domain)

- [x] 6.1 Extend `src/types/portal/organization-view.types.ts` with `OrganizationEditFormValues`
- [x] 6.2 Extend `src/types/portal/organization-view.types.ts` with `OrganizationEditPayload` and `OrganizationEditResult`
- [x] 6.3 Align field constraints/types with spec-defined rules for editable tenant fields

## 7. Verification and documentation

- [ ] 7.1 Manually verify drawer open/close behavior, prefill, validation, success/error states, and in-place refresh at `/portal/gestion-organizacion`
- [x] 7.2 Verify read/write scope touches only `public.tenants` and does not persist to `usuarios`, `roles`, or `escenarios`
- [x] 7.3 Run lint/typecheck for touched files and resolve issues in scope
- [x] 7.4 Update `README.md` with organization edit behavior and tenant-only persistence note (if needed)