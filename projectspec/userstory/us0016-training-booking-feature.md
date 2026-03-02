# User Story

## Title
Training Booking Feature — Reserve Entrenamientos

## ID
US-0016

## Name
Training Booking Feature

---

## As a
Member of an organization (atleta, entrenador, or administrador)

## I Want
To be able to book a spot in a training session directly from the training management page

## So That
Athletes can reserve their place in a training, and trainers/administrators can manage bookings (create, edit, and delete) on behalf of members

---

## Description

This feature adds **booking (reservas) management** to the existing **gestion-entrenamientos** module. It must be built as a sub-feature slice nested inside the entrenamientos module and must **reuse the existing `gestion-entrenamientos` page** as the entry point.

### Role-Based Access

| Action | Atleta | Entrenador | Administrador |
|--------|--------|------------|---------------|
| View bookings for a training | ✅ Own only | ✅ All | ✅ All |
| Book (create reservation) | ✅ Self-book | ✅ On behalf of athlete | ✅ On behalf of athlete |
| Edit a booking | ❌ | ✅ | ✅ |
| Delete / Cancel a booking | ✅ Own (cancel only) | ✅ | ✅ |
| Confirm a booking | ❌ | ✅ | ✅ |
| Mark attendance | ❌ | ✅ | ✅ |

### Booking States (from DB constraint)
`pendiente` → `confirmada` → `completada` | `cancelada`

---

## Database Model (existing — no new migrations required)

### `public.reservas`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto |
| `tenant_id` | uuid FK → tenants | |
| `atleta_id` | uuid FK → usuarios | |
| `entrenamiento_id` | uuid FK → entrenamientos | |
| `fecha_reserva` | timestamptz | when the booking was made |
| `estado` | varchar(30) | `pendiente`, `confirmada`, `cancelada`, `completada` |
| `notas` | text | optional notes |
| `fecha_cancelacion` | timestamptz | set when cancelled |
| `created_at` | timestamptz | auto |

### `public.asistencias`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto |
| `tenant_id` | uuid FK → tenants | |
| `reserva_id` | uuid FK → reservas | unique — one per booking |
| `validado_por` | uuid FK → usuarios | who validated |
| `fecha_asistencia` | timestamptz | |
| `asistio` | boolean | |
| `observaciones` | text | |

### Relevant `public.entrenamientos` columns
- `cupo_maximo` — max capacity; booking creation must validate available spots
- `estado` — bookings can only be created when `estado = 'activo'` or `'pendiente'`
- `visibilidad` — `publico` or `privado`

### Relevant `public.suscripciones` columns
- `clases_restantes` — informational for display; decrement is out of scope for this US

---

## Functional Requirements

### 1. View Bookings Panel
- From `EntrenamientosPage`, clicking on a training (calendar event or card) opens a detail panel/modal that includes a **"Reservas"** tab or section.
- The bookings list shows: athlete name, status badge, booking date, notes.
- For `atleta` role: shows only their own booking and a "Book" button if no active booking exists.
- For `entrenador`/`administrador`: shows all bookings with capacity indicator (`x / cupo_maximo` reserved).

### 2. Create Booking
- **Atleta**: a "Reservar" button on the training card/detail opens a confirmation dialog. Booking is created with `atleta_id = current user`, `estado = 'pendiente'`, `fecha_reserva = now()`.
- **Entrenador / Administrador**: a form modal allows selecting an athlete (member of the tenant with `atleta` role) and adding optional notes.
- Validations:
  - Training `cupo_maximo` must not be reached (count of non-cancelled bookings < cupo_maximo — if cupo_maximo is null, no limit).
  - An athlete cannot have two active (non-cancelled) bookings for the same training.
  - Training `estado` must not be `cancelado` or `finalizado`.

### 3. Edit Booking (Entrenador / Administrador only)
- Allows updating `estado` (pendiente → confirmada) and `notas`.
- Cancellation is a separate action (sets `estado = 'cancelada'` and `fecha_cancelacion = now()`).

### 4. Cancel Booking
- **Atleta**: can cancel only their own booking while `estado` is `pendiente` or `confirmada`.
- **Entrenador / Administrador**: can cancel any booking.
- Sets `estado = 'cancelada'` and `fecha_cancelacion = now()`.

### 5. Delete Booking (Entrenador / Administrador only)
- Hard delete only allowed when `estado = 'cancelada'` or `'pendiente'`.
- Requires confirmation dialog.

### 6. Capacity Indicator
- The training card/calendar event should display a pill showing `X booked / cupo_maximo` (or `X booked` when no limit).
- Color: green if < 70%, yellow if 70–99%, red if full.

---

## Fields

### Booking Form (ReservaFormModal)

| Field | Type | Required | Notes |
|---|---|---|---|
| `atleta_id` | select (tenant athletes) | Yes (admin/trainer only) | hidden for self-booking |
| `notas` | textarea | No | |

### Booking Status Update Form

| Field | Type | Required | Notes |
|---|---|---|---|
| `estado` | select | Yes | `pendiente`, `confirmada`, `cancelada`, `completada` |
| `notas` | textarea | No | |

---

## Architecture — Files to Create / Modify

Follow the **feature slice convention** described in `03-project-structure.md`. The reservas sub-feature is nested under the entrenamientos slice.

### New Files to Create

```text
src/
├── components/portal/entrenamientos/reservas/
│   ├── ReservasPanel.tsx           # Main panel listing bookings for a training
│   ├── ReservaFormModal.tsx        # Create / Edit booking modal
│   ├── ReservaStatusBadge.tsx      # Status badge component
│   └── index.ts                   # barrel export
│
├── hooks/portal/entrenamientos/reservas/
│   ├── useReservas.ts              # List, create, update, delete + optimistic state
│   └── useReservaForm.ts           # Form state, validation, submission logic
│
├── services/supabase/portal/
│   └── reservas.service.ts        # All Supabase calls for reservas + asistencias
│
└── types/portal/
    └── reservas.types.ts          # Reserva, Asistencia interfaces + view models
```

### Files to Modify

| File | Change |
|---|---|
| `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Integrate `ReservasPanel` — shown when a training is selected |
| `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | Add capacity counter display (read-only) |
| `src/components/portal/entrenamientos/index.ts` | Export `ReservasPanel` and related components |
| `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Add `selectedEntrenamientoId` state + selector handler |
| `src/types/portal/entrenamientos.types.ts` | Add `ReservaCount` enrichment to `EntrenamientoView` |

---

## Types (`reservas.types.ts`)

```typescript
export type ReservaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface Reserva {
  id: string;
  tenant_id: string;
  atleta_id: string;
  entrenamiento_id: string;
  fecha_reserva: string | null;
  estado: ReservaEstado;
  notas: string | null;
  fecha_cancelacion: string | null;
  created_at: string;
}

export interface ReservaView extends Reserva {
  atleta_nombre: string;
  atleta_apellido: string;
  atleta_email: string;
}

export interface CreateReservaInput {
  tenant_id: string;
  atleta_id: string;
  entrenamiento_id: string;
  notas?: string;
}

export interface UpdateReservaInput {
  estado?: ReservaEstado;
  notas?: string;
  fecha_cancelacion?: string;
}

export interface ReservaCapacidad {
  entrenamiento_id: string;
  cupo_maximo: number | null;
  reservas_activas: number;
  disponible: boolean;
}
```

---

## Service (`reservas.service.ts`)

```typescript
// Signature reference — implementation is developer's responsibility

getReservasByEntrenamiento(tenantId: string, entrenamientoId: string): Promise<ReservaView[]>
getMyReservaForEntrenamiento(tenantId: string, entrenamientoId: string, atletaId: string): Promise<Reserva | null>
createReserva(input: CreateReservaInput): Promise<Reserva>
updateReserva(id: string, tenantId: string, input: UpdateReservaInput): Promise<Reserva>
cancelReserva(id: string, tenantId: string): Promise<Reserva>
deleteReserva(id: string, tenantId: string): Promise<void>
getCapacidad(tenantId: string, entrenamientoId: string): Promise<ReservaCapacidad>
```

Join `reservas` with `usuarios` (aliased as atleta) to return `ReservaView`. Always filter by `tenant_id`. Count active bookings excluding `cancelada`.

---

## Hooks

### `useReservas.ts`
- Accepts `{ tenantId, entrenamientoId, role }`.
- Loads bookings via `reservas.service.ts`.
- Exposes: `reservas`, `capacidad`, `isLoading`, `createReserva`, `updateReserva`, `cancelReserva`, `deleteReserva`.
- Uses optimistic updates for cancel/delete.

### `useReservaForm.ts`
- Manages form state for `ReservaFormModal`.
- Handles validation (capacity check, duplicate booking).
- Exposes: `form`, `isSubmitting`, `error`, `submitCreate`, `submitUpdate`.

---

## RLS / Security Considerations

> The existing RLS policies for `reservas` must be verified or created to enforce the following:

- **SELECT**: authenticated user can read reservas where `tenant_id` matches their membership AND (`atleta_id = auth.uid()` OR role is `entrenador` or `administrador` in that tenant).
- **INSERT**: authenticated member of the tenant; `atleta_id` must equal `auth.uid()` unless the inserting user is `entrenador` or `administrador`.
- **UPDATE**: only `entrenador` or `administrador` of the tenant can update; atleta can only cancel their own.
- **DELETE**: only `entrenador` or `administrador` of the tenant.

A database migration **must be created** if RLS policies for `reservas` are not yet defined:

```
supabase/migrations/YYYYMMDDHHMMSS_reservas_rls_policies.sql
```

---

## URL / Route Strategy

No new routes are needed. The feature is **embedded inside** the existing page:

```
/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos
```

The `ReservasPanel` is rendered conditionally when a training is selected (via internal state in `EntrenamientosPage`). No query params or sub-routes are required for this iteration.

---

## Acceptance Criteria

1. **Atleta** can book an available training → booking appears with `estado = 'pendiente'`.
2. **Atleta** cannot book a full training (capacity reached) → button is disabled with a clear message.
3. **Atleta** cannot double-book the same training → button replaced with "Ya reservado" indicator and a cancel option.
4. **Atleta** can cancel their own pending/confirmed booking.
5. **Entrenador / Administrador** can create a booking on behalf of any tenant athlete.
6. **Entrenador / Administrador** can change booking status (confirm / complete / cancel).
7. **Entrenador / Administrador** can delete a cancelled or pending booking after confirmation dialog.
8. Capacity indicator is visible on each training card showing `X / cupo_maximo` booked.
9. All actions respect RLS — no cross-tenant data leaks.
10. No direct Supabase calls from components (hooks → services layer enforced).

---

## Steps to Consider Complete

- [ ] `reservas.types.ts` created with all interfaces.
- [ ] `reservas.service.ts` created with all CRUD operations and join query.
- [ ] `useReservas.ts` hook implemented with loading/error states.
- [ ] `useReservaForm.ts` hook implemented with validation.
- [ ] `ReservaStatusBadge.tsx` component created.
- [ ] `ReservasPanel.tsx` component created (role-aware layout).
- [ ] `ReservaFormModal.tsx` component created (create + edit modes).
- [ ] `EntrenamientosPage.tsx` updated to show `ReservasPanel` on training selection.
- [ ] Capacity indicator added to training calendar events / cards.
- [ ] RLS migration created and applied (`npx supabase db reset` passes).
- [ ] All barrel `index.ts` exports updated.
- [ ] Manual QA: atleta books → trainer confirms → atleta cancels → trainer deletes.

---

## Non-Functional Requirements

- **Performance**: `getReservasByEntrenamiento` must include a DB index on `(tenant_id, entrenamiento_id)` — add in migration if missing.
- **Security**: All service calls must use the **browser Supabase client** (RLS enforced). Server actions are not required for this feature.
- **Accessibility**: Modal forms must be keyboard-navigable; status badges must have sufficient contrast.
- **Optimistic UI**: Cancel and delete actions should update UI before server confirmation, with rollback on error.
- **No New Routes**: Feature is self-contained within the existing `gestion-entrenamientos` page.
