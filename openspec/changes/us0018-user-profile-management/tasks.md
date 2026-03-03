## 1. Branch Setup

- [x] 1.1 Create new git branch: `feat/us0018-user-profile-management`
- [x] 1.2 Verify active branch is NOT `main`, `master`, or `develop`

## 2. Database — RLS Migration

- [x] 2.1 Inspect existing migrations to confirm no UPDATE policy exists on `public.usuarios` and no INSERT/UPDATE policies on `public.perfil_deportivo`
- [x] 2.2 Create migration file `supabase/migrations/YYYYMMDDHHMMSS_add_perfil_rls_policies.sql` with the following policies:
  - `usuarios_update_own` — `FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())`
  - `perfil_deportivo_insert_own` — `FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())`
  - `perfil_deportivo_update_own` — `FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
- [x] 2.3 Apply the migration locally (`supabase db reset` or `supabase migration up`) and verify no errors

## 3. Types — `src/types/portal/perfil.types.ts`

- [x] 3.1 Define `TipoIdentificacion` union type: `'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro'`
- [x] 3.2 Define `TipoRH` union type: `'O+' | 'O−' | 'A+' | 'A−' | 'B+' | 'B−' | 'AB+' | 'AB−'`
- [x] 3.3 Define `PerfilUsuario` type with fields: `id, email, nombre, apellido, telefono, fecha_nacimiento, foto_url, tipo_identificacion, numero_identificacion, rh`
- [x] 3.4 Define `PerfilDeportivo` type with fields: `id, user_id, peso_kg, altura_cm`
- [x] 3.5 Define `PerfilFormValues` type (all string fields for controlled inputs, including `peso_kg` and `altura_cm` as strings)
- [x] 3.6 Define `PerfilFormField`, `PerfilFieldErrors`, and `PerfilServiceError` class

## 4. Service — `src/services/supabase/portal/perfil.service.ts`

- [x] 4.1 Implement `getPerfil(userId: string)` — queries `public.usuarios` and `public.perfil_deportivo` in parallel with `Promise.all`, returns `{ usuario: PerfilUsuario; deportivo: PerfilDeportivo | null }`
- [x] 4.2 Implement `updatePerfil(userId: string, data: Partial<PerfilUsuario>)` — updates `public.usuarios` where `id = userId`, excludes `id` and `email` from update payload, throws `PerfilServiceError` on failure
- [x] 4.3 Implement `upsertPerfilDeportivo(userId: string, data: { peso_kg: number | null; altura_cm: number | null })` — upserts `public.perfil_deportivo` on conflict `(user_id)`, throws `PerfilServiceError` on failure

## 5. Hook — `src/hooks/portal/perfil/usePerfil.ts`

- [x] 5.1 On mount, get authenticated `userId` from Supabase auth (`getUser`) and call `getPerfil(userId)` to populate initial form values
- [x] 5.2 Store `savedSnapshot: PerfilFormValues` alongside `formValues`; compute `isDirty` as deep equality check between both
- [x] 5.3 Implement `updateField(field, value)` — updates `formValues[field]` and recomputes `isDirty`
- [x] 5.4 Implement `cancel()` — resets `formValues` to `savedSnapshot`, clears `fieldErrors`
- [x] 5.5 Implement `submit()` — validates that `nombre` and `apellido` are non-empty; calls `updatePerfil` + `upsertPerfilDeportivo` in parallel; refreshes `savedSnapshot`; sets `successMessage` (auto-clears after 4 s); resets `isDirty`
- [x] 5.6 Expose: `loading`, `error`, `formValues`, `fieldErrors`, `isSubmitting`, `isDirty`, `successMessage`, `updateField`, `cancel`, `submit`, `refresh`

## 6. Components — `src/components/portal/perfil/`

- [x] 6.1 Create `PerfilHeader.tsx` — renders avatar (img from `foto_url` or initials fallback in a rounded frame), upload button (`disabled`, tooltip "Próximamente"), user full name heading, "Guardar Cambios" button (disabled when `!isDirty || isSubmitting`), "Cancelar" button (disabled when `!isDirty`)
- [x] 6.2 Create `PerfilPersonalForm.tsx` — 2-column grid (md:), fields: Nombre (text), Apellido (text), Correo (email, read-only), Teléfono (tel), Fecha de Nacimiento (date), Tipo de Identificación (select), N° Identificación (text), RH (select); each field has label, icon prefix, inline error display
- [x] 6.3 Create `PerfilDeportivoForm.tsx` — section heading "Perfil Deportivo", 2-column grid: Peso (kg) (number, step 0.1, min 0, max 300), Altura (cm) (number, step 0.1, min 0, max 300)
- [x] 6.4 Create `PerfilPage.tsx` — Client Component (`"use client"`); calls `usePerfil()`; renders loading state, error state with retry, success banner (auto-dismiss), and composition of `PerfilHeader` + `PerfilPersonalForm` + `PerfilDeportivoForm` inside a glass card container (`max-w-3xl`, `rounded-xl`, `border-portal-border`)
- [x] 6.5 Create `index.ts` barrel export for all perfil components

## 7. Route — `src/app/portal/perfil/page.tsx`

- [x] 7.1 Create `src/app/portal/perfil/page.tsx` as a minimal Server Component that renders `<PerfilPage />` (imported from components barrel)
- [x] 7.2 Remove stub page `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx`

## 8. Visual Validation

- [x] 8.1 Navigate to `/portal/perfil` via the avatar dropdown and confirm the page loads with user data
- [x] 8.2 Verify form fields are pre-populated from the database correctly
- [x] 8.3 Verify the email field is read-only and visually greyed out
- [x] 8.4 Verify "Guardar Cambios" and "Cancelar" are disabled on initial load (no changes)
- [x] 8.5 Modify a field and verify both buttons become enabled
- [x] 8.6 Click "Cancelar" and verify the field reverts to its original value and buttons disable again
- [x] 8.7 Submit a valid form and verify success banner appears and buttons disable
- [x] 8.8 Clear `nombre` or `apellido` and submit — verify inline validation error appears and no network call is made
- [x] 8.9 Verify avatar shows `foto_url` image when set, or initials when null
- [x] 8.10 Verify avatar upload button is disabled and shows "Próximamente" tooltip on hover
- [x] 8.11 Verify layout is responsive: 2-column grid on desktop, single column on mobile

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` to add `perfil/` entries in: `app/portal/`, `components/portal/`, `hooks/portal/`, `services/supabase/portal/`, `types/portal/`

## 10. Commit & Pull Request

- [ ] 10.1 Stage all changes and create commit with message: `feat(perfil): implement user profile management page (US0018)`
- [ ] 10.2 Push branch and open Pull Request with description:
  - **Summary**: Implements the user profile page at `/portal/perfil` (globally accessible, outside tenant scope).
  - **Changes**: New feature slice (types, service, hook, 4 components, route page); RLS migration for `usuarios` UPDATE and `perfil_deportivo` INSERT/UPDATE; removes tenant-scoped stub page.
  - **Testing**: Manual validation per tasks 8.1–8.11.
  - **References**: US0018, design `projectspec/designs/11_Perfil.html`.
