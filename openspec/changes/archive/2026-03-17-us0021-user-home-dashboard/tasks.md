## 1. Branch Setup

- [x] 1.1 Create feature branch `feat/us0021-user-home-dashboard` from `develop`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Domain Types

- [x] 2.1 Create `src/types/portal/inicio.types.ts` with view model interfaces: `InicioStats`, `InicioEntrenamiento`, `InicioSuscripcion`, `InicioPagoPendiente`, `InicioMembresia`, `InicioDashboardData`

## 3. Service Layer

- [x] 3.1 Create `src/services/supabase/portal/inicio.service.ts` with `fetchInicioStats(supabase, userId)` — four parallel count queries returning `InicioStats`
- [x] 3.2 Add `fetchProximosEntrenamientos(supabase, userId, limit?)` — cross-tenant query via `reservas JOIN entrenamientos JOIN disciplinas JOIN escenarios JOIN tenants`, filtered by `atleta_id`, `fecha_hora >= now()`, `estado IN ('pendiente','confirmada')`, ordered by `fecha_hora ASC`, limited to 5
- [x] 3.3 Add `fetchMisSuscripciones(supabase, userId)` — cross-tenant query via `suscripciones JOIN planes JOIN tenants`, filtered by `atleta_id`, `estado IN ('activa','pendiente')`, ordered by `created_at DESC`
- [x] 3.4 Add `fetchPagosPendientes(supabase, userId)` — cross-tenant query via `pagos JOIN suscripciones JOIN planes JOIN tenants`, filtered by `pagos.estado = 'pendiente'`
- [x] 3.5 Add `fetchMisMembresias(supabase, userId)` — cross-tenant query via `miembros_tenant JOIN tenants JOIN roles`, filtered by `usuario_id`

## 4. Presentation Components

- [x] 4.1 Create `src/components/portal/inicio/InicioStatsCards.tsx` — four glass-card stat cards in `grid-cols-1 md:grid-cols-4` with coloured icon containers, uppercase labels, bold numbers, and hover lift effect
- [x] 4.2 Create `src/components/portal/inicio/InicioFeaturedTraining.tsx` — hero card with left 1/3 gradient area, right 2/3 content (badge, name, time, venue, meeting point, org, CTA button), and empty state fallback
- [x] 4.3 Create `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` — activity-row list (max 5) with discipline icon, training name, formatted date/time, venue, meeting point, org, booking status badge, and empty state
- [x] 4.4 Create `src/components/portal/inicio/InicioSuscripciones.tsx` as `"use client"` — subscriptions card with filter chips (Todas/Activas/Pendientes), status badges, date range, class progress indicator, payment status, and empty state
- [x] 4.5 Create `src/components/portal/inicio/InicioOrganizaciones.tsx` — compact org rows with logo, name, role badge, "Ver todas" link, each row linking to `/portal/orgs/[tenant_id]`, and empty state
- [x] 4.6 Create `src/components/portal/inicio/InicioQuickActions.tsx` — 2×2 grid of navigation buttons (Entrenamientos, Planes, Perfil, Organizaciones) with icons and hover effects
- [x] 4.7 Create `src/components/portal/inicio/InicioPagosPendientesAlert.tsx` — conditional amber alert card with payment count, total amount, "Revisar Pagos" CTA; hidden when no pending payments
- [x] 4.8 Create `src/components/portal/inicio/InicioPage.tsx` — main layout component: stats row (full width) + 3-column grid (`lg:grid-cols-3`) with left column (orgs, quick actions, subscriptions) and right column (featured training, trainings list, payments alert)
- [x] 4.9 Create `src/components/portal/inicio/index.ts` — barrel exports for all components

## 5. Page Route

- [x] 5.1 Create `src/app/portal/inicio/page.tsx` as Server Component — authenticate user via `supabase.auth.getUser()`, fetch all data in parallel via `Promise.all()`, render `InicioPage` with data as props
- [x] 5.2 Create `src/app/portal/inicio/loading.tsx` — skeleton fallback for navigation transitions, consistent with `portal/loading.tsx` pattern

## 6. Navigation & Redirect Updates

- [x] 6.1 Modify `src/types/portal.types.ts` — add `INICIO_MENU_ITEM` constant (`label: 'Inicio'`, `href: '/portal/inicio'`, `icon: 'home'`) and update `resolvePortalMenu()` to prepend it as the first item in all cases (with and without tenant context)
- [x] 6.2 Modify `src/app/portal/bootstrap/route.ts` — change default `nextPath` from `'/portal/orgs'` to `'/portal/inicio'`
- [x] 6.3 Modify `src/app/portal/layout.tsx` — change bootstrap redirect targets from `'/portal/orgs'` to `'/portal/inicio'`
- [x] 6.4 Modify `src/app/portal/page.tsx` — replace placeholder content with `redirect('/portal/inicio')` from `next/navigation`

## 7. Verification

- [x] 7.1 Run `npx tsc --noEmit` and verify zero TypeScript errors
- [x] 7.2 Verify responsive layout: single column (mobile), 3-column grid (desktop), 4-column stats row (md+)
- [x] 7.3 Verify empty states render correctly for each section when no data is available
- [x] 7.4 Verify glassmorphism design matches reference mockup `projectspec/designs/12_user_home.html` — glass cards, gradient-brand CTAs, badge colours, hover effects
- [x] 7.5 Verify post-login redirect flow: login → bootstrap → `/portal/inicio`
- [x] 7.6 Verify "Inicio" menu item appears first in sidebar navigation (both base and tenant contexts)

## 8. Documentation & PR

- [x] 8.1 Update `projectspec/03-project-structure.md` — add `/portal/inicio` route, `inicio/` component directory, `inicio.service.ts`, `inicio.types.ts`, and `INICIO_MENU_ITEM` to the directory structure
- [x] 8.2 Create commit message and pull request description for the implementation
