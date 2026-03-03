## Context

The portal currently receives every authenticated user at `/portal` after login, with a persistent header that includes an avatar dropdown (`UserAvatarMenu.tsx`). That dropdown already contains a "Perfil" link pointing to `/portal/perfil`, but the target is a stub page under the tenant-scoped route `orgs/[tenant_id]/(shared)/perfil/`. The user profile is conceptually **user-global**, not tenant-specific — a user's personal data (name, phone, ID, blood type) and sports data (weight, height) are the same regardless of which organization they belong to.

Two Supabase tables hold this data:
- `public.usuarios` — personal info, extended by three migrations (estado, tipo_identificacion / numero_identificacion / rh).
- `public.perfil_deportivo` — one-to-one optional sports profile linked by `user_id`.

The portal layout file (`src/app/portal/layout.tsx`) wraps all `/portal/*` routes, so header, nav, and auth guard are already provided.

## Goals / Non-Goals

**Goals:**
- Provide a functional profile page at `src/app/portal/perfil/page.tsx` (global, not tenant-scoped).
- Allow any authenticated user to read and update their `usuarios` row and `perfil_deportivo` row.
- Render an editable form that matches the visual design in `projectspec/designs/11_Perfil.html`.
- Track dirty state so Save / Cancel buttons enable/disable correctly.
- Show avatar (from `foto_url`) or initials fallback; render a non-functional upload placeholder button.
- Remove the misleading tenant-scoped stub page.
- Verify/add the necessary RLS policies in a migration.

**Non-Goals:**
- Avatar image upload (file storage integration) — placeholder only.
- Email change — email is auth-managed, shown read-only.
- Password change — out of scope.
- Role changes or tenant membership management — handled elsewhere.
- Admin-level profile editing of other users — only own profile.
- Notification preferences or settings beyond the profile fields described.

## Decisions

### 1. Route placement: `/portal/perfil` (global) over `orgs/[tenant_id]/(shared)/perfil`

**Decision:** Create `src/app/portal/perfil/page.tsx`.

**Rationale:** Profile data does not belong to a tenant context. Placing it at the global portal level:
- Matches the existing `UserAvatarMenu` link (`/portal/perfil`) — no navigation change required.
- Removes the coupling to a `tenant_id` URL parameter that profile queries don't need.
- Works even when the user is not inside any organization.

**Alternative considered:** Redirect from the shared stub — rejected because it leaves a dead route and adds a navigation hop.

---

### 2. Feature slice structure: page → component → hook → service → types

**Decision:** Follow the standard hexagonal feature-slice convention:

```
src/
  app/portal/perfil/page.tsx                     ← thin delivery layer (Server Component shell)
  components/portal/perfil/
    PerfilPage.tsx                                ← orchestrator, calls usePerfil
    PerfilHeader.tsx                              ← avatar, name, save/cancel buttons
    PerfilPersonalForm.tsx                        ← personal info grid
    PerfilDeportivoForm.tsx                       ← sports profile grid
    index.ts                                      ← barrel export
  hooks/portal/perfil/
    usePerfil.ts                                  ← fetch, form state, dirty tracking, submit
  services/supabase/portal/
    perfil.service.ts                             ← getPerfil, updatePerfil, upsertPerfilDeportivo
  types/portal/
    perfil.types.ts                               ← PerfilUsuario, PerfilDeportivo, PerfilFormValues, …
```

**Rationale:** Every other portal feature uses this exact layout (`gestion-equipo`, `planes`, `entrenamientos`, etc.). Consistency reduces cognitive overhead.

---

### 3. Combined fetch with `Promise.all`

**Decision:** `getPerfil(userId)` issues both Supabase queries in parallel and returns `{ usuario, deportivo }`.

**Rationale:** The page needs data from two tables on mount. Sequential fetches would add unnecessary latency. Both queries are scoped to the same `userId` and are independent.

**Alternative considered:** Separate hooks per table — rejected because it splits loading state management across two hooks, complicating the form snapshot / dirty-track logic.

---

### 4. Upsert for `perfil_deportivo`

**Decision:** `upsertPerfilDeportivo` uses Supabase `.upsert()` on conflict `(user_id)`.

**Rationale:** `perfil_deportivo` rows are optional — many users may not have one yet. An upsert handles both the insert (first save) and update (subsequent saves) without the caller needing to know which case applies.

---

### 5. Client Component form, Server Component page shell

**Decision:** `src/app/portal/perfil/page.tsx` is a minimal Server Component that simply renders `<PerfilPage />`. All interactivity lives in `PerfilPage.tsx` (Client Component with `"use client"`).

**Rationale:** Next.js App Router recommends pushing `"use client"` as far down the tree as possible. The page shell benefits from server-side metadata/auth guard; the form itself needs client state.

---

### 6. Dirty-state tracking via snapshot

**Decision:** `usePerfil` stores a `savedSnapshot: PerfilFormValues` alongside `formValues`. `isDirty` is computed as a deep equality check between the two. `cancel()` resets `formValues` to `savedSnapshot`.

**Rationale:** Simple, predictable, no external state-management library needed. Pattern is already used in other hooks in the project.

---

### 7. RLS migration for profile

**Decision:** Add a new migration file if the UPDATE policy on `usuarios` or the INSERT/UPDATE/SELECT policies on `perfil_deportivo` are missing.

**Required policies:**
- `usuarios_update_own` — `FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())`
- `perfil_deportivo_select_own` — `FOR SELECT TO authenticated USING (user_id = auth.uid())`
- `perfil_deportivo_insert_own` — `FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())`
- `perfil_deportivo_update_own` — `FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`

**Rationale:** Without these, Supabase RLS will silently reject or error on writes. Must be verified against existing migrations before creating new ones to avoid duplicates.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `perfil_deportivo` row may not exist for the user | `getPerfil` returns `deportivo: null`; form defaults to empty strings; `upsertPerfilDeportivo` handles the insert path |
| RLS policy already exists (duplicate migration) | Read all existing migrations before writing the new one; use `IF NOT EXISTS` / `CREATE POLICY ... IF NOT EXISTS` or check pg_policies |
| Avatar upload button could be confused as functional | Wrap in `<button disabled>` with `title="Próximamente"` and a visual lock/coming-soon badge |
| `foto_url` may be null or an expired presigned URL | Fallback to initials computed from `nombre` + `apellido`; no broken `<img>` |
| Stub page at `(shared)/perfil/page.tsx` could resurface in future merges | Delete the file rather than leaving a redirect; update project structure doc |

## Migration Plan

1. **Verify RLS policies** against existing migrations (`supabase/migrations/`).
2. **Create migration** (if needed) with the missing policies — file name pattern: `YYYYMMDDHHMMSS_add_perfil_rls_policies.sql`.
3. **Apply migration** locally with `supabase db reset` or `supabase migration up`.
4. **Delete stub page** `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx`.
5. **Create files** in order: types → service → hook → components → route page.
6. **Update** `projectspec/03-project-structure.md` with new perfil entries.
7. **Test locally** — navigate via avatar menu, verify read, edit, save, cancel flows.

**Rollback:** If the feature is reverted, restore the stub page and drop the migration. No data is deleted by this change.

## Open Questions

- **foto_url storage**: When avatar upload is eventually implemented, will it use Supabase Storage buckets or an external CDN? This affects the `foto_url` column format — for now, display only.
- **Peso / Altura precision**: `peso_kg numeric(3,2)` allows values up to 9.99 — is this intentional (should it be `numeric(5,2)` for realistic 100+ kg values)? Flag for review but do not change schema in this US.
