## 1. Branch Setup and Validation

- [x] 1.1 Create a new branch using format `feat/us0006-view-organization-management`
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop`

## 2. Page Layer (`app`) Implementation

- [x] 2.1 Replace placeholder content in `src/app/portal/(administrador)/gestion-organizacion/page.tsx` with `OrganizationView` composition
- [x] 2.2 Ensure page keeps existing portal shell behavior (no changes to portal layout/sidebar/header contracts)
- [x] 2.3 Add route-level handling for loading/error/empty rendering entrypoints expected by the feature flow

## 3. Component Layer (`components`) Implementation

- [x] 3.1 Create feature folder `src/components/portal/organization-view/`
- [x] 3.2 Implement `OrganizationInfoCards.tsx` as the feature composition component
- [x] 3.3 Implement `OrganizationIdentityCard.tsx` with tenant identity fields and null-safe placeholders
- [x] 3.4 Implement `OrganizationContactCard.tsx` with email/phone/web rendering and accessible links
- [x] 3.5 Implement `OrganizationSocialLinksCard.tsx` with social URL rendering and placeholder behavior
- [x] 3.6 Implement `OrganizationContextCard.tsx` with founded/head coach/location fields
- [x] 3.7 Render visual edit controls from reference HTML as non-functional controls for this iteration

## 4. Hook Layer (`hooks`) Implementation

- [x] 4.1 Create feature folder `src/hooks/portal/organization-view/`
- [x] 4.2 Implement `useOrganizationView.ts` to orchestrate service calls and expose `data`, `loading`, `error`
- [x] 4.3 Add deterministic fallback logic in hook/view model for missing coach/location values
- [x] 4.4 Ensure hook encapsulates orchestration logic so presentation components remain UI-only

## 5. Service Layer (`services`) Implementation

- [x] 5.1 Create `src/services/supabase/portal/organization-view.service.ts`
- [x] 5.2 Implement tenant identity query (`public.tenants`) scoped by authenticated `tenant_id`
- [x] 5.3 Implement head coach resolution query (`public.usuarios` + `public.roles`) with deterministic selection fallback
- [x] 5.4 Implement representative location query (`public.escenarios`) prioritizing active records with fallback
- [x] 5.5 Implement service-level error mapping for non-blocking UI error state handling

## 6. Types Layer (`types`) Implementation

- [x] 6.1 Create `src/types/portal/organization-view.types.ts`
- [x] 6.2 Define DTOs for tenant identity/contact/social/context payloads
- [x] 6.3 Define feature view model/state contracts (`OrganizationViewData`, loading/error contracts)
- [x] 6.4 Keep shared role/menu contracts unchanged in `src/types/portal.types.ts` unless a strict shared export is required

## 7. Validation and Documentation

- [x] 7.1 Validate `/portal/gestion-organizacion` renders cards (not placeholder text) for `administrador`
- [x] 7.2 Validate loading, empty, and non-blocking error states across cards
- [x] 7.3 Validate edit controls are visible but do not persist changes
- [x] 7.4 Run lint for changed files and resolve issues in scope
- [x] 7.5 Update `README.md` with route purpose and portal feature-folder convention (`organization-view` slice)
