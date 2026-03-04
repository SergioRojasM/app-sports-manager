# US-0020 — Manage Subscription Requests (Admin)

## ID
`us0020`

## Name
Admin Subscription Management — View, Filter, and Validate Member Subscriptions and Payments

## As a
Portal administrator of an organization

## I Want
A dedicated **Subscription Management** module (`gestion-suscripciones`) inside the admin area of the portal where I can see every subscription request submitted by athletes, inspect its linked payment, and approve or reject both the subscription status and the payment status individually.

## So That
I can maintain control over who becomes an active member of the organization, ensure payments have been properly verified before activating access, and have a real-time overview of pending work (subscriptions to approve and payments to validate).

---

## Description

### Context
US-0019 introduced the athlete self-service flow where athletes can subscribe to a plan and register their payment. The data is persisted in the `public.suscripciones` and `public.pagos` Supabase tables. After US-0019 there is no administrator-side interface to manage those requests.

This story creates the full admin-facing module `gestion-suscripciones` as a first-class feature slice, following exactly the same architectural layers as `gestion-equipo` and `planes`. It must be placed under the `(administrador)` route group and therefore be invisible to athletes and coaches.

### Feature Overview

1. **Stats cards** — at the top of the page, show three summary counters:
   - Active subscriptions (`suscripciones.estado = 'activa'`)
   - Pending subscriptions (`suscripciones.estado = 'pendiente'`)
   - Subscriptions with a pending payment (`pagos.estado = 'pendiente'` linked to any `suscripcion_id` in current tenant)

2. **Search bar & quick filters** — above the table:
   - Free-text search over the athlete's full name, plan name, and subscription `id` (partial UUID).
   - Quick-filter chips for `suscripciones.estado`: All / Pending / Active / Expired / Cancelled.
   - Quick-filter chips for `pagos.estado`: All / Pending / Validated / Rejected.

3. **Subscriptions table** — each row displays:

   | Column | Source |
   |--------|--------|
   | Athlete name | `usuarios.nombre + usuarios.apellido` (join via `suscripciones.atleta_id`) |
   | Athlete email | `usuarios.email` |
   | Plan name | `planes.nombre` (join via `suscripciones.plan_id`) |
   | Subscription status | `suscripciones.estado` (badge) |
   | Start / End dates | `suscripciones.fecha_inicio`, `suscripciones.fecha_fin` |
   | Classes remaining | `suscripciones.clases_restantes` |
   | Payment status | latest `pagos.estado` for that subscription (badge) |
   | Payment method | `pagos.metodo_pago` |
   | Payment amount | `pagos.monto` |
   | Request date | `suscripciones.created_at` |
   | Actions | "Validate Payment" button · "Validate Subscription" button |

4. **Validation modal** — opened by either action button. Shows:
   - Full subscription details (all fields from `suscripciones` + athlete info + plan info).
   - Full payment details (all fields from `pagos` including `comprobante_url` as a clickable link).
   - Approve button + Cancel/Reject button.
   - When **Approve Payment** is submitted → updates `pagos.estado = 'validado'`, sets `pagos.validado_por = currentUser.id` and `pagos.fecha_validacion = now()`.
   - When **Reject Payment** is submitted → updates `pagos.estado = 'rechazado'`.
   - When **Approve Subscription** is submitted → updates `suscripciones.estado = 'activa'`, sets `suscripciones.fecha_inicio` if null (today), calculates `suscripciones.fecha_fin` from plan duration if null, sets `suscripciones.clases_restantes = suscripciones.clases_plan` if null.
   - When **Cancel Subscription** is submitted → updates `suscripciones.estado = 'cancelada'`.

---

## Database Schema (reference)

### `public.suscripciones` (after US-0019 migration)
```
id               uuid PK
tenant_id        uuid FK → tenants
atleta_id        uuid FK → usuarios
plan_id          uuid FK → planes
fecha_inicio     date
fecha_fin        date
clases_restantes integer
clases_plan      integer          -- snapshot of plan.clases_incluidas at subscription time
estado           varchar(30)      -- 'pendiente' | 'activa' | 'vencida' | 'cancelada'
comentarios      text
created_at       timestamptz
```

### `public.pagos`
```
id                uuid PK
tenant_id         uuid FK → tenants
suscripcion_id    uuid FK → suscripciones
monto             numeric(10,2)
metodo_pago       varchar(50)      -- 'transferencia' | 'efectivo' | 'tarjeta'
comprobante_url   varchar(500)
estado            varchar(30)      -- 'pendiente' | 'validado' | 'rechazado'
validado_por      uuid FK → usuarios
fecha_pago        timestamptz
fecha_validacion  timestamptz
created_at        timestamptz
```

---

## RLS / Access-Control Changes

A new Supabase migration must add the following policies:

1. **Admin SELECT on `suscripciones`** — admins of a tenant can read all subscriptions belonging to their tenant.
2. **Admin UPDATE on `suscripciones`** — admins can update `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes` for subscriptions of their tenant.
3. **Admin SELECT on `pagos`** — admins can read all payments belonging to their tenant.
4. **Admin UPDATE on `pagos`** — admins can update `estado`, `validado_por`, `fecha_validacion` for payments of their tenant.

Helper used in all admin RLS policies:
```sql
exists (
  select 1 from public.miembros_tenant
  where miembros_tenant.tenant_id = <table>.tenant_id
    and miembros_tenant.user_id = auth.uid()
    and miembros_tenant.rol = 'administrador'
    and miembros_tenant.estado = 'activo'
)
```

Migration file name: `20260305000100_gestion_suscripciones_admin_rls.sql`

---

## Expected Results

1. A session logged in as an **administrator** can navigate to `gestion-suscripciones` from the sidebar.
2. **Athletes and coaches cannot access** the module. Attempting to access the URL directly returns the role-based redirect.
3. The stats cards update in real time after any modal approval/rejection action.
4. All three filter dimensions (text search, subscription status chip, payment status chip) work in combination without requiring a page reload.
5. Approving a payment sets `pagos.estado = 'validado'`, `validado_por`, and `fecha_validacion` correctly in the database.
6. Approving a subscription sets `suscripciones.estado = 'activa'` and populates date/class fields when not yet set.
7. Rejecting/cancelling actions set the correct `rejected`/`cancelada` states.
8. After any modal action the table row updates its badge immediately (optimistic update or refetch).

---

## Files to Create / Modify

### New Migration
```
supabase/migrations/20260305000100_gestion_suscripciones_admin_rls.sql
```

### Route (Delivery Layer)
```
src/app/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones/page.tsx
```

### Presentation Layer
```
src/components/portal/gestion-suscripciones/
  ├── GestionSuscripcionesPage.tsx       # Main page component (mirrors PlanesPage.tsx structure)
  ├── SuscripcionesStatsCards.tsx        # Three summary KPI cards
  ├── SuscripcionesHeaderFilters.tsx     # Search input + quick-filter chips
  ├── SuscripcionesTable.tsx             # Data table with action buttons per row
  ├── ValidarSuscripcionModal.tsx        # Modal for approve/cancel subscription
  ├── ValidarPagoModal.tsx               # Modal for approve/reject payment
  ├── SuscripcionEstadoBadge.tsx         # Badge: pendiente | activa | vencida | cancelada
  ├── PagoEstadoBadge.tsx                # Badge: pendiente | validado | rechazado
  └── index.ts                           # Barrel exports
```

### Application Layer (Hooks)
```
src/hooks/portal/gestion-suscripciones/
  ├── useGestionSuscripciones.ts         # Main list hook: fetch, filter, search, stats
  ├── useValidarSuscripcion.ts           # Approve / cancel subscription action hook
  └── useValidarPago.ts                  # Approve / reject payment action hook
```

### Infrastructure Layer (Service)
```
src/services/supabase/portal/gestion-suscripciones.service.ts
```
Exports:
- `fetchSuscripcionesAdmin(tenantId)` — joins `suscripciones` ← `usuarios` (atleta), `planes`, `pagos` (latest). Returns `SuscripcionAdminRow[]`.
- `updateSuscripcionEstado(id, estado, extra?)` — PATCH `suscripciones`.
- `updatePagoEstado(id, estado, validadoPor, fechaValidacion?)` — PATCH `pagos`.

### Domain Layer (Types)
```
src/types/portal/gestion-suscripciones.types.ts
```
Key interfaces:
```ts
export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';
export type PagoEstado = 'pendiente' | 'validado' | 'rechazado';
export type MetodoPago = 'transferencia' | 'efectivo' | 'tarjeta';

export interface PagoAdminRow {
  id: string;
  monto: number;
  metodo_pago: MetodoPago | null;
  comprobante_url: string | null;
  estado: PagoEstado;
  validado_por: string | null;
  fecha_pago: string | null;
  fecha_validacion: string | null;
  created_at: string;
}

export interface SuscripcionAdminRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_nombre: string;
  atleta_id: string;
  atleta_nombre: string;
  atleta_email: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  estado: SuscripcionEstado;
  comentarios: string | null;
  created_at: string;
  pago: PagoAdminRow | null;
}

export interface SuscripcionesAdminStats {
  activas: number;
  pendientes: number;
  pagoPendiente: number;
}
```

### Navigation Update
```
src/components/portal/RoleBasedMenu.tsx   — add 'gestion-suscripciones' entry under administrador role
```

---

## Steps to Consider the Story Complete

- [ ] Migration file created, applied locally (`supabase db push`), and verified that an admin user can SELECT and UPDATE both tables while an athlete's RLS policies remain unchanged.
- [ ] Route page `gestion-suscripciones/page.tsx` renders `GestionSuscripcionesPage` with the correct `tenantId` prop.
- [ ] Stats cards show accurate counts derived from real Supabase data.
- [ ] Full-text search filters table rows client-side (no extra DB call) by athlete name, plan name, or subscription ID.
- [ ] Subscription status and payment status chips work as independent AND-combined filters.
- [ ] Table displays all required columns with correct badge colours.
- [ ] "Validate Payment" opens `ValidarPagoModal` pre-populated with all subscription + payment detail.
- [ ] Approving a payment writes correct DB values and refreshes the table row.
- [ ] Rejecting a payment writes `rechazado` state and refreshes.
- [ ] "Validate Subscription" opens `ValidarSuscripcionModal`.
- [ ] Approving a subscription activates it and backfills missing date/class fields.
- [ ] Cancelling a subscription writes `cancelada` state.
- [ ] An athlete or coach session cannot navigate to the module (redirect enforced by role gate in `[tenant_id]/layout.tsx`).
- [ ] `RoleBasedMenu` shows the Subscriptions link only to administrators.
- [ ] All new modules are exported from their `index.ts` barrel files.

---

## Non-Functional Requirements

### Security
- All data mutations go through Supabase RLS; no server action bypasses policies.
- `validado_por` is always set to `auth.uid()` server-side (service layer), never from unchecked client input.
- The route page must be inside the `(administrador)` route group so Next.js layout role gate enforces access before any component renders.

### Performance
- Initial page load should fetch all subscriptions in a **single joined query** (no N+1 per-row pagos fetch).
- Stats calculation should be derived from the already-fetched array on the client to avoid a second round-trip.
- Table rows should be limited to the current tenant scope; index `idx_suscripciones_tenant_id` guarantees sub-100 ms response for typical organization sizes.

### UX / Accessibility
- Badge colours must be consistent with the design system: pending → amber, active → emerald, expired/cancelled → slate, validated → emerald, rejected → rose.
- All action buttons must have accessible `aria-label` attributes.
- Modal must trap focus and be dismissible with Escape key (standard `ui/` dialog behaviour).
- Loading and empty states must follow the same glass-panel pattern used in `PlanesPage.tsx`.
