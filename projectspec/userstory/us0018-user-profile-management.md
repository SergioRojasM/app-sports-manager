# US0018 — User Profile Management

| Field | Value |
|-------|-------|
| **ID** | US0018 |
| **Name** | User Profile Management |
| **Module** | perfil-usuario |
| **Priority** | High |
| **Depends on** | US0001 (Auth), US0005 (Portal Layout) |

---

## User Story

**As a** registered user of the platform (any role),  
**I want** to view and edit my personal profile and sports profile from a dedicated page accessible via the avatar menu,  
**So that** I can keep my personal information up to date, including identification, contact details, photo, and athletic data.

---

## Description

This feature introduces a **user profile module** accessible at `/portal/perfil` — **outside** the tenant-scoped routes (i.e., it is not under `/portal/orgs/[tenant_id]/`). The profile page is reachable from the avatar dropdown menu in the portal header (`UserAvatarMenu.tsx`) which already links to `/portal/perfil`.

The profile page queries two tables:
1. **`public.usuarios`** — personal information (nombre, apellido, email, telefono, fecha_nacimiento, foto_url, tipo_identificacion, numero_identificacion, rh, estado).
2. **`public.perfil_deportivo`** — sports profile (peso_kg, altura_cm).

The page renders a form that mirrors the design in `projectspec/designs/11_Perfil.html`:
- **Header section**: avatar image with a placeholder upload button (upload not yet implemented — button rendered but non-functional with a tooltip "Próximamente"), user full name, and Save / Cancel buttons.
- **Form section**: editable fields organised in a two-column grid, plus a sports profile section.
- The form is **editable by default** — fields are input-ready, and a "Guardar Cambios" button submits the changes. A "Cancelar" button reverts to the last saved state.

### Current database schema for `public.usuarios`

From the initial migration and subsequent additions:

```sql
create table if not exists public.usuarios (
  id uuid primary key,                    -- references auth.users(id)
  email varchar(255) not null unique,
  nombre varchar(100),
  apellido varchar(100),
  telefono varchar(20),
  fecha_nacimiento date,
  foto_url varchar(500),
  activo boolean not null default true,
  estado text not null default 'activo',   -- added in migration 20260303195145
  tipo_identificacion varchar(20),         -- added in migration 20260304000100
  numero_identificacion varchar(30),       -- added in migration 20260304000100
  rh varchar(10),                          -- added in migration 20260304000100
  created_at timestamptz not null default timezone('utc', now())
);
```

### Current database schema for `public.perfil_deportivo`

```sql
create table if not exists public.perfil_deportivo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  peso_kg numeric(3,2),
  altura_cm numeric(3,1),
  created_at timestamptz not null default timezone('utc', now()),
  constraint perfil_deportivo_user_id_fkey
    foreign key (user_id) references public.usuarios(id) on delete cascade,
  constraint perfil_deportivo_user_id_uk unique (user_id)
);
```

---

## Route & Access

| Item | Value |
|------|-------|
| **Route** | `/portal/perfil` |
| **Route file** | `src/app/portal/perfil/page.tsx` |
| **Access** | Any authenticated user (all roles) |
| **Navigation** | Avatar dropdown in `UserAvatarMenu.tsx` (already links to `/portal/perfil`) |
| **Tenant scope** | None — this page lives outside `orgs/[tenant_id]` |

> **Note:** The current stub at `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx` should be **removed or redirected** to `/portal/perfil` to avoid confusion. The profile is user-global, not tenant-scoped.

---

## Form Fields

### Section: Personal Information (from `public.usuarios`)

| Field | DB Column | Type | Input Type | Required | Editable | Notes |
|-------|-----------|------|------------|----------|----------|-------|
| Nombre | `nombre` | `varchar(100)` | text | Yes | Yes | |
| Apellido | `apellido` | `varchar(100)` | text | Yes | Yes | |
| Correo | `email` | `varchar(255)` | email | Yes | **No** | Read-only; managed by auth |
| Teléfono | `telefono` | `varchar(20)` | tel | No | Yes | |
| Fecha de Nacimiento | `fecha_nacimiento` | `date` | date | No | Yes | |
| Tipo de Identificación | `tipo_identificacion` | `varchar(20)` | select | No | Yes | Options: CC, CE, TI, NIT, Pasaporte, Otro |
| N° Identificación | `numero_identificacion` | `varchar(30)` | text | No | Yes | |
| RH | `rh` | `varchar(10)` | select | No | Yes | Options: O+, O−, A+, A−, B+, B−, AB+, AB− |

### Section: Sports Profile (from `public.perfil_deportivo`)

| Field | DB Column | Type | Input Type | Required | Editable | Notes |
|-------|-----------|------|------------|----------|----------|-------|
| Peso (kg) | `peso_kg` | `numeric(3,2)` | number | No | Yes | Step 0.1, min 0, max 300 |
| Altura (cm) | `altura_cm` | `numeric(3,1)` | number | No | Yes | Step 0.1, min 0, max 300 |

### Section: Avatar (header)

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| Foto | `foto_url` | `varchar(500)` | Display current photo or initials fallback. Upload button shown but **non-functional** with tooltip "Próximamente" |

---

## Architecture — Files to Create / Modify

Following the hexagonal feature-slice convention:

### New files

| Layer | File | Purpose |
|-------|------|---------|
| **Types** | `src/types/portal/perfil.types.ts` | `PerfilUsuario`, `PerfilDeportivo`, `PerfilFormValues`, `PerfilFormField`, `PerfilFieldErrors`, `PerfilServiceError` |
| **Service** | `src/services/supabase/portal/perfil.service.ts` | `getPerfil(userId)`, `updatePerfil(userId, data)`, `upsertPerfilDeportivo(userId, data)` |
| **Hook** | `src/hooks/portal/perfil/usePerfil.ts` | Fetch + form state + submit + dirty tracking |
| **Component** | `src/components/portal/perfil/PerfilPage.tsx` | Top-level orchestrator |
| **Component** | `src/components/portal/perfil/PerfilHeader.tsx` | Avatar + name + save/cancel buttons |
| **Component** | `src/components/portal/perfil/PerfilPersonalForm.tsx` | Personal info fields (grid) |
| **Component** | `src/components/portal/perfil/PerfilDeportivoForm.tsx` | Sports profile fields |
| **Component** | `src/components/portal/perfil/index.ts` | Barrel export |
| **Route** | `src/app/portal/perfil/page.tsx` | Thin page rendering `<PerfilPage />` |

### Files to modify

| File | Change |
|------|--------|
| `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx` | **Remove** or replace with redirect to `/portal/perfil` |
| `projectspec/03-project-structure.md` | Add `perfil/` to directory tree in components, hooks, services, types, and routes sections |

---

## Types — `src/types/portal/perfil.types.ts`

```typescript
export type TipoIdentificacion = 'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro';
export type TipoRH = 'O+' | 'O−' | 'A+' | 'A−' | 'B+' | 'B−' | 'AB+' | 'AB−';

export type PerfilUsuario = {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;   // ISO date string
  foto_url: string | null;
  tipo_identificacion: TipoIdentificacion | null;
  numero_identificacion: string | null;
  rh: string | null;
};

export type PerfilDeportivo = {
  id: string;
  user_id: string;
  peso_kg: number | null;
  altura_cm: number | null;
};

export type PerfilFormValues = {
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
  tipo_identificacion: TipoIdentificacion | '';
  numero_identificacion: string;
  rh: TipoRH | '';
  peso_kg: string;       // string for controlled input
  altura_cm: string;     // string for controlled input
};

export type PerfilFormField = keyof PerfilFormValues;
export type PerfilFieldErrors = Partial<Record<PerfilFormField, string>>;

export class PerfilServiceError extends Error {
  readonly code: 'forbidden' | 'not_found' | 'unknown';
  constructor(code: 'forbidden' | 'not_found' | 'unknown', message: string) {
    super(message);
    this.name = 'PerfilServiceError';
    this.code = code;
  }
}
```

---

## Service — `src/services/supabase/portal/perfil.service.ts`

### `getPerfil(userId: string): Promise<{ usuario: PerfilUsuario; deportivo: PerfilDeportivo | null }>`
- Query `public.usuarios` by `id = userId` selecting: `id, email, nombre, apellido, telefono, fecha_nacimiento, foto_url, tipo_identificacion, numero_identificacion, rh`.
- Query `public.perfil_deportivo` by `user_id = userId` selecting: `id, user_id, peso_kg, altura_cm`.
- Return both; `deportivo` may be `null` if no row exists yet.
- On error throw `PerfilServiceError`.

### `updatePerfil(userId: string, data: Partial<PerfilUsuario>): Promise<void>`
- Update `public.usuarios` row where `id = userId` with the provided fields (excluding `id`, `email`).
- On error throw `PerfilServiceError`.

### `upsertPerfilDeportivo(userId: string, data: { peso_kg: number | null; altura_cm: number | null }): Promise<void>`
- Upsert into `public.perfil_deportivo` on conflict `(user_id)` — insert if missing, update if exists.
- On error throw `PerfilServiceError`.

---

## Hook — `src/hooks/portal/perfil/usePerfil.ts`

### State
- `perfil: { usuario: PerfilUsuario; deportivo: PerfilDeportivo | null } | null`
- `loading: boolean`
- `error: string | null`
- `formValues: PerfilFormValues`
- `fieldErrors: PerfilFieldErrors`
- `isSubmitting: boolean`
- `isDirty: boolean` — tracks whether form values differ from the last saved snapshot
- `successMessage: string | null` — auto-clears after 4 seconds

### Behaviour
- On mount: get authenticated user ID (from Supabase auth), call `getPerfil(userId)`, populate `formValues` from response.
- `updateField(field, value)`: updates `formValues[field]`, recomputes `isDirty`.
- `cancel()`: reverts `formValues` to the saved snapshot, clears `fieldErrors`.
- `submit()`: validates required fields (nombre, apellido), calls `updatePerfil` + `upsertPerfilDeportivo`, refreshes snapshot, sets `successMessage`, resets `isDirty`.

### Exposed
`loading`, `error`, `formValues`, `fieldErrors`, `isSubmitting`, `isDirty`, `successMessage`, `updateField`, `cancel`, `submit`, `refresh`.

---

## Components

### `PerfilHeader.tsx`
- Displays avatar (current `foto_url` or initials fallback in a rounded square, matching the design).
- Upload button with edit icon — **non-functional**, shows tooltip "Próximamente" on hover.
- User full name as heading: "Editar Perfil".
- Subtitle: "Actualiza tu información personal y preferencias."
- **Guardar Cambios** button (disabled when `!isDirty || isSubmitting`).
- **Cancelar** button (calls `cancel`, disabled when `!isDirty`).

### `PerfilPersonalForm.tsx`
- Two-column grid on desktop, single column on mobile.
- Fields: Nombre (text, icon `person`), Apellido (text, icon `person`), Correo (email, icon `mail`, **read-only with disabled style**), Teléfono (tel, icon `phone`), Fecha de Nacimiento (date, icon `calendar_today`), Tipo de Identificación (select, icon `badge`), N° Identificación (text, icon `badge`), RH (select, icon `water_drop`).
- Each field has label, icon-prefixed input, validation error display.
- Input styling matches the design: `bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border-dark rounded-xl` with focus ring.

### `PerfilDeportivoForm.tsx`
- Section title: "Perfil Deportivo".
- Two-column grid: Peso (kg) (number, icon `monitor_weight`), Altura (cm) (number, icon `height`).
- Same input styling as personal form.

### `PerfilPage.tsx`
- Calls `usePerfil()`.
- Renders loading state, error state (with retry), and the full composition:
  - `PerfilHeader` → `PerfilPersonalForm` → `PerfilDeportivoForm`
- Success message banner (emerald, auto-dismiss).
- Wrapped in the glass card container matching the design: `bg-white dark:bg-card-dark rounded-20px shadow-2xl border ...`

---

## Design Reference

Use `projectspec/designs/11_Perfil.html` as the visual reference. Key design elements:
- **Card container**: `max-w-3xl`, dark glass card with border, rounded corners.
- **Header**: avatar (rounded-20px, 80×80), edit button overlay, heading + save/cancel buttons.
- **Form inputs**: icon-prefixed, `rounded-xl`, `bg-slate-50 dark:bg-slate-900/50`, focus ring with primary/turquoise colour.
- **Two-column grid** on `md:` breakpoint.
- **No Danger Zone section** (that part of the design is not applicable to user profiles — it was for team profiles).

---

## Expected Results

1. Any authenticated user can navigate to `/portal/perfil` from the avatar dropdown menu.
2. The page loads the user's personal and sports profile data.
3. All editable fields are shown in a form matching the HTML design.
4. The user can modify fields and click "Guardar Cambios" to persist changes.
5. The "Cancelar" button reverts all unsaved changes.
6. The email field is read-only and visually greyed out.
7. The avatar upload button is visible but non-functional (shows "Próximamente").
8. Success feedback is shown after saving.
9. Validation errors are shown inline for required fields.
10. The form correctly handles nullable fields (empty → `null` in DB).

---

## Completion Criteria

- [ ] Route `src/app/portal/perfil/page.tsx` exists and renders `PerfilPage`.
- [ ] Types file `src/types/portal/perfil.types.ts` defines all required types.
- [ ] Service file `src/services/supabase/portal/perfil.service.ts` implements `getPerfil`, `updatePerfil`, `upsertPerfilDeportivo`.
- [ ] Hook file `src/hooks/portal/perfil/usePerfil.ts` manages form state, dirty tracking, validation, and submission.
- [ ] Components `PerfilHeader`, `PerfilPersonalForm`, `PerfilDeportivoForm`, `PerfilPage` created with barrel export.
- [ ] Existing stub at `(shared)/perfil/page.tsx` removed or redirected.
- [ ] `projectspec/03-project-structure.md` updated with perfil feature slice.
- [ ] Avatar menu link (`/portal/perfil`) works and navigates to the profile page.
- [ ] Form matches the visual design in `projectspec/designs/11_Perfil.html`.
- [ ] Save persists changes to both `usuarios` and `perfil_deportivo`.
- [ ] Cancel reverts form to last saved state.
- [ ] Email is read-only in the form.

---

## Non-Functional Requirements

- **Security**: All Supabase queries use the browser client (RLS-aware). `usuarios` already has a `usuarios_select_authenticated` policy (`using(true)`). An **UPDATE policy** must be verified or created so users can only update their own row (`using (id = auth.uid())`). Similarly for `perfil_deportivo` — verify INSERT/UPDATE policies exist for the authenticated user's own record.
- **Performance**: Single page load fetches both tables in parallel (`Promise.all`). No additional queries after mount unless the user refreshes.
- **Accessibility**: All form inputs have associated `<label>` elements. Buttons have descriptive text. Focus management follows keyboard navigation standards.
- **Responsiveness**: Two-column grid on `md:`, single column on mobile. Avatar section stacks vertically on small screens.
- **RLS policies to verify/add** (in a migration if missing):
  - `usuarios_update_own`: `for update to authenticated using (id = auth.uid()) with check (id = auth.uid())`
  - `perfil_deportivo_insert_own`: `for insert to authenticated with check (user_id = auth.uid())`
  - `perfil_deportivo_update_own`: `for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`
  - `perfil_deportivo_select_own`: `for select to authenticated using (user_id = auth.uid())` — or a broader policy if already present
