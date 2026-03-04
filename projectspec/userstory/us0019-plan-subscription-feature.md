# User Story

## Title
Plan Membership Subscription Feature

## ID
US-0019

## Name
Plan Membership Subscription Feature

## As a
Authenticated user with role **usuario** or **entrenador** within a tenant

## I Want
To view the tenant's membership plans and, if I am a **usuario**, to submit a subscription request for a plan by providing a payment proof comment — so that the administrator can later review and approve my subscription.

## So That
Users can self-initiate the plan enrollment process without requiring manual administrator data entry, while entrenadores maintain read-only visibility into available plans.

---

## Description

### Context

The `gestion-planes` module currently exists exclusively under the `(administrador)` Next.js route group at `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`. Administrators can create, edit, and delete plans. No other role has access to this module.

Because Next.js route groups (`(group)`) are transparent in the URL, `(administrador)/gestion-planes` and `(shared)/gestion-planes` would resolve to the same path `/portal/orgs/[tenant_id]/gestion-planes` — coexisting is not possible. Therefore, this US **replaces** the admin-only route with a single unified route under `(shared)`.

This US makes the following changes:

1. **Delete** `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`.
2. **Create** `src/app/portal/orgs/[tenant_id]/(shared)/gestion-planes/page.tsx` as the single route for all roles. The page reads the authenticated user's role and renders the appropriate role-aware component.
3. The role-aware page component (`PlanesRolePage`) delegates rendering:
   - **administrador** → existing `<PlanesPage>` (full CRUD, no changes to existing component).
   - **entrenador** / **usuario** → new `<PlanesViewPage>` (read-only, with "Adquirir" for `usuario` only).
4. Adding an **"Adquirir" action** exclusively for the `usuario` role that opens a confirmation modal where the user submits:
   - **Comentarios** (optional free-text note).
   - **Comprobante de pago** (file upload — UI component and validation only; Supabase Storage integration is **out of scope** for this US; the URL field is stored as `null` or a placeholder).
5. On modal confirmation:
   - Creating a record in `public.suscripciones` with `estado = 'pendiente'`.
   - Creating a linked record in `public.pagos` with `estado = 'pendiente'`.
6. Adding a new column **`clases_plan`** to `public.suscripciones` to capture the number of classes included in the subscribed plan at the moment of enrollment (snapshot value, so it remains immutable even if the plan changes later). This value is compared against `clases_restantes` to track plan consumption.
7. Updating the navigation menu so **all three roles** (`administrador`, `usuario`, `entrenador`) have a **"Planes"** entry in `ROLE_TENANT_ITEMS` pointing to `gestion-planes`.

### Functional Scope

| Role          | See plan list | Adquirir action | Create / Edit / Delete |
|---------------|:-------------:|:---------------:|:----------------------:|
| administrador | ✅            | ❌              | ✅                     |
| entrenador    | ✅            | ❌              | ❌                     |
| usuario       | ✅            | ✅              | ❌                     |

### Out of Scope (this US)
- Supabase Storage upload and signed-URL persistence for `comprobante_url`.
- Administrator approval / rejection of subscriptions and payments.
- Subscription status lifecycle transitions (activa, vencida, cancelada).

---

## Database Changes

### 1. Alter `public.suscripciones` — add `clases_plan` column

```sql
alter table public.suscripciones
  add column if not exists clases_plan integer
    constraint suscripciones_clases_plan_ck check (clases_plan is null or clases_plan >= 0);
```

**Purpose:** Snapshot of `planes.clases_incluidas` at subscription time. Allows comparing how many classes were originally included (`clases_plan`) versus how many remain (`clases_restantes`).

### 2. Alter `public.suscripciones` — add `'pendiente'` to estado constraint

The current check constraint only allows `('activa', 'vencida', 'cancelada')`. A new `'pendiente'` state is required to represent a subscription awaiting administrator approval.

```sql
alter table public.suscripciones
  drop constraint if exists suscripciones_estado_ck;

alter table public.suscripciones
  add constraint suscripciones_estado_ck
    check (estado in ('pendiente', 'activa', 'vencida', 'cancelada'));
```

### 3. Add `comentarios` column to `public.suscripciones` (optional)

```sql
alter table public.suscripciones
  add column if not exists comentarios text;
```

Stores the user's free-text comment provided during the subscription request.

### 4. RLS policies for `suscripciones` — allow authenticated users to INSERT their own

```sql
grant insert on table public.suscripciones to authenticated;

drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
  for insert to authenticated
  with check (atleta_id = auth.uid());
```

### 5. RLS policies for `suscripciones` — allow users to SELECT their own

```sql
grant select on table public.suscripciones to authenticated;

drop policy if exists suscripciones_select_own on public.suscripciones;
create policy suscripciones_select_own on public.suscripciones
  for select to authenticated
  using (atleta_id = auth.uid());
```

> **Note:** Administrators will need a broader SELECT policy in a future US; for now only own-record visibility is required.

### 6. RLS policies for `pagos` — allow authenticated users to INSERT their own payment

```sql
grant insert on table public.pagos to authenticated;

drop policy if exists pagos_insert_own on public.pagos;
create policy pagos_insert_own on public.pagos
  for insert to authenticated
  with check (
    suscripcion_id in (
      select id from public.suscripciones where atleta_id = auth.uid()
    )
  );
```

### Table Snapshots (Relevant Columns After This US)

**`suscripciones`**

| Column            | Type        | Notes                                              |
|-------------------|-------------|----------------------------------------------------|
| id                | uuid PK     |                                                    |
| tenant_id         | uuid FK     |                                                    |
| atleta_id         | uuid FK     | References `usuarios.id`                           |
| plan_id           | uuid FK     | References `planes.id`                             |
| fecha_inicio      | date        | null until admin approves                          |
| fecha_fin         | date        | null until admin approves                          |
| clases_restantes  | integer     | null until admin approves                          |
| **clases_plan**   | integer     | **NEW** — snapshot of plan's `clases_incluidas`    |
| **comentarios**   | text        | **NEW** — user comment at subscription request     |
| estado            | varchar(30) | `'pendiente'` *(new)* \| activa \| vencida \| cancelada |
| created_at        | timestamptz |                                                    |

**`pagos`**

| Column           | Type         | Notes                                     |
|------------------|--------------|-------------------------------------------|
| id               | uuid PK      |                                           |
| tenant_id        | uuid FK      |                                           |
| suscripcion_id   | uuid FK      |                                           |
| monto            | numeric(10,2)| Taken from `planes.precio`               |
| metodo_pago      | varchar(50)  | null (TBD by user or admin)              |
| comprobante_url  | varchar(500) | null (Storage integration out of scope)  |
| estado           | varchar(30)  | `'pendiente'`                             |
| validado_por     | uuid         | null                                     |
| fecha_pago       | timestamptz  | null                                     |
| fecha_validacion | timestamptz  | null                                     |
| created_at       | timestamptz  |                                           |

---

## Expected Results

1. Users with role `usuario` see a **"Planes"** menu entry in the tenant sidebar and can open the plan catalogue.
2. Users with role `entrenador` see the same **"Planes"** menu entry and can browse plans, but no action buttons are displayed.
3. The plan catalogue shows all **active** plans for the tenant (same data currently shown to admins, without create/edit/delete controls).
4. For `usuario`, each plan card/row has an **"Adquirir"** button.
5. Clicking "Adquirir" opens a **SuscripcionModal** with:
   - Plan summary (name, price, validity, included classes).
   - Textarea for **Comentarios** (optional).
   - File input for **Comprobante de pago** (read and display filename only; upload is out of scope).
   - **Confirmar** and **Cancelar** buttons.
6. On "Confirmar":
   - A `suscripciones` record is inserted with `estado = 'pendiente'`, `clases_plan = plan.clases_incluidas`, `atleta_id = auth.uid()`.
   - A `pagos` record is inserted linked to the new subscription with `estado = 'pendiente'`, `monto = plan.precio`.
   - The modal closes and a success toast/banner is shown: _"Solicitud enviada. El administrador revisará tu suscripción."_
7. If the insert fails, an inline error message is shown inside the modal without closing it.
8. Administrators navigate to the same URL `/portal/orgs/[tenant_id]/gestion-planes` (now served by the `(shared)` route) and see the full CRUD view exactly as before — the route migration is transparent to them.

---

## Files to Create / Modify

### New Migration

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_suscripciones_planes_feature.sql` | Add `clases_plan`, `comentarios` columns; update `estado` constraint; add RLS for suscripciones and pagos INSERT/SELECT |

### Route Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx` | **Delete** | Replaced by unified shared route. |
| `src/app/portal/orgs/[tenant_id]/(shared)/gestion-planes/page.tsx` | **Create** | Single route for all roles. Reads `tenant_id` from params and `role` from the server-side session/profile cookie. Renders `<PlanesPage>` for `administrador` and `<PlanesViewPage>` for `usuario`/`entrenador`. |

### New / Modified Components

| File | Action | Purpose |
|------|--------|---------|
| `src/components/portal/planes/PlanesViewPage.tsx` | **Create** | Read-only plan list for `usuario` and `entrenador`. Accepts `tenantId: string` and `role: UserRole` props. Does not render create/edit/delete controls. Reuses `<PlanesTable readOnly>`. Renders "Adquirir" button per row for `usuario` only. |
| `src/components/portal/planes/SuscripcionModal.tsx` | **Create** | Controlled modal for subscription request. Props: `plan`, `onConfirm(data)`, `onClose`, `isSubmitting`, `error`. Contains: plan summary, `comentarios` textarea, `comprobante` file input (display only), Confirmar/Cancelar buttons. |
| `src/components/portal/planes/PlanesTable.tsx` | **Modify** | Accept optional `readOnly?: boolean` prop. When `readOnly=true`, hide the Actions column (edit/delete buttons). |

### New / Modified Hooks

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/portal/planes/usePlanesView.ts` | **Create** | Fetches active plans for a tenant (read-only, no mutations). Returns `{ loading, error, planes, disciplines }`. Reuses `PlanesService.listPlans`. |
| `src/hooks/portal/planes/useSuscripcion.ts` | **Create** | Handles subscription request flow. Exposes `{ modalOpen, selectedPlan, openModal(plan), closeModal(), submit(data), isSubmitting, error, successMessage }`. Calls `SuscripcionesService.createSuscripcion` and `PagosService.createPago`. |

### New / Modified Services

| File | Action | Purpose |
|------|--------|---------|
| `src/services/supabase/portal/suscripciones.service.ts` | **Create** | `createSuscripcion(payload): Promise<Suscripcion>` — inserts a `pendiente` subscription record using the browser Supabase client. |
| `src/services/supabase/portal/pagos.service.ts` | **Create** | `createPago(payload): Promise<Pago>` — inserts a `pendiente` payment record linked to the subscription. |

### Modified Navigation

| File | Action | Purpose |
|------|--------|---------|
| `src/types/portal.types.ts` | **Modify** | Add `{ label: 'Planes', path: 'gestion-planes', icon: 'card_membership' }` to `usuario` and `entrenador` arrays in `ROLE_TENANT_ITEMS`. The `administrador` entry already exists and requires no change. |
| `src/components/portal/PortalBreadcrumb.tsx` | **Verify** | `'gestion-planes': 'Planes'` entry already exists; no change needed. |

### Modified Types

| File | Action | Purpose |
|------|--------|---------|
| `src/types/portal/planes.types.ts` | **Modify** | Extend existing plane types if needed; no new types anticipated beyond reuse. |
| `src/types/portal/suscripciones.types.ts` | **Create** | Define `Suscripcion`, `SuscripcionInsert`, `SuscripcionEstado` types. |
| `src/types/portal/pagos.types.ts` | **Create** | Define `Pago`, `PagoInsert`, `PagoEstado` types. |

---

## Endpoint / Service Method Signatures

```typescript
// src/services/supabase/portal/suscripciones.service.ts
export async function createSuscripcion(payload: SuscripcionInsert): Promise<Suscripcion>

// SuscripcionInsert shape:
// {
//   tenant_id: string;
//   atleta_id: string;       // auth.uid()
//   plan_id: string;
//   clases_plan: number | null;  // snapshot from planes.clases_incluidas
//   comentarios: string | null;
//   estado: 'pendiente';
// }

// src/services/supabase/portal/pagos.service.ts
export async function createPago(payload: PagoInsert): Promise<Pago>

// PagoInsert shape:
// {
//   tenant_id: string;
//   suscripcion_id: string;
//   monto: number;           // from planes.precio
//   comprobante_url: null;   // Storage upload is out of scope
//   estado: 'pendiente';
// }
```

---

## Implementation Steps (Definition of Done)

- [ ] **1. Database Migration** — Create migration file with: `clases_plan` column, `comentarios` column, updated `estado` constraint (`'pendiente'` added), RLS INSERT policy for `suscripciones` (own record), RLS SELECT policy for `suscripciones` (own record), RLS INSERT policy for `pagos` (own record via subscription).
- [ ] **2. TypeScript Types** — Create `src/types/portal/suscripciones.types.ts` and `src/types/portal/pagos.types.ts` with all required interfaces.
- [ ] **3. Services** — Create `suscripciones.service.ts` (`createSuscripcion`) and `pagos.service.ts` (`createPago`).
- [ ] **4. Hooks** — Create `usePlanesView.ts` (read-only plan fetch) and `useSuscripcion.ts` (subscription request orchestration).
- [ ] **5. `SuscripcionModal` component** — Build modal with plan summary, comentarios textarea, comprobante file input (UI only), Confirmar/Cancelar, loading and error states.
- [ ] **6. `PlanesViewPage` component** — Read-only plan list that conditionally shows "Adquirir" buttons for `usuario` role only. Entrenadores see no action buttons.
- [ ] **7. `PlanesTable` read-only mode** — Add `readOnly?: boolean` prop; when true, hide Actions column.
- [ ] **8. Unified Shared Route** — Delete `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`. Create `src/app/portal/orgs/[tenant_id]/(shared)/gestion-planes/page.tsx` that reads the role from the server-side session and renders `<PlanesPage>` for `administrador` or `<PlanesViewPage>` for other roles.
- [ ] **9. Navigation** — Add `'Planes'` entry to `usuario` and `entrenador` in `ROLE_TENANT_ITEMS` (`src/types/portal.types.ts`). Verify the `administrador` entry still points to `gestion-planes`.
- [ ] **10. Manual QA** — Verify that: (a) admin navigates to `/gestion-planes` and sees full CRUD as before, (b) usuario can browse plans and submit a subscription request, (c) entrenador can only browse plans with no action buttons, (d) a `suscripciones` + `pagos` row in `pendiente` state appears in Supabase Studio after submission.

---

## Non-Functional Requirements

### Security
- RLS policies must prevent users from inserting subscriptions with an `atleta_id` different from `auth.uid()`.
- RLS policies must prevent users from reading other users' subscriptions.
- No server-side secrets are exposed to the client; all mutations use the browser Supabase client with the authenticated user session.
- File input for `comprobante` must validate MIME type client-side (allow `image/*` and `application/pdf` only) even though upload is out of scope.

### Performance
- Plan list query should filter `activo = true` and scope by `tenant_id` to avoid full-table scans (index `idx_planes_tenant_id` already exists).
- Subscription and payment inserts are lightweight single-row operations; no additional indexing is required beyond existing indexes on `atleta_id` and `suscripcion_id`.

### UX / Accessibility
- The "Adquirir" button must be visually distinct (primary action style) and not shown for plans that are inactive.
- The `SuscripcionModal` must be keyboard-navigable and trap focus while open (reuse existing modal pattern from `PlanFormModal` or `ReservaFormModal`).
- Success and error feedback must use accessible `role="status"` / `role="alert"` attributes consistent with the rest of the portal.
