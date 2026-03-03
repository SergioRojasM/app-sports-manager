# User Story

## Title
Subscribe to Membership Plans

## ID
US-0019

## Name
Subscription to Membership Plans

## As a
User (atleta) or Coach (entrenador) who belongs to a tenant organization

## I Want
To access the plans catalog and, as an athlete, request a membership plan subscription by filling in a confirmation form that includes optional comments and a payment proof for the administrator to verify

## So That
I can submit a complete subscription request — including my payment evidence — and the organization administrator can later review, validate the payment, and approve my membership

---

## Description

The `gestion-planes` module is currently an administrator-only feature. This story extends its visibility to `usuario` and `entrenador` roles within the same tenant, adapting the UI to reflect their permissions:

- **entrenador**: read-only access — can browse available plans but cannot create, edit, or delete them, and cannot request a subscription.
- **usuario (atleta)**: read access plus an **"Adquirir"** action per plan. Clicking it opens a multi-field confirmation modal where the athlete can add optional comments and upload a payment proof (image or PDF). On submission, two records are created:
  1. `public.suscripciones` with `estado = 'pendiente'`.
  2. `public.pagos` with `estado = 'pendiente'`, the chosen payment method, and the uploaded `comprobante_url`.

Additionally, the `suscripciones` table must be updated to:
1. Support `estado = 'pendiente'` (currently the CHECK constraint only allows `activa`, `vencida`, `cancelada`).
2. Add a `clases_plan` column (integer, nullable) that captures the number of classes included in the plan at the moment of subscription, to be compared against `clases_restantes` during the plan lifecycle.
3. Add an `observaciones` column (text, nullable) to store the athlete's comments submitted with the subscription request.

---

## Expected Results

1. **Entrenadores** can navigate to `Planes` in their role menu and see the same plan catalog as the administrator (read-only, no create/edit/delete actions).
2. **Usuarios (atletas)** can navigate to `Planes` and see each active plan with an **"Adquirir"** button.
3. Clicking **"Adquirir"** opens a modal (`SolicitarPlanModal`) with two sections:
   - **Plan summary** (read-only): name, price, duration (`vigencia_meses`), included classes.
   - **Request form**: `Método de pago` (select — required), `Observaciones` (textarea — optional), `Comprobante de pago` (file input, accepts image/PDF, max 5 MB — optional).
4. On confirmation:
   a. If a comprobante file was selected, it is uploaded to Supabase Storage bucket `comprobantes-pago` under path `{tenant_id}/{atleta_id}/{timestamp}-{filename}`.
   b. A new `suscripciones` row is created with `estado = 'pendiente'`, `clases_plan` from `planes.clases_incluidas`, `atleta_id` = current user id, `observaciones` from the form, and `fecha_inicio`/`fecha_fin` left null.
   c. A new `pagos` row is created linked to the new `suscripcion_id`, with `monto` from `planes.precio`, `metodo_pago` from the form, `comprobante_url` from the uploaded file (or null), and `estado = 'pendiente'`.
5. The UI shows a success toast and disables the "Adquirir" button for plans already in "pendiente" or "activa" state for the same athlete.
6. Attempting to subscribe to the same plan twice (while a pending/active subscription exists) is blocked at both the UI and database levels.
7. The `suscripciones` and `pagos` tables permit RLS-controlled INSERT from `usuario`-role members and SELECT for own records.

---

## Database Changes

### Migration: `supabase/migrations/20260304000200_suscripciones_subscription_request.sql`

#### 1. Add `clases_plan` and `observaciones` columns to `suscripciones`

```sql
alter table public.suscripciones
  add column if not exists clases_plan integer
    constraint suscripciones_clases_plan_ck check (clases_plan is null or clases_plan >= 0);

alter table public.suscripciones
  add column if not exists observaciones text;
```

#### 2. Update `estado` CHECK constraint to include `'pendiente'`

```sql
-- Drop existing constraint and recreate with 'pendiente' included
alter table public.suscripciones
  drop constraint if exists suscripciones_estado_ck;

alter table public.suscripciones
  add constraint suscripciones_estado_ck
    check (estado in ('pendiente', 'activa', 'vencida', 'cancelada'));
```

#### 3. RLS policies for `suscripciones`

RLS is likely already enabled (initial migration enables it globally). Add the following policies:

```sql
-- Allow authenticated users to see their own subscriptions
-- or all subscriptions within tenants where they are administrador
grant select, insert on table public.suscripciones to authenticated;

drop policy if exists suscripciones_select_own on public.suscripciones;
create policy suscripciones_select_own on public.suscripciones
  for select to authenticated
  using (
    atleta_id = (select id from public.usuarios where auth_id = auth.uid())
    or
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- Only athletes can insert their own subscription requests (pendiente)
drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
  for insert to authenticated
  with check (
    atleta_id = (select id from public.usuarios where auth_id = auth.uid())
    and estado = 'pendiente'
    and tenant_id in (
      select tenant_id from public.miembros_tenant
      where usuario_id = (select id from public.usuarios where auth_id = auth.uid())
    )
  );
```

#### 4. RLS policies for `pagos`

The `pagos` table is already defined in the initial migration. Add INSERT and SELECT policies so athletes can create payment records linked to their own subscriptions:

```sql
grant select, insert on table public.pagos to authenticated;

-- Athletes and admins can read payments
drop policy if exists pagos_select_own on public.pagos;
create policy pagos_select_own on public.pagos
  for select to authenticated
  using (
    suscripcion_id in (
      select id from public.suscripciones
      where atleta_id = (select id from public.usuarios where auth_id = auth.uid())
    )
    or
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- Athletes can insert payments only for their own pending subscriptions
drop policy if exists pagos_insert_own on public.pagos;
create policy pagos_insert_own on public.pagos
  for insert to authenticated
  with check (
    estado = 'pendiente'
    and suscripcion_id in (
      select id from public.suscripciones
      where atleta_id = (select id from public.usuarios where auth_id = auth.uid())
        and estado = 'pendiente'
    )
  );
```

#### 5. Supabase Storage — payment proof bucket

Create a private bucket `comprobantes-pago`. Add to `supabase/config.toml`:

```toml
[storage.buckets.comprobantes-pago]
public = false
allowed_mime_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
file_size_limit = "5MiB"
```

Storage RLS policies (applied as SQL migrations or via dashboard):

```sql
-- INSERT: authenticated users can only upload to their own subfolder
create policy "Athletes upload own comprobantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes-pago'
    and (storage.foldername(name))[2] = (select id::text from public.usuarios where auth_id = auth.uid())
  );

-- SELECT: owner reads own files; tenant admins read all files in their tenant folder
create policy "Athletes and admins read comprobantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes-pago'
    and (
      (storage.foldername(name))[2] = (select id::text from public.usuarios where auth_id = auth.uid())
      or
      (storage.foldername(name))[1] in (
        select id::text from public.get_admin_tenants_for_authenticated_user()
      )
    )
  );
```

#### 6. Unique constraint — prevent duplicate pending/active subscriptions

```sql
-- Partial unique index: one active/pending subscription per athlete per plan
create unique index if not exists suscripciones_atleta_plan_active_uk
  on public.suscripciones (atleta_id, plan_id)
  where estado in ('pendiente', 'activa');
```

---

## Domain Types

### Update: `src/types/portal/suscripciones.types.ts` *(new file)*

```typescript
export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';
export type PagoEstado = 'pendiente' | 'validado' | 'rechazado';
export type MetodoPago = 'transferencia' | 'efectivo' | 'tarjeta';

export interface Suscripcion {
  id: string;
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  observaciones: string | null;
  estado: SuscripcionEstado;
  created_at: string;
}

export interface Pago {
  id: string;
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  metodo_pago: MetodoPago | null;
  comprobante_url: string | null;
  estado: PagoEstado;
  validado_por: string | null;
  fecha_pago: string | null;
  fecha_validacion: string | null;
  created_at: string;
}

export interface SuscripcionRequest {
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  clases_plan: number | null;
  observaciones: string | null;
  estado: 'pendiente';
}

export interface PagoRequest {
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  metodo_pago: MetodoPago;
  comprobante_url: string | null;
  estado: 'pendiente';
}

/** Form values collected by SolicitarPlanModal */
export interface SolicitarPlanFormValues {
  metodo_pago: MetodoPago;
  observaciones: string;
  comprobante: File | null;
}
```

### Update: `src/types/portal/planes.types.ts`

Add the following view-model type used by the non-admin planes view:

```typescript
export interface PlanWithSubscriptionStatus extends Plan {
  /** Derived client-side: 'pendiente' | 'activa' | null */
  suscripcion_estado: 'pendiente' | 'activa' | null;
}
```

---

## Service Layer

### Update: `src/services/supabase/portal/suscripciones.service.ts` *(new file)*

```typescript
// Functions to implement:

// Fetch all subscriptions for the current athlete within a tenant
getMySubscriptionsForTenant(tenantId: string, atletaId: string): Promise<Suscripcion[]>

// Upload a comprobante file to Supabase Storage (browser client).
// Returns the storage object path (not a signed URL — sign on demand at read time).
uploadComprobante(file: File, tenantId: string, atletaId: string): Promise<string>

// Insert a suscripcion row with estado = 'pendiente'
createSuscripcionRequest(payload: SuscripcionRequest): Promise<Suscripcion>

// Insert a pagos row with estado = 'pendiente'
createPago(payload: PagoRequest): Promise<Pago>

// Orchestrator — called from the hook:
//   1. uploadComprobante (if file provided) → comprobante_url
//   2. createSuscripcionRequest           → suscripcion
//   3. createPago                         → pago
// Returns { suscripcion, pago } on success.
submitSubscriptionRequest(
  plan: Plan,
  atletaId: string,
  tenantId: string,
  formValues: SolicitarPlanFormValues
): Promise<{ suscripcion: Suscripcion; pago: Pago }>
```

### Update: `src/services/supabase/portal/planes.service.ts`

No structural changes required. The existing `getPlanes(tenantId)` function is reused. Make sure it only returns plans where `activo = true` when called by non-admin roles (add an optional `onlyActive` parameter or handle it in the hook).

---

## Application Layer (Hooks)

### New: `src/hooks/portal/suscripciones/useSuscripciones.ts`

Responsibilities:
- Fetch the athlete's current subscriptions via `getMySubscriptionsForTenant`.
- Expose a `submitRequest(plan: Plan, formValues: SolicitarPlanFormValues)` function that calls `submitSubscriptionRequest`.
- Derive a `subscribedPlanIds: Set<string>` map (estado `'pendiente'` | `'activa'`) to drive UI disabling.
- Track an `isSubmitting` boolean for the modal's loading state.
- Handle loading, error, and success states; surface error messages to the component.

### Update: `src/hooks/portal/planes/usePlanes.ts`

Accept an optional `onlyActive` boolean parameter (default `false` for admin, `true` for non-admin roles) so non-admin views only retrieve active plans.

---

## Presentation Layer (Components)

### Update: `src/components/portal/planes/PlanesPage.tsx`

Add the following props (or consume from context):

| Prop | Type | Description |
|------|------|-------------|
| `userRole` | `UserRole` | Controls which actions are rendered |
| `atletaId` | `string \| null` | Required for the subscribe flow (`usuario` only) |

Behavior by role:
- `administrador`: current behavior unchanged (full CRUD).
- `entrenador`: renders `PlanesTable` in read-only mode. No create/edit/delete buttons.
- `usuario`: renders `PlanesTable` with an **"Adquirir"** button per row instead of edit/delete.

### Update: `src/components/portal/planes/PlanesTable.tsx`

Add a `mode` prop: `'admin' | 'viewer' | 'subscriber'`.
- `admin`: existing columns + edit/delete actions.
- `viewer`: plan columns only, no action column.
- `subscriber`: plan columns + "Adquirir" button (disabled when `suscripcion_estado` is `'pendiente'` or `'activa'`).

### New: `src/components/portal/planes/SolicitarPlanModal.tsx`

A two-section confirmation dialog/modal.

**Section 1 — Plan summary (read-only)**
- Plan name, price (formatted as currency), duration (`vigencia_meses` months), included classes.

**Section 2 — Request form (controlled)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `Método de pago` | `<select>` (transferencia / efectivo / tarjeta) | Yes | Client-side required validation |
| `Observaciones` | `<textarea>` max 500 chars | No | — |
| `Comprobante de pago` | `<input type="file">` | No | MIME: jpeg, png, webp, pdf; max 5 MB; inline error on invalid file |

**Behavior:**
- Show an image thumbnail preview when an image file is selected; show a PDF filename badge for PDF files.
- Disable the "Confirmar solicitud" button and show a spinner while `isSubmitting` is true.
- On confirm, call `submitRequest(plan, formValues)` from `useSuscripciones`.
- On success: close the modal and show toast `"Solicitud enviada. El administrador revisará tu solicitud."`.
- On error: keep the modal open; show an inline error message (not a toast).
- Fully keyboard-accessible; closable via Escape key.

Props: `plan: Plan`, `isOpen: boolean`, `onClose: () => void`, `onSuccess: () => void`.

---

## Routing

### New: `src/app/portal/orgs/[tenant_id]/(shared)/planes/page.tsx`

A thin Next.js page that:
1. Reads `tenant_id` from route params.
2. Reads the current user role from the portal profile cookie / server session.
3. Renders `<PlanesPage tenantId={tenantId} userRole={role} atletaId={userId} />`.

> This route lives under `(shared)` (like `gestion-entrenamientos`) so it is accessible to all non-admin roles via Next.js route groups without conflicting with `(administrador)/gestion-planes`.

### Update: `src/types/portal.types.ts`

Add `planes` to the `ROLE_TENANT_ITEMS` for both `usuario` and `entrenador`:

```typescript
usuario: [
  { label: 'Entrenamientos Disponibles', path: 'gestion-entrenamientos', icon: 'directions_run' },
  { label: 'Planes', path: 'planes', icon: 'card_membership' },  // ← ADD
],
entrenador: [
  { label: 'Atletas', path: 'atletas', icon: 'groups' },
  { label: 'Entrenamientos', path: 'gestion-entrenamientos', icon: 'exercise' },
  { label: 'Planes', path: 'planes', icon: 'card_membership' },           // ← ADD
],
```

### Update: `src/components/portal/PortalBreadcrumb.tsx`

Add:
```typescript
'planes': 'Planes',
```

---

## Files to Create or Modify

| Action | File |
|--------|------|
| CREATE | `supabase/migrations/20260304000200_suscripciones_subscription_request.sql` |
| MODIFY | `supabase/config.toml` — add `comprobantes-pago` storage bucket |
| CREATE | `src/types/portal/suscripciones.types.ts` — `Suscripcion`, `Pago`, `SuscripcionRequest`, `PagoRequest`, `SolicitarPlanFormValues` |
| MODIFY | `src/types/portal/planes.types.ts` — add `PlanWithSubscriptionStatus` |
| MODIFY | `src/types/portal.types.ts` — add `planes` nav item to `usuario` and `entrenador` roles |
| CREATE | `src/services/supabase/portal/suscripciones.service.ts` — file upload, suscripcion insert, pago insert, orchestrator |
| MODIFY | `src/services/supabase/portal/planes.service.ts` — add `onlyActive` filter option |
| CREATE | `src/hooks/portal/suscripciones/useSuscripciones.ts` |
| MODIFY | `src/hooks/portal/planes/usePlanes.ts` — accept `onlyActive` param |
| MODIFY | `src/components/portal/planes/PlanesPage.tsx` — add `userRole` + `atletaId` props |
| MODIFY | `src/components/portal/planes/PlanesTable.tsx` — add `mode` prop |
| CREATE | `src/components/portal/planes/SolicitarPlanModal.tsx` — plan summary + payment form with file upload |
| CREATE | `src/app/portal/orgs/[tenant_id]/(shared)/planes/page.tsx` |
| MODIFY | `src/components/portal/PortalBreadcrumb.tsx` — add `'planes'` label |

---

## Completion Checklist

- [ ] Migration applied successfully (`supabase db push` or reset + push).
- [ ] `suscripciones.estado_ck` constraint accepts `'pendiente'`.
- [ ] `suscripciones.clases_plan` column exists with non-negative check.
- [ ] Partial unique index on `(atleta_id, plan_id)` for active/pending states enforced.
- [ ] RLS INSERT policy blocks athletes from subscribing to plans outside their tenant membership.
- [ ] RLS SELECT policy allows athletes to see only their own subscriptions; admins see all.
- [ ] `/portal/orgs/[tenant_id]/planes` is accessible to `usuario` and `entrenador` roles.
- [ ] `usuario` sees "Adquirir" button per plan.
- [ ] `entrenador` sees plans read-only (no create/edit/delete/adquirir buttons).
- [ ] Admin route `/portal/orgs/[tenant_id]/gestion-planes` is unchanged.
- [ ] "Adquirir" button is disabled when a pending or active subscription already exists for that plan+athlete pair.
- [ ] `SolicitarPlanModal` renders both the plan summary section and the request form section.
- [ ] `Método de pago` select is required; form cannot be submitted without a selection.
- [ ] `Observaciones` textarea accepts up to 500 characters.
- [ ] File input accepts only image/jpeg, image/png, image/webp, application/pdf; files over 5 MB show an inline error immediately on selection.
- [ ] Image thumbnail preview is shown when an image file is selected.
- [ ] PDF filename badge is shown when a PDF file is selected.
- [ ] "Confirmar solicitud" button is disabled and shows a spinner while `isSubmitting` is true.
- [ ] Comprobante is uploaded to `comprobantes-pago` bucket before subscription insert.
- [ ] `suscripciones` row is created with `observaciones` and `clases_plan` populated.
- [ ] `pagos` row is created linked to the new subscription with `comprobante_url` and `metodo_pago`.
- [ ] Success toast `"Solicitud enviada. El administrador revisará tu solicitud."` is shown after submission.
- [ ] On error, modal stays open and shows an inline error message (not a toast).
- [ ] `clases_plan` is populated from `planes.clases_incluidas` at the time of subscription creation.
- [ ] Navigation menu items for `usuario` and `entrenador` show "Planes" linking to `/portal/orgs/[tenant_id]/planes`.
- [ ] Breadcrumb displays "Planes" for the new route.
- [ ] No direct Supabase calls from page or component layer (all data access via hooks → services).
- [ ] Storage RLS prevents athletes from reading other athletes' comprobantes.
- [ ] `supabase/config.toml` includes `comprobantes-pago` bucket with MIME type and size restrictions.

---

## Non-Functional Requirements

### Security
- RLS must always be the last line of defense. Client-side role checks are supplementary only.
- Athletes must not be able to insert a subscription with `estado` other than `'pendiente'`.
- Athletes must not be able to subscribe on behalf of other users (`atleta_id` must match `auth.uid()` via the `usuarios` lookup).
- Administrators must not be able to trigger the subscribe flow (button must not render for `administrador` role).

### Performance
- The `suscripciones` query for fetching an athlete's subscriptions must filter by both `tenant_id` and `atleta_id` to leverage the existing indexes (`idx_suscripciones_tenant_id`, `idx_suscripciones_atleta_id`).
- The plans listing for non-admin roles should include `activo = true` as a predicate to reduce result set size.

### UX
- The "Adquirir" button for plans already in pending/active state must be visually disabled (grey) with a tooltip: _"Ya tienes una suscripción activa o pendiente a este plan"_.
- All modals must be keyboard-accessible and closable via the Escape key.
- The plan price must be displayed prominently in the modal summary to avoid accidental submissions.
- A file upload area should clearly communicate accepted formats (JPG, PNG, PDF) and the 5 MB size limit.
- While the file is uploading and records are being inserted, a progress indicator (spinner on the confirm button) prevents duplicate submissions.
- If the selected file exceeds 5 MB or has an invalid MIME type, an inline error message appears immediately on file selection without requiring a form submit.

### Storage
- File uploads must use the Supabase **browser** client (not the server client), since they originate from the user's browser session.
- The `comprobante_url` stored in `pagos` should be the storage **object path** (e.g., `{tenant_id}/{atleta_id}/{timestamp}-{file}`), not a signed URL. Signed URLs should be generated on demand when the administrator views the payment record, to avoid storing expiring URLs in the database.
