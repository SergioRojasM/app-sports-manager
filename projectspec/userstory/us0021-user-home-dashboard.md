# US-0021 — User Home Dashboard

## ID
`us0021`

## Name
User Home Dashboard — Personal Overview with Subscriptions, Upcoming Trainings, Pending Payments, and Memberships

## As a
Portal user (athlete) logged into the platform

## I Want
A personal **Home Dashboard** (`/portal/inicio`) that I see immediately after logging in, showing a consolidated overview of my activity across all the organizations I belong to — my subscriptions, upcoming training sessions, pending payments, and team memberships.

## So That
I can quickly understand my current status in the platform without having to navigate into each organization individually, and I can take action on pending items (e.g., pay a subscription, check my next training) directly from one central place.

---

## Description

### Context
Currently, after login the bootstrap route redirects the user to `/portal/orgs`, which is a list of organizations. There is no personalized landing page that aggregates the user's data across tenants. The existing `/portal/page.tsx` is a static placeholder ("Bienvenido al portal… Selecciona una opción").

This story creates a new route `/portal/inicio` that serves as the primary post-login destination for users with role `usuario`. It aggregates cross-tenant data — subscriptions, upcoming trainings (via bookings/reservas), pending payments, and organization memberships — into a single dashboard view.

The route `/portal` (root) is intentionally left free for a future social feed / activity wall feature. The new dashboard is scoped strictly to the authenticated user's personal data.

### Visual Reference

**Design mockup**: `projectspec/designs/12_user_home.html`

The design follows a modern card-based layout with glassmorphism effects (`glass-card` pattern), dark theme (navy-deep background), turquoise/secondary accent colours, and Material Symbols Outlined icons. Key visual patterns from the design:

- **Glass cards**: `background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.05);`
- **Stat cards**: Horizontal layout with icon container (coloured background) + label + bold number, with subtle hover lift (`hover:translate-y-[-2px]`).
- **Activity rows**: Horizontal cards with avatar/image, text content, and right-aligned metadata badges. Transparent background with hover border highlight (`hover:border-primary/20`).
- **Featured session card**: Full-width card with background image (left 1/3) with gradient overlay, and content area (right 2/3) with event details and CTA button using `gradient-brand`.
- **Quick actions grid**: 2×2 grid of icon buttons inside glass cards with border hover effects.
- **Responsive grid**: `grid-cols-1 lg:grid-cols-3` main layout — left column (1/3) and right column (2/3).

### Feature Overview

The dashboard layout uses a **3-column grid** (`lg:grid-cols-3`). The top row spans full width for stats. Below, the left column (1/3) holds quick access cards and the right column (2/3) holds activity-oriented content.

#### 1. Stats Cards Row (full width, `grid-cols-1 md:grid-cols-4`)

Four `glass-card stat-card` cards at the top, each containing:
- A coloured icon container (`size-11 rounded-md bg-secondary/20`) with a Material icon
- A label (`text-slate-500 text-[10px] font-bold uppercase tracking-wider`)
- A bold number (`text-xl font-bold`)

| Card | Icon | Label | Data Source |
|------|------|-------|-------------|
| Active Subscriptions | `card_membership` | Suscripciones Activas | `COUNT(suscripciones) WHERE estado = 'activa'` cross-tenant |
| Upcoming Trainings | `directions_run` | Próximos Entrenamientos | `COUNT(reservas JOIN entrenamientos) WHERE fecha_hora >= now() AND reservas.estado IN ('pendiente','confirmada')` |
| Pending Payments | `payments` (amber icon/bg) | Pagos Pendientes | `COUNT(pagos) WHERE estado = 'pendiente'` via user's subscriptions |
| Organizations | `corporate_fare` | Organizaciones | `COUNT(miembros_tenant) WHERE usuario_id = user.id` |

#### 2. Left Column — Quick Access (1/3 width)

**My Organizations cards** (`glass-card rounded-md p-6`):
- Header: "Mis Organizaciones" with "Ver todas" link (`text-secondary text-xs font-semibold bg-secondary/10 px-3 py-1.5 rounded-md`)
- Compact rows for each tenant membership, each showing:

  | Field | Source |
  |-------|--------|
  | Organization logo | `tenants.logo_url` (in a `size-10 rounded-md` image) |
  | Organization name | `tenants.nombre` (bold, secondary colour) |
  | Role | `roles.nombre` badge |

  Each row links to `/portal/orgs/[tenant_id]`.

**Quick Actions grid** (`glass-card rounded-md p-6`):
- Header: "Acciones Rápidas"
- 2×2 grid of icon buttons (`rounded-md bg-slate-800/40 border border-border-dark hover:border-primary/50`):

  | Button | Icon | Action |
  |--------|------|--------|
  | Ver Entrenamientos | `fitness_center` | Navigate to trainings |
  | Ver Planes | `card_membership` | Navigate to plans |
  | Mi Perfil | `person` | Navigate to `/portal/perfil` |
  | Mis Organizaciones | `corporate_fare` | Navigate to `/portal/orgs` |

**My Subscriptions card** (`glass-card rounded-md p-6`):
- Header: "Mis Suscripciones" with status filter chips (Todas / Activas / Pendientes)
- List of subscription rows, each showing:

  | Field | Source |
  |-------|--------|
  | Plan name | `planes.nombre` (bold, secondary colour) |
  | Organization | `tenants.nombre` (text-slate-500) |
  | Status | `suscripciones.estado` (badge: emerald=activa, amber=pendiente, slate=vencida, rose=cancelada) |
  | Date range | `suscripciones.fecha_inicio` — `suscripciones.fecha_fin` |
  | Classes remaining | `clases_restantes / clases_plan` with progress indicator |
  | Payment status | Latest `pagos.estado` (badge) |

#### 3. Right Column — Activity & Featured Content (2/3 width)

**Featured Next Training card** (`glass-card rounded-md overflow-hidden flex h-56`):
- Follows the "Featured Session" pattern from the design
- Left 1/3: discipline/venue image with gradient overlay (`bg-gradient-to-r from-background-dark/80 to-transparent`)
- Right 2/3: content area with:
  - Badge: "Próximo Entrenamiento" (`gradient-brand text-[9px] font-extrabold uppercase`)
  - Training name (`text-xl font-bold`)
  - Two-column detail grid: time + duration, venue + meeting point
  - Organization name
  - CTA button: "Ver Detalles" (`gradient-brand` button)
- If no upcoming training, show an empty state with motivational message

**Upcoming Trainings list** (`glass-card rounded-md p-6`):
- Header: "Próximos Entrenamientos" with "Ver todos" link
- Activity-row pattern: horizontal cards with left icon/image, content, and right metadata
- Up to 5 next sessions (ordered by `fecha_hora ASC`):

  | Field | Source |
  |-------|--------|
  | Discipline icon | Material icon based on discipline or fallback `exercise` |
  | Training name | `entrenamientos.nombre` (bold, secondary colour) |
  | Date & time | `entrenamientos.fecha_hora` formatted as "Mar, 4 mar · 6:00 PM · 90min" |
  | Venue | `escenarios.nombre` with `location_on` icon |
  | Meeting point | `entrenamientos.punto_encuentro` |
  | Organization | `tenants.nombre` (text-slate-500) |
  | Booking status | `reservas.estado` badge (emerald=confirmada, amber=pendiente) |

  Each row links to the training detail within the corresponding tenant context.

**Pending Payments alert** (conditional — only shown when pending payments exist):
- Amber-themed `glass-card` with `bg-yellow-500/20 border-yellow-500/30`
- Icon: `payments` in amber
- Count of pending payments + total amount
- "Revisar Pagos" CTA button
- Links to the relevant subscription/payment detail
- Hidden entirely when there are no pending payments

---

## Database Schema (reference)

### Cross-tenant queries used by this feature

All queries filter by `auth.uid()` (the authenticated user). No tenant-scoping filter is needed — the dashboard aggregates across all tenants.

#### Subscriptions
```sql
SELECT s.*, p.nombre AS plan_nombre, t.nombre AS org_nombre, t.logo_url AS org_logo
FROM suscripciones s
JOIN planes p ON p.id = s.plan_id
JOIN tenants t ON t.id = s.tenant_id
WHERE s.atleta_id = auth.uid()
  AND s.estado IN ('activa', 'pendiente')
ORDER BY s.created_at DESC;
```

#### Upcoming Trainings (via Reservas)
```sql
SELECT e.nombre, e.fecha_hora, e.punto_encuentro,
       d.nombre AS disciplina_nombre,
       esc.nombre AS escenario_nombre,
       t.nombre AS org_nombre,
       r.estado AS reserva_estado, r.id AS reserva_id
FROM reservas r
JOIN entrenamientos e ON e.id = r.entrenamiento_id
JOIN tenants t ON t.id = e.tenant_id
LEFT JOIN disciplinas d ON d.id = e.disciplina_id
LEFT JOIN escenarios esc ON esc.id = e.escenario_id
WHERE r.atleta_id = auth.uid()
  AND e.fecha_hora >= now()
  AND r.estado IN ('pendiente', 'confirmada')
ORDER BY e.fecha_hora ASC
LIMIT 5;
```

#### Pending Payments
```sql
SELECT pg.*, s.plan_id, pl.nombre AS plan_nombre, t.nombre AS org_nombre
FROM pagos pg
JOIN suscripciones s ON s.id = pg.suscripcion_id
JOIN planes pl ON pl.id = s.plan_id
JOIN tenants t ON t.id = pg.tenant_id
WHERE s.atleta_id = auth.uid()
  AND pg.estado = 'pendiente';
```

#### Memberships
```sql
SELECT mt.tenant_id, t.nombre AS org_nombre, t.logo_url AS org_logo,
       r.nombre AS rol_nombre
FROM miembros_tenant mt
JOIN tenants t ON t.id = mt.tenant_id
JOIN roles r ON r.id = mt.rol_id
WHERE mt.usuario_id = auth.uid();
```

---

## RLS / Access-Control Analysis

No new RLS policies are required. Existing policies already support the cross-tenant queries:

| Table | Existing SELECT Policy | Cross-tenant? |
|-------|----------------------|---------------|
| `suscripciones` | `atleta_id = auth.uid()` | ✅ Yes — no tenant filter |
| `pagos` | `suscripcion_id IN (SELECT id FROM suscripciones WHERE atleta_id = auth.uid())` | ✅ Yes — via suscripcion ownership |
| `reservas` | `EXISTS (miembros_tenant WHERE tenant_id = reservas.tenant_id AND usuario_id = auth.uid())` | ✅ Yes — user is member of each tenant where they have reservas |
| `entrenamientos` | Visibility + tenant membership | ✅ Yes — accessed via JOIN with reservas (user's own bookings) |
| `miembros_tenant` | User can SELECT own rows | ✅ Yes |
| `tenants` | Authenticated can SELECT | ✅ Yes |
| `planes` | Authenticated can SELECT within tenant | ✅ Yes — via JOIN |
| `disciplinas` | Authenticated can SELECT within tenant | ✅ Yes — via JOIN |
| `escenarios` | Authenticated can SELECT within tenant | ✅ Yes — via JOIN |

---

## Routing & Navigation Changes

### New route
```
/portal/inicio → src/app/portal/inicio/page.tsx
```

### Bootstrap redirect change
Update `src/app/portal/bootstrap/route.ts` to redirect to `/portal/inicio` instead of `/portal/orgs`:
```typescript
// BEFORE
const nextPath = nextParam?.startsWith('/') ? nextParam : '/portal/orgs';

// AFTER
const nextPath = nextParam?.startsWith('/') ? nextParam : '/portal/inicio';
```

### Portal layout redirect change
Update `src/app/portal/layout.tsx` to redirect unauthenticated users to `/portal/inicio` after login:
```typescript
// BEFORE
redirect('/portal/bootstrap?next=/portal/orgs');

// AFTER
redirect('/portal/bootstrap?next=/portal/inicio');
```

### Navigation menu update
Add "Inicio" as the first item in the global portal navigation, before "Organizaciones Disponibles":

```typescript
// src/types/portal.types.ts — update BASE menu
const INICIO_MENU_ITEM: MenuItem = {
  label: 'Inicio',
  href: '/portal/inicio',
  icon: 'home',
};
```

The menu order should be: **Inicio** → Organizaciones Disponibles → (tenant-scoped items when inside a tenant).

---

## Expected Results

1. After logging in, the user is redirected to `/portal/inicio` (not `/portal/orgs`).
2. The dashboard layout matches the card-based design in `projectspec/designs/12_user_home.html` — glassmorphism cards, dark navy background, turquoise/secondary accents, Material Symbols icons.
3. **Stats cards row** (4 columns on md+) shows correct counts for active subscriptions, upcoming trainings, pending payments, and organization memberships — aggregated across all tenants. Each card has a coloured icon container, uppercase label, and bold number.
4. **Featured next training card** displays the soonest upcoming session in a hero-style card with image (left 1/3), gradient overlay, training name, time, venue, meeting point, org name, and a "Ver Detalles" CTA button.
5. **Upcoming trainings list** shows the next 5 sessions in activity-row cards with discipline icon, training name, formatted date/time, venue, organization, and booking status badge.
6. **My subscriptions card** (left column) lists active and pending subscriptions with plan name, organization, status badge, date range, classes remaining with progress indicator, and payment status badge.
7. **My organizations card** (left column) shows compact rows with org logo, name, and role badge. Each row links to `/portal/orgs/[tenant_id]`.
8. **Quick actions grid** provides 2×2 navigation shortcuts (Entrenamientos, Planes, Perfil, Organizaciones) with icon buttons and hover effects.
9. **Pending payments alert** (amber-themed card) appears only when pending payments exist, showing count, total amount, and CTA.
10. All data is fetched server-side in a single page load (Server Component pattern) with parallel `Promise.all()`.
11. Each training row links to the tenant-scoped training page.
12. The "Inicio" link appears as the first item in the portal navigation menu.
13. `/portal/page.tsx` remains a separate file (placeholder or simple redirect to `/portal/inicio`), keeping the `/portal` root free for future use.
14. Empty states are handled gracefully with appropriate icons and messages (e.g., "No tienes entrenamientos próximos", "No tienes suscripciones activas").
15. Responsive layout: single column on mobile, two-column on tablet, full 3-column grid on desktop.

---

## Files to Create / Modify

### Route (Delivery Layer)
```
src/app/portal/inicio/page.tsx                    — NEW: Server Component, fetches data and renders InicioPage
```

### Presentation Layer
```
src/components/portal/inicio/
  ├── InicioPage.tsx                               — NEW: Main dashboard layout (3-col grid, receives all data as props)
  ├── InicioStatsCards.tsx                         — NEW: Four glass-card stat cards row (md:grid-cols-4)
  ├── InicioFeaturedTraining.tsx                   — NEW: Hero card for next upcoming training (image + gradient overlay + details)
  ├── InicioProximosEntrenamientos.tsx             — NEW: Activity-row list of upcoming trainings (max 5)
  ├── InicioSuscripciones.tsx                      — NEW: Subscriptions card with status badges and progress indicators
  ├── InicioPagosPendientesAlert.tsx               — NEW: Conditional amber alert card for pending payments
  ├── InicioOrganizaciones.tsx                     — NEW: Compact org membership rows with logos and role badges
  ├── InicioQuickActions.tsx                       — NEW: 2×2 grid of navigation shortcut buttons
  └── index.ts                                     — NEW: Barrel exports
```

### Application Layer (Hooks)
```
src/hooks/portal/inicio/
  └── useInicio.ts                                 — NEW: (optional, for any client-side interactivity)
```

> **Note:** Since the page is primarily a Server Component, most data fetching happens in `page.tsx`. A client hook is only needed if there's interactive filtering or refresh logic.

### Infrastructure Layer (Service)
```
src/services/supabase/portal/inicio.service.ts     — NEW: Cross-tenant data fetching for dashboard
```
Exports:
- `fetchMisSuscripciones(supabase, userId)` — returns active/pending subscriptions with plan and org info.
- `fetchProximosEntrenamientos(supabase, userId, limit?)` — returns upcoming training sessions via reservas with joins.
- `fetchPagosPendientes(supabase, userId)` — returns pending payments with plan and org info.
- `fetchMisMembresias(supabase, userId)` — returns tenant memberships with org and role info.
- `fetchInicioStats(supabase, userId)` — returns aggregated counts for all four KPI cards.

### Domain Layer (Types)
```
src/types/portal/inicio.types.ts                   — NEW: View model interfaces
```
Key interfaces:
```ts
export interface InicioStats {
  suscripcionesActivas: number;
  proximosEntrenamientos: number;
  pagosPendientes: number;
  organizaciones: number;
}

export interface InicioEntrenamiento {
  id: string;
  nombre: string;
  fecha_hora: string;
  disciplina_nombre: string | null;
  escenario_nombre: string | null;
  punto_encuentro: string | null;
  org_nombre: string;
  tenant_id: string;
  reserva_id: string;
  reserva_estado: string;
}

export interface InicioSuscripcion {
  id: string;
  tenant_id: string;
  plan_nombre: string;
  org_nombre: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  pago_estado: string | null;
}

export interface InicioPagoPendiente {
  id: string;
  monto: number;
  metodo_pago: string | null;
  plan_nombre: string;
  org_nombre: string;
  fecha_pago: string | null;
}

export interface InicioMembresia {
  tenant_id: string;
  org_nombre: string;
  org_logo: string | null;
  rol_nombre: string;
}

export interface InicioDashboardData {
  stats: InicioStats;
  proximosEntrenamientos: InicioEntrenamiento[];
  suscripciones: InicioSuscripcion[];
  pagosPendientes: InicioPagoPendiente[];
  membresias: InicioMembresia[];
}
```

### Files to Modify
```
src/app/portal/bootstrap/route.ts                  — MODIFY: Change default redirect from '/portal/orgs' to '/portal/inicio'
src/app/portal/layout.tsx                          — MODIFY: Change bootstrap redirect target from '/portal/orgs' to '/portal/inicio'
src/types/portal.types.ts                          — MODIFY: Add 'Inicio' menu item before 'Organizaciones Disponibles'
src/app/portal/page.tsx                            — MODIFY: Redirect to '/portal/inicio' instead of showing placeholder
```

### No Migration Needed
No new database tables, columns, or RLS policies are required. All data is accessible through existing schema and policies.

---

## Steps to Consider the Story Complete

- [ ] Route `/portal/inicio/page.tsx` created as a Server Component that fetches dashboard data via `inicio.service.ts`.
- [ ] `InicioPage` component implements the 3-column grid layout matching the design in `projectspec/designs/12_user_home.html`.
- [ ] All glass-card components use the glassmorphism pattern: `bg-[rgba(15,23,42,0.4)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.05)]`.
- [ ] `InicioStatsCards` renders four stat cards in a `md:grid-cols-4` row with coloured icon containers, uppercase labels, and bold numbers.
- [ ] `InicioFeaturedTraining` renders a hero card with background image (left 1/3), gradient overlay, and training details (right 2/3) with `gradient-brand` CTA button.
- [ ] `InicioProximosEntrenamientos` renders activity-row cards with discipline icons, training info, and booking status badges.
- [ ] `InicioSuscripciones` renders subscription rows with plan name, org, status badge, dates, class progress, and payment status.
- [ ] `InicioOrganizaciones` renders compact org rows with logos and role badges, each linking to `/portal/orgs/[tenant_id]`.
- [ ] `InicioQuickActions` renders a 2×2 grid of navigation buttons with icon + label and hover effects.
- [ ] `InicioPagosPendientesAlert` renders an amber-themed alert only when pending payments exist, hidden otherwise.
- [ ] `inicio.service.ts` implements all five fetch functions with correct cross-tenant queries.
- [ ] `inicio.types.ts` defines all view model interfaces.
- [ ] Bootstrap route redirects to `/portal/inicio` by default.
- [ ] Portal layout redirect targets updated to `/portal/inicio`.
- [ ] `/portal/page.tsx` either redirects to `/portal/inicio` or remains as a minimal placeholder that does not interfere.
- [ ] "Inicio" appears as the first item in the portal navigation menu with a `home` icon.
- [ ] Training rows link correctly to the tenant-scoped training page.
- [ ] Empty states are displayed for each section with appropriate icons and messages.
- [ ] All new files follow the project's feature slice convention and hexagonal architecture.
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`).
- [ ] Responsive layout verified: single column (mobile) → two columns (tablet) → full 3-column grid (desktop).

---

## Non-Functional Requirements

### Security
- All data is fetched server-side using the authenticated Supabase server client — no client-side data fetching for the initial load.
- The user's identity comes from `supabase.auth.getUser()`, never from URL parameters or cookies.
- No user ID is exposed in the URL.
- RLS policies enforce that only the user's own data is returned from every query.

### Performance
- All dashboard data should be fetched in **parallel** using `Promise.all()` from the Server Component to minimize total load time.
- Each query should execute in under 100ms for typical data volumes (< 50 subscriptions, < 100 reservas per user).
- No N+1 query patterns — all data fetched through joined queries.
- Consider adding database indexes on `suscripciones(atleta_id)`, `reservas(atleta_id)`, and `pagos(suscripcion_id)` if not already present.

### UX / Accessibility
- **Visual design must match** the reference mockup in `projectspec/designs/12_user_home.html` — glassmorphism cards, dark navy background, turquoise/secondary accents, Material Symbols Outlined icons, hover effects with subtle lifts and border highlights.
- **Glass card pattern**: `background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.05);` (CSS class `glass-card`).
- **Stat card hover**: `hover:translate-y-[-2px] transition-all duration-300`.
- **Activity row hover**: `border border-transparent hover:border-primary/20 transition-all`.
- **Featured card image**: `bg-cover bg-center` with `transition-transform duration-700 group-hover:scale-110` zoom effect.
- **Gradient brand** for CTA buttons: `background: linear-gradient(135deg, #00f5d4 0%, #00d4ff 100%);`.
- Badge colours: pending → amber, active/confirmed → emerald, cancelled/expired → slate, rejected → rose.
- All interactive elements must have `aria-label` attributes.
- Responsive layout: `grid-cols-1` (mobile) → `md:grid-cols-2` (tablet) → `lg:grid-cols-3` (desktop) for the main content area; `grid-cols-1 md:grid-cols-4` for stats row.
- Loading state: show skeleton cards while data loads (consistent with `portal/loading.tsx` pattern).
- Icons: use Material Symbols Outlined (already loaded in the project) — e.g., `card_membership`, `directions_run`, `payments`, `corporate_fare`, `schedule`, `location_on`, `fitness_center`, `person`.
