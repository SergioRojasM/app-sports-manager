## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/subscription-admin-member-tabs` off the current branch
- [x] 1.2 Verify the working branch is `feat/subscription-admin-member-tabs` and NOT `main`, `master`, or `develop` before making any changes

## 2. Types

- [x] 2.1 In `src/types/portal/gestion-suscripciones.types.ts`, add `es_miembro: boolean` to `SuscripcionAdminRow`
- [x] 2.2 In the same file, add `export type SuscripcionTab = 'miembros' | 'no_miembros';`

## 3. Service

- [x] 3.1 In `src/services/supabase/portal/gestion-suscripciones.service.ts`, add a query fetching `miembros_tenant.usuario_id` filtered by `tenant_id`, run via `Promise.all` alongside the existing `suscripciones` query inside `fetchSuscripcionesAdmin`
- [x] 3.2 Build a `Set<string>` of member `usuario_id`s from that query's result
- [x] 3.3 Update `mapRawRow` to accept the member `Set<string>` and set `es_miembro: memberIds.has(row.atleta_id)` on the mapped `SuscripcionAdminRow`
- [x] 3.4 Update `mapRawRow`'s call site(s) to pass the member set through

## 4. Hook

- [x] 4.1 In `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts`, extend `UseGestionSuscripcionesOptions` with `activeTab: SuscripcionTab`
- [x] 4.2 Filter `rows` by `r.es_miembro === (activeTab === 'miembros')` before applying the existing `suscripcionFilter` / `pagoFilter` / `searchTerm` chain
- [x] 4.3 Compute `stats` from the tab-filtered set (not the full unfiltered `rows`)
- [x] 4.4 Add a derived `tabCounts: { miembros: number; noMiembros: number }` computed from the full unfiltered `rows` (unaffected by search/chips)
- [x] 4.5 Reset `currentPage` to `1` when `activeTab` changes, in addition to the existing reset on search/chip changes
- [x] 4.6 Return `tabCounts` from the hook's result object

## 5. Component

- [x] 5.1 Create `src/components/portal/gestion-suscripciones/SuscripcionTipoBadge.tsx` rendering a "Miembro" / "No miembro" badge from an `esMiembro: boolean` prop, styled consistently with `SuscripcionEstadoBadge` / `PagoEstadoBadge`
- [x] 5.2 Export `SuscripcionTipoBadge` from `src/components/portal/gestion-suscripciones/index.ts`
- [x] 5.3 In `SuscripcionesTable.tsx`, add a "Tipo" column header and render `SuscripcionTipoBadge` per row using `row.es_miembro`
- [x] 5.4 In `GestionSuscripcionesPage.tsx`, add local `activeTab` state (`useState<SuscripcionTab>('miembros')`) and pass it into `useGestionSuscripciones`
- [x] 5.5 Render a tab bar ("Miembros" / "No miembros") above the stats cards, styled like the `Equipo` / `Solicitudes` / `Bloqueados` tab bar in `EquipoPage.tsx`, with a count badge on each tab from `tabCounts`
- [x] 5.6 Make the `EmptyState` copy tab-aware: "No hay suscripciones de miembros para esta organización." / "No hay suscripciones de no miembros para esta organización."

## 6. Verification

- [x] 6.1 Run the type checker and fix any errors
- [x] 6.2 Run the linter and fix any errors
- [x] 6.3 Run the test suite and fix any failures
- [x] 6.4 Start the dev server and manually verify: a member's subscription appears under "Miembros" with a "Miembro" badge; a non-member (public-plan, US-0093) subscription appears under "No miembros" with a "No miembro" badge; removing a member moves their existing subscription to "No miembros"; search/status chips/pagination work correctly per tab; switching tabs resets to page 1; tab-aware empty states render when a tab has no matching rows; all existing row actions and modals (Ver Pago, Validar Pago, Validar/Cancelar Suscripción, Editar, Eliminar, Ver Servicios, Nueva suscripción) still work in both tabs

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` to note the new `SuscripcionTipoBadge` component, the `activeTab`/`tabCounts` additions to `useGestionSuscripciones`, and the `es_miembro` field on `SuscripcionAdminRow`

## 8. Commit & PR

- [x] 8.1 Re-run type check, lint, and tests to confirm a clean baseline (do NOT run build)
- [ ] 8.2 Write a commit message summarizing the membership tab split and Tipo column
- [ ] 8.3 Write a pull request description referencing US-0098, summarizing the change, and including a manual test plan checklist
