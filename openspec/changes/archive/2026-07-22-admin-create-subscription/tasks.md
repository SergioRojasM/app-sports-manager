## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/admin-create-subscription`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260605000100_suscripciones_admin_insert_rls.sql` with admin INSERT policies for `public.suscripciones` and `public.pagos` using `get_admin_tenants_for_authenticated_user()`
- [x] 2.2 Apply migration locally: `npx supabase migration up` (local only, NOT remote)
- [x] 2.3 Verify in Supabase Studio that `suscripciones_insert_admin` and `pagos_insert_admin` policies are listed under the respective tables

## 3. Types

- [x] 3.1 Add `CrearSuscripcionAdminPayload` type to `src/types/portal/gestion-suscripciones.types.ts` (fields: `tenant_id`, `atleta_id`, `plan_id`, `plan_tipo_id`, `clases_plan`, `clases_restantes`, `estado`, `fecha_inicio`, `fecha_fin`, `comentarios`, `validado_por`, `pago: { monto, metodo_pago_id, estado } | null`)
- [x] 3.2 Add `CrearSuscripcionAdminFormValues` type to `src/types/portal/gestion-suscripciones.types.ts` (mirrors the 3-step form state: `atleta_id`, `plan_id`, `plan_tipo_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `comentarios`, `crearPago`, `monto`, `metodo_pago_id`, `estado_pago`)

## 4. Service

- [x] 4.1 Add `crearSuscripcionAdmin(payload: CrearSuscripcionAdminPayload): Promise<void>` to `src/services/supabase/portal/gestion-suscripciones.service.ts`
- [x] 4.2 Inside `crearSuscripcionAdmin`: INSERT into `suscripciones` (include `validado_por` when `estado = 'activa'`), retrieve the new `id`
- [x] 4.3 Inside `crearSuscripcionAdmin`: if `payload.pago !== null`, INSERT into `pagos` with `suscripcion_id`, `tenant_id`, `monto`, `metodo_pago_id`, and `estado`; throw a typed error on pago failure without rolling back the subscription
- [x] 4.4 Map Postgrest errors to `GestionSuscripcionesServiceError` (reuse the existing `mapPostgrestError` helper)

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`
- [x] 5.2 Implement athlete list loading: query `miembros_tenant` joined to `usuarios` filtered by `tenant_id`, `activo = true`, and role `atleta`; map to `AtletaOption[]` with `searchText`
- [x] 5.3 Implement plan list loading: call `planesService.getPlanes(tenantId)` and filter to `activo = true` plans
- [x] 5.4 Implement payment methods loading: call `metodosPagoService.getMetodosPago(tenantId, true)` (active only)
- [x] 5.5 Manage 3-step form state: `step` (1 | 2 | 3), `atleta_id`, `atleta_searchInput`, `plan_id`, `plan_tipo_id`, `estado` (default `'activa'`), `fecha_inicio` (default today ISO), `fecha_fin`, `clases_restantes`, `comentarios`, `crearPago`, `monto`, `metodo_pago_id`, `estado_pago` (default `'validado'`)
- [x] 5.6 Implement `useEffect` that auto-fills `fecha_fin` from `fecha_inicio + plan_tipo.vigencia_dias` and `clases_restantes` from `plan_tipo.clases_incluidas` when `plan_tipo_id` changes
- [x] 5.7 Implement `validateStep(step: 1 | 2 | 3): string | null` — step 1: require `atleta_id`; step 2: require `plan_id` + `plan_tipo_id` when plan has active subtypes; step 3: require dates when `estado = 'activa'`, validate `fecha_fin >= fecha_inicio`, require payment fields when `crearPago = true`
- [x] 5.8 Implement `submit(): Promise<boolean>` that calls `gestionSuscripcionesService.crearSuscripcionAdmin` and handles partial-failure (suscripcion created, pago failed) with distinct error messaging
- [x] 5.9 Expose `reset()` that clears all form state (called on modal close)
- [x] 5.10 Update `useGestionSuscripciones.ts`: add `'crear'` to `ModalType` union; add `openCrearModal: () => void` action (no `selectedRow` needed for creation); expose via hook result

## 6. Component

- [x] 6.1 Create `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`
- [x] 6.2 Implement step indicator in modal header (e.g., "Paso 1 de 3")
- [x] 6.3 **Step 1 — Athlete Picker**: implement searchable combobox using the same pattern as `ReservaFormModal` (controlled `searchInput`, filtered `atletaOptions`, `role="combobox"`, `role="listbox"`, `role="option"`, keyboard nav with `ArrowUp`/`ArrowDown`/`Enter`/`Escape`, outside-click close via `onBlur` + 150ms delay); show loading/empty states
- [x] 6.4 **Step 2 — Plan Selection**: dropdown for plan; conditionally render `radio` group for subtypes when `activeTipos.length > 0`; show subtype preview (`vigencia_dias`, `clases_incluidas`)
- [x] 6.5 **Step 3 — Subscription Config**: `estado` radio group (`pendiente` / `activa`); `fecha_inicio` date input; `fecha_fin` date input; `clases_restantes` number input (only when plan has class limit); `comentarios` textarea; collapsible payment section toggled by "Registrar pago" checkbox with `monto`, `metodo_pago_id` select, `estado_pago` radio group
- [x] 6.6 Implement "Siguiente" / "Anterior" / "Crear suscripción" footer buttons; disable submit while `isSubmitting`
- [x] 6.7 Display per-field validation errors inline below each field; display general submit error at the bottom of step 3
- [x] 6.8 Call `useCrearSuscripcion.reset()` on modal close regardless of success/failure
- [x] 6.9 Use glass/dark theme consistent with `EditarSuscripcionModal` (same border, background, button styles)

## 7. Page Wiring

- [x] 7.1 Update `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx`: add "Nueva suscripción" button in page header that calls `openCrearModal()`
- [x] 7.2 Render `<CrearSuscripcionModal>` in `GestionSuscripcionesPage`, wired to `useGestionSuscripciones` `modalType === 'crear'`, `closeModal`, and `handleModalSuccess` (which calls `closeModal` + `refresh`)
- [x] 7.3 Update `src/components/portal/gestion-suscripciones/index.ts` to export `CrearSuscripcionModal`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: add `CrearSuscripcionModal.tsx` entry under the `gestion-suscripciones/` feature slice; add `useCrearSuscripcion.ts` entry under `hooks/portal/gestion-suscripciones/`

## 9. Testing & Verification

- [ ] 9.1 Test happy path: admin selects athlete → plan without subtypes → estado `activa` with dates → submit without payment → verify subscription row in table
- [ ] 9.2 Test with subtypes: select plan with active `plan_tipos` → verify radio group appears, auto-fill of `fecha_fin` and `clases_restantes`
- [ ] 9.3 Test optional payment: toggle "Registrar pago" → fill `monto` + `metodo_pago_id` → submit → verify `pagos` row linked to new subscription
- [ ] 9.4 Test back navigation: enter data on step 2, go back to step 1, re-select athlete, advance — verify step 2 values are preserved
- [ ] 9.5 Test validation: attempt to advance each step without required fields; verify inline errors appear and step does NOT advance
- [ ] 9.6 Test `estado = 'pendiente'`: submit without dates → verify subscription created without `fecha_inicio`/`fecha_fin`
- [ ] 9.7 Test RLS with athlete-role user: verify they cannot see the "Nueva suscripción" button and cannot insert a subscription for another athlete via API
- [ ] 9.8 Test loading/empty states: empty athlete list, API error on athlete fetch, API error on plan fetch

## 10. Commit & PR

- [ ] 10.1 Stage all changes and create a commit with message: `feat(admin): admin create subscription on behalf of athlete (#US-0060)`
- [ ] 10.2 Write PR description: **Title**: "Admin: Create subscription on behalf of athlete"; **Summary**: Adds "Nueva suscripción" action to the admin subscription panel. A 3-step modal lets admins pick an athlete, select a plan/subtype, and configure the subscription. Optionally registers a payment in the same action. Includes admin INSERT RLS policies for `suscripciones` and `pagos`. **Changes**: new migration, new service function, new hook, new modal component, updates to `useGestionSuscripciones` and `GestionSuscripcionesPage`; **References**: US-0060


## 3. Types

- [ ] 3.1 Add `CrearSuscripcionAdminPayload` type to `src/types/portal/gestion-suscripciones.types.ts` (fields: `tenant_id`, `atleta_id`, `plan_id`, `plan_tipo_id`, `clases_plan`, `clases_restantes`, `estado`, `fecha_inicio`, `fecha_fin`, `comentarios`, `validado_por`, `pago: { monto, metodo_pago_id, estado } | null`)
- [ ] 3.2 Add `CrearSuscripcionAdminFormValues` type to `src/types/portal/gestion-suscripciones.types.ts` (mirrors the 3-step form state: `atleta_id`, `plan_id`, `plan_tipo_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `comentarios`, `crearPago`, `monto`, `metodo_pago_id`, `estado_pago`)

## 4. Service

- [ ] 4.1 Add `crearSuscripcionAdmin(payload: CrearSuscripcionAdminPayload): Promise<void>` to `src/services/supabase/portal/gestion-suscripciones.service.ts`
- [ ] 4.2 Inside `crearSuscripcionAdmin`: INSERT into `suscripciones` (include `validado_por` when `estado = 'activa'`), retrieve the new `id`
- [ ] 4.3 Inside `crearSuscripcionAdmin`: if `payload.pago !== null`, INSERT into `pagos` with `suscripcion_id`, `tenant_id`, `monto`, `metodo_pago_id`, and `estado`; throw a typed error on pago failure without rolling back the subscription
- [ ] 4.4 Map Postgrest errors to `GestionSuscripcionesServiceError` (reuse the existing `mapPostgrestError` helper)

## 5. Hook

- [ ] 5.1 Create `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`
- [ ] 5.2 Implement athlete list loading: query `miembros_tenant` joined to `usuarios` (same fields as `ReservaFormModal`) filtered by `tenant_id`, `activo = true`, and role `atleta`; map to `AtletaOption[]` with `searchText`
- [ ] 5.3 Implement plan list loading: call `planesService.getPlanes(tenantId)` and filter to `activo = true` plans
- [ ] 5.4 Implement payment methods loading: call `metodosPagoService.getMetodosPago(tenantId, true)` (active only)
- [ ] 5.5 Manage 3-step form state: `step` (1 | 2 | 3), `atleta_id`, `atleta_searchInput`, `plan_id`, `plan_tipo_id`, `estado` (default `'activa'`), `fecha_inicio` (default today ISO), `fecha_fin`, `clases_restantes`, `comentarios`, `crearPago`, `monto`, `metodo_pago_id`, `estado_pago` (default `'validado'`)
- [ ] 5.6 Implement `useEffect` that auto-fills `fecha_fin` from `fecha_inicio + plan_tipo.vigencia_dias` and `clases_restantes` from `plan_tipo.clases_incluidas` when `plan_tipo_id` changes
- [ ] 5.7 Implement `validateStep(step: 1 | 2 | 3): string | null` — step 1: require `atleta_id`; step 2: require `plan_id` + `plan_tipo_id` when plan has active subtypes; step 3: require dates when `estado = 'activa'`, validate `fecha_fin >= fecha_inicio`, require payment fields when `crearPago = true`
- [ ] 5.8 Implement `submit(): Promise<boolean>` that calls `gestionSuscripcionesService.crearSuscripcionAdmin` and handles partial-failure (suscripcion created, pago failed) with distinct error messaging
- [ ] 5.9 Expose `reset()` that clears all form state (called on modal close)
- [ ] 5.10 Update `useGestionSuscripciones.ts`: add `'crear'` to `ModalType` union; add `openCrearModal: () => void` action (no `selectedRow` needed for creation); expose via hook result

## 6. Component

- [ ] 6.1 Create `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`
- [ ] 6.2 Implement step indicator in modal header (e.g., "Paso 1 de 3")
- [ ] 6.3 **Step 1 — Athlete Picker**: implement searchable combobox using the same pattern as `ReservaFormModal` (controlled `searchInput`, filtered `atletaOptions`, `role="combobox"`, `role="listbox"`, `role="option"`, keyboard nav with `ArrowUp`/`ArrowDown`/`Enter`/`Escape`, outside-click close via `onBlur` + 150ms delay); show loading/empty states
- [ ] 6.4 **Step 2 — Plan Selection**: dropdown for plan; conditionally render `radio` group for subtypes when `activeTipos.length > 0`; show subtype preview (`vigencia_dias`, `clases_incluidas`)
- [ ] 6.5 **Step 3 — Subscription Config**: `estado` radio group (`pendiente` / `activa`); `fecha_inicio` date input; `fecha_fin` date input; `clases_restantes` number input (only when plan has class limit); `comentarios` textarea; collapsible payment section toggled by "Registrar pago" checkbox with `monto`, `metodo_pago_id` select, `estado_pago` radio group
- [ ] 6.6 Implement "Siguiente" / "Anterior" / "Crear suscripción" footer buttons; disable submit while `isSubmitting`
- [ ] 6.7 Display per-field validation errors inline below each field; display general submit error at the bottom of step 3
- [ ] 6.8 Call `useCrearSuscripcion.reset()` on modal close regardless of success/failure
- [ ] 6.9 Use glass/dark theme consistent with `EditarSuscripcionModal` (same border, background, button styles)

## 7. Page Wiring

- [ ] 7.1 Update `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx`: add "Nueva suscripción" button in page header that calls `openCrearModal()`
- [ ] 7.2 Render `<CrearSuscripcionModal>` in `GestionSuscripcionesPage`, wired to `useGestionSuscripciones` `modalType === 'crear'`, `closeModal`, and `handleModalSuccess` (which calls `closeModal` + `refresh`)
- [ ] 7.3 Update `src/components/portal/gestion-suscripciones/index.ts` to export `CrearSuscripcionModal`

## 8. Documentation

- [ ] 8.1 Update `projectspec/03-project-structure.md`: add `CrearSuscripcionModal.tsx` entry under the `gestion-suscripciones/` feature slice; add `useCrearSuscripcion.ts` entry under `hooks/portal/gestion-suscripciones/`

## 9. Testing & Verification

- [ ] 9.1 Test happy path: admin selects athlete → plan without subtypes → estado `activa` with dates → submit without payment → verify subscription row in table
- [ ] 9.2 Test with subtypes: select plan with active `plan_tipos` → verify radio group appears, auto-fill of `fecha_fin` and `clases_restantes`
- [ ] 9.3 Test optional payment: toggle "Registrar pago" → fill `monto` + `metodo_pago_id` → submit → verify `pagos` row linked to new subscription
- [ ] 9.4 Test back navigation: enter data on step 2, go back to step 1, re-select athlete, advance — verify step 2 values are preserved
- [ ] 9.5 Test validation: attempt to advance each step without required fields; verify inline errors appear and step does NOT advance
- [ ] 9.6 Test `estado = 'pendiente'`: submit without dates → verify subscription created without `fecha_inicio`/`fecha_fin`
- [ ] 9.7 Test RLS with athlete-role user: verify they cannot see the "Nueva suscripción" button and cannot insert a subscription for another athlete via API
- [ ] 9.8 Test loading/empty states: empty athlete list, API error on athlete fetch, API error on plan fetch

## 10. Commit & PR

- [ ] 10.1 Stage all changes and create a commit with message: `feat(admin): admin create subscription on behalf of athlete (#US-0060)`
- [ ] 10.2 Write PR description: **Title**: "Admin: Create subscription on behalf of athlete"; **Summary**: Adds "Nueva suscripción" action to the admin subscription panel. A 3-step modal lets admins pick an athlete, select a plan/subtype, and configure the subscription. Optionally registers a payment in the same action. Includes admin INSERT RLS policies for `suscripciones` and `pagos`. **Changes**: new migration, new service function, new hook, new modal component, updates to `useGestionSuscripciones` and `GestionSuscripcionesPage`; **References**: US-0060
