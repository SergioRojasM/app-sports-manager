## Why

After login, users land on `/portal/orgs` — a flat list of organizations with no personalized context. There is no way to see upcoming trainings, active subscriptions, pending payments, or team memberships without navigating into each organization individually. Athletes need a single, consolidated view of their cross-tenant activity so they can understand their current status and act on pending items immediately after logging in.

## What Changes

- **New route `/portal/inicio`**: A Server Component page that aggregates and displays the authenticated user's personal data across all tenants — subscriptions, upcoming trainings (via reservas), pending payments, and organization memberships — in a card-based glassmorphism dashboard layout.
- **New dashboard components**: Eight presentation components following the feature-slice pattern under `src/components/portal/inicio/` — stats cards row, featured next training hero card, upcoming trainings list, subscriptions card with status filters, organizations card, quick actions grid, and pending payments alert.
- **New service layer**: `inicio.service.ts` with five cross-tenant fetch functions (subscriptions, upcoming trainings, pending payments, memberships, aggregated stats) using joined queries filtered by `auth.uid()`.
- **New types**: View model interfaces in `inicio.types.ts` for all dashboard data structures.
- **Bootstrap redirect change**: Default post-login destination changes from `/portal/orgs` to `/portal/inicio`.
- **Navigation update**: "Inicio" added as the first item in the portal sidebar menu (before "Organizaciones Disponibles") with a `home` icon.
- **Portal root redirect**: `/portal/page.tsx` updated to redirect to `/portal/inicio` instead of showing a static placeholder.

## Non-goals

- No new database tables, columns, migrations, or RLS policies — all data is accessible through existing schema and policies.
- No real-time / WebSocket subscriptions — dashboard data is fetched server-side on page load.
- No client-side filtering beyond the subscription status chips (Todas / Activas / Pendientes) which is local state only.
- The `/portal` root route is intentionally kept free for a future social feed / activity wall — this feature only occupies `/portal/inicio`.
- No admin-specific dashboard — this is exclusively the athlete (`usuario`) personal overview.
- No payment processing or subscription management actions — the dashboard is read-only with navigation links to existing detail pages.

## Capabilities

### New Capabilities

- `user-home-dashboard`: Personal post-login dashboard at `/portal/inicio` that aggregates cross-tenant data (subscriptions, upcoming trainings, pending payments, memberships) into a glassmorphism card-based layout with stats row, featured training hero card, activity lists, quick actions grid, and conditional payment alerts.

### Modified Capabilities

- `portal-role-navigation`: Adding "Inicio" as the first sidebar menu item (before "Organizaciones Disponibles") with `home` icon linking to `/portal/inicio`. Changing the bootstrap redirect default from `/portal/orgs` to `/portal/inicio`.

## Impact

### Pages / Components
- **New page**: `src/app/portal/inicio/page.tsx` (Server Component)
- **New components** (8 files): `src/components/portal/inicio/` — `InicioPage`, `InicioStatsCards`, `InicioFeaturedTraining`, `InicioProximosEntrenamientos`, `InicioSuscripciones`, `InicioPagosPendientesAlert`, `InicioOrganizaciones`, `InicioQuickActions`
- **New service**: `src/services/supabase/portal/inicio.service.ts`
- **New types**: `src/types/portal/inicio.types.ts`

### Files Modified
- `src/app/portal/bootstrap/route.ts` — default redirect `/portal/orgs` → `/portal/inicio`
- `src/app/portal/layout.tsx` — bootstrap redirect target → `/portal/inicio`
- `src/types/portal.types.ts` — add `Inicio` menu item to BASE menu
- `src/app/portal/page.tsx` — redirect to `/portal/inicio`

### Database
- No migrations required — all queries use existing tables (`suscripciones`, `reservas`, `entrenamientos`, `pagos`, `miembros_tenant`, `tenants`, `planes`, `disciplinas`, `escenarios`, `roles`) with existing RLS policies that support cross-tenant `auth.uid()` filtering.

### Dependencies
- No new npm packages — uses existing Supabase client, Tailwind CSS, Material Symbols Outlined icons.

## Files to Create / Modify

### Create
| File | Layer | Purpose |
|------|-------|---------|
| `src/types/portal/inicio.types.ts` | Types | View model interfaces (`InicioStats`, `InicioEntrenamiento`, `InicioSuscripcion`, `InicioPagoPendiente`, `InicioMembresia`, `InicioDashboardData`) |
| `src/services/supabase/portal/inicio.service.ts` | Service | Five cross-tenant fetch functions (`fetchMisSuscripciones`, `fetchProximosEntrenamientos`, `fetchPagosPendientes`, `fetchMisMembresias`, `fetchInicioStats`) |
| `src/components/portal/inicio/InicioPage.tsx` | Component | Main dashboard layout — 3-column grid, receives all data as props |
| `src/components/portal/inicio/InicioStatsCards.tsx` | Component | Four glass-card stat cards row (md:grid-cols-4) |
| `src/components/portal/inicio/InicioFeaturedTraining.tsx` | Component | Hero card for next upcoming training (image + gradient overlay + details) |
| `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` | Component | Activity-row list of upcoming trainings (max 5) |
| `src/components/portal/inicio/InicioSuscripciones.tsx` | Component | Subscriptions card with status badges, progress indicators, filter chips |
| `src/components/portal/inicio/InicioPagosPendientesAlert.tsx` | Component | Conditional amber alert card for pending payments |
| `src/components/portal/inicio/InicioOrganizaciones.tsx` | Component | Compact org membership rows with logos and role badges |
| `src/components/portal/inicio/InicioQuickActions.tsx` | Component | 2×2 grid of navigation shortcut buttons |
| `src/components/portal/inicio/index.ts` | Component | Barrel exports |
| `src/app/portal/inicio/page.tsx` | Page | Server Component — fetches data via service, renders `InicioPage` |

### Modify
| File | Change |
|------|--------|
| `src/app/portal/bootstrap/route.ts` | Default redirect → `/portal/inicio` |
| `src/app/portal/layout.tsx` | Bootstrap redirect target → `/portal/inicio` |
| `src/types/portal.types.ts` | Add `Inicio` menu item (first position, `home` icon) |
| `src/app/portal/page.tsx` | Redirect to `/portal/inicio` |

## Step-by-step Implementation Plan

Following the methodology: **types → service → components → hooks → page**

1. **Types** — Create `src/types/portal/inicio.types.ts` with all view model interfaces.
2. **Service** — Create `src/services/supabase/portal/inicio.service.ts` with five fetch functions using cross-tenant joined queries.
3. **Components** — Create all eight presentation components under `src/components/portal/inicio/` + barrel index, implementing the glassmorphism card-based design from `projectspec/designs/12_user_home.html`.
4. **Page** — Create `src/app/portal/inicio/page.tsx` as a Server Component that fetches data in parallel via `Promise.all()` and renders `InicioPage`.
5. **Navigation** — Modify `src/types/portal.types.ts` to add "Inicio" menu item, update bootstrap route, portal layout redirect, and portal root page.
6. **Verify** — TypeScript compilation, responsive layout, empty states, visual match against design mockup.
