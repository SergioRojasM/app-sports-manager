# US-0133 — Tenant Public Visibility in the Organizations Marketplace

## ID
US-0133

## Name
Let the tenant administrator decide whether the organization is listed publicly in "Organizaciones disponibles" and can receive access requests; redesign the organization card after the events card and flag the organizations the user belongs to with a "Miembro" badge.

## As a
Tenant administrator

## I Want
To mark my organization as public or private

## So That
I control whether people outside my organization can discover it in the organizations marketplace and request access, or whether new members can only join when I add them myself.

---

## Description

### Current State
- `/portal/orgs` (`PortalTenantsPage`, title "Organizaciones disponibles") lists **every** tenant except the system tenant named `public`. The list comes from `tenantService.listVisibleTenantsForPortal`, which reads `tenants` with no visibility filter.
- For every organization where the user has no membership, the card shows `SolicitarAccesoButton`, so any authenticated user can request access to any organization.
- `miembros_tenant_solicitudes` has the insert policy `solicitudes_insert_own`, which only checks `usuario_id = auth.uid()`. Nothing at database level restricts which tenant a request targets.
- The administrator has no setting to take the organization out of the marketplace.
- The directory renders `TenantIdentityCard` (also used by `gestion-organizacion` through `TenantInfoCards`): a 96 px banner with an overlapping 80 px logo, the description inside an uppercase pill, an English "Founded" row and full-width stacked actions. It does not look like the rest of the discovery UI (`EventoPublicoCard`, US-0120), and the only hint of membership is the action label ("Ingresar" vs "Solicitar acceso").

### Proposed Changes

#### Visibility model
A new column `tenants.publico boolean not null default true`.

| `publico` | Listed in "Organizaciones disponibles" for non-members | Access requests |
|-----------|--------------------------------------------------------|-----------------|
| `true` | Yes | Allowed (current behavior) |
| `false` | No | Rejected (UI, service and RLS) |

Rules:
- Existing tenants are migrated to `publico = true`, so nothing changes until an administrator turns it off. New tenants also default to `true`.
- A user who **already has a membership row** in a private organization (any `miembros_tenant.estado`) keeps seeing its card in "Organizaciones disponibles", with the same action as today ("Ingresar"). Private only hides the organization from non-members.
- The system tenant named `public` stays excluded from the list regardless of the flag (existing `.neq('nombre', 'public')` filter is kept).
- Turning an organization private does **not** modify existing data:
  - Requests already in `pendiente` stay pending and the administrator can still accept or reject them from "Gestión de equipo › Solicitudes". Once accepted, the user is a member and sees the card again.
  - Blocked users, rejection counters and `max_solicitudes` are untouched.
- Turning it public again restores the previous behavior immediately (no data to restore).
- Invitations and managed provisioning (US-0114) are unaffected: they are the way to add members to a private organization.

#### Out of scope (unchanged on purpose)
- The `tenants_select_authenticated` RLS policy stays `using (true)`. The organization name/logo is joined by many features that non-members legitimately use (public events, "Mis Suscripciones", "Mis Entradas", pending invitations, form headers). Privacy here means "not listed and not requestable", not "row unreadable".
- Public events (`eventos.publico`) and public plans (`planes.es_publico`) of a private organization keep working as today. The "Ver planes" button lives on the organization card, so for non-members it disappears together with the card.
- No status badge on `gestion-organizacion`; the current value is visible in the edit drawer.
- `TenantIdentityCard` keeps its current look on `gestion-organizacion`; only the directory gets the new card.

#### UI — Organization edit form (`EditTenantForm`)
- Add a checkbox `id="publico"` placed immediately **above** the "Máximo de solicitudes rechazadas antes de bloqueo" field, following the existing `requiere_perfil_completo` markup (helper `<span>` + `<label>` with checkbox, `aria-describedby`).
  - Label: "Organización pública"
  - Helper text (`id="publico-desc"`): "Cuando está activo, la organización aparece en «Organizaciones disponibles» y cualquier usuario puede solicitar acceso. Si lo desactivas, solo la verán sus miembros y no recibirá nuevas solicitudes."
- When the checkbox is unchecked, show below it (`role="status"`, amber `text-grit-warning` style used elsewhere for notices): "Las solicitudes pendientes se conservan y puedes seguir gestionándolas. Para sumar miembros nuevos usa «Agregar miembro» en Gestión de equipo."
- The value is saved with the rest of the form through the existing "Guardar" action; there is no separate save.
- `max_solicitudes` and `requiere_perfil_completo` remain editable while private (they still apply to pending requests and apply again if the organization becomes public).

#### UI — "Organizaciones disponibles" (`PortalTenantsPage`)
- The list shows: public organizations + organizations where the user has a membership.
- Empty state: when the resulting list is empty, render a card with the text "No hay organizaciones disponibles por ahora." instead of an empty grid (today the grid can never be empty, so this state does not exist).
- Cards are rendered with the new `TenantDirectoryCard` (next section); the grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, `gap-5`) and the alphabetical order are kept.

#### UI — Organization card (`TenantDirectoryCard`, new)
A directory-only card that copies the structure and classes of `EventoPublicoCard` (it does not import it). `TenantIdentityCard` is no longer used by `TenantDirectoryList`.

Props: `identity: TenantIdentityPayload`, `isMember: boolean`, `isPublic: boolean`, `primaryAction: React.ReactNode`, `secondaryAction?: React.ReactNode`.

Layout:
- **Shell**: `<article>` with `flex flex-col overflow-hidden rounded-grit-2xl border`. Border `border-grit-cyan/60` plus the event card's featured glow (`shadow-[0_0_32px_rgba(20,219,196,0.15)]`) when `isMember`, otherwise `border-grit-glass-border`.
- **Banner area**: `relative h-44 w-full overflow-hidden`.
  - With banner: `<img>` `h-full w-full object-cover`, `loading="lazy"`, `alt="Banner de {name}"`.
  - Without banner (or after the image fails): `bg-gradient-to-br from-grit-card to-grit-bg` with a centered `GritIcon name="shield" size={48}` at `opacity-60`.
  - **Top-left chips** (`absolute left-3 top-3 flex flex-wrap gap-1.5`, same chip classes as the event card's "Próximo" / "Solo miembros"):
    - `isMember` → cyan chip (`border-grit-cyan/50 bg-grit-bg/80 text-grit-cyan`), icon `verified`, text **"Miembro"**.
    - `!isPublic` → neutral chip (`border-grit-glass-border bg-grit-bg/80 text-grit-text`), icon `lock`, text **"Privada"**. Only members can ever see it, since private organizations are hidden from everyone else.
  - **Logo**: 48 px circle at `absolute bottom-3 left-3`, `border border-grit-glass-border bg-grit-bg/80`, `alt="Logo de {name}"`; when there is no logo (or it fails) show `GritIcon name="shield"`.
  - No "Ver" banner-zoom button and no top-right chip.
- **Body**: `flex flex-1 flex-col gap-2 bg-grit-card p-3.5 backdrop-blur`.
  - `<h3>` name: `font-grit-title text-lg font-bold italic text-grit-text`.
  - Description (only when present): `line-clamp-2 whitespace-pre-wrap font-grit-body text-sm text-grit-subtext`. The uppercase pill is removed.
  - Meta line (only when `foundedAt` is a valid date): `flex items-center gap-1 font-grit-body text-[11px] text-grit-subtext`, `GritIcon name="calendar_month" size={13}` in cyan + "Desde {mes} de {año}" formatted with `es-CO` (replaces the English "Founded" row and the `en-US` date).
  - Actions: `mt-auto flex flex-col gap-2 pt-1` containing `primaryAction` then `secondaryAction`. Existing action components are reused unchanged, so they stay full width and stacked (`SolicitarAccesoButton` expands inline for its confirmation and history, which rules out the event card's single-row footer).
- Image fallback: the signed-URL retry that `TenantIdentityCard` runs on logo/banner load errors (`buildOrgLogoPath` / `buildOrgBannerPath` + `storageService.getSignedUrl`, one attempt, extensions png/jpg/webp) is extracted to a new hook `useTenantBrandingImages(identity)` returning `{ logoSrc, bannerSrc, onLogoError, onBannerError }`, used by both cards so the behavior is not duplicated.

Membership badge rules:
- "Miembro" is shown whenever the user has a membership row for the organization, for every role (administrador, entrenador, usuario) and for both public and private organizations. It is a single label; the role is not shown.
- Non-member cards show no badge.

`TenantDirectoryList` wiring:
- Member: `isMember`, `primaryAction` = "Ingresar" link to `getDefaultTenantPath(...)` (classes of the event card's primary button: `rounded-grit-md bg-grit-cyan px-4 py-2 font-grit-body text-sm font-semibold text-grit-bg hover:bg-grit-cyan-light`, full width, centered), `secondaryAction` = `VerPlanesButton`.
- Non-member: `primaryAction` = `SolicitarAccesoButton`, `secondaryAction` = `VerPlanesButton`.
- `isPublic` comes from the new `PortalTenantListItem.isPublic`.

#### Logic — Access request
- `solicitudesService.createSolicitud` rejects the request when the tenant is private, with a new error code `private_org` and message "Esta organización no está recibiendo solicitudes de acceso." The check reuses the existing "Guard 3" tenant read (select `requiere_perfil_completo, publico`) and runs **before** the profile-completeness check.
- `SolicitarAccesoButton` already renders `submitError` inline, so the message surfaces without component changes. This path is only reachable from a stale page (the card was rendered before the admin switched to private).
- The database rejects the insert as well (see RLS below), so the rule cannot be bypassed by calling the API directly.

---

## Database Changes

New migration `supabase/migrations/20261010120000_tenants_publico.sql`:

```sql
begin;

-- 1. Visibility flag. Existing tenants stay listed (no behavior change).
alter table public.tenants
  add column if not exists publico boolean not null default true;

comment on column public.tenants.publico is
  'US-0133: when false the organization is hidden from the organizations marketplace for non-members and cannot receive access requests.';

-- 2. Access requests can only target public organizations.
drop policy if exists solicitudes_insert_own on public.miembros_tenant_solicitudes;
create policy solicitudes_insert_own on public.miembros_tenant_solicitudes
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1
      from public.tenants t
      where t.id = tenant_id
        and t.publico
    )
  );

commit;
```

Notes:
- No new table, so no new RLS set. Only `solicitudes_insert_own` changes; `solicitudes_select_own`, `solicitudes_select_admin` and `solicitudes_update_admin` are untouched, which is what keeps pending requests manageable after going private.
- Writing `publico` is already covered by `tenants_update_admin_only` (only administrators of the tenant can update the row). No new grant is needed.
- `tenants_select_authenticated` is intentionally not changed (see "Out of scope").
- No index: `tenants` is a small table and the directory query already scans it.
- `supabase/seed.sql` needs no edit; its explicit column list omits `publico`, so the default applies.

---

## API / Server Actions

No new route handlers or RPCs. All changes are in existing browser-client services.

### `src/services/supabase/portal/tenant.service.ts`
- **`TenantRow`**: add `publico: boolean`.
- **`fetchTenantById(supabase, tenantId)`**: add `publico` to the select list.
- **`mapTenantToEditFormValues(tenant)`**: add `publico: String(tenant.publico ?? true)`.
- **`updateTenant(supabase, userId, tenantId, payload)`**: no code change; `payload` (`TenantEditPayload`) now carries `publico: boolean`. Auth: existing `canUserAccessTenant` check + `tenants_update_admin_only` RLS.
- **`listVisibleTenantsForPortal(supabase, memberTenantIds: string[])`** (signature change):
  - Input: the tenant ids where the current user has a membership.
  - Query: same select (plus `publico`) and ordering as today, keeping `.neq('nombre', 'public')`, plus:
    - `memberTenantIds.length === 0` → `.eq('publico', true)`
    - otherwise → `.or('publico.eq.true,id.in.(<comma-separated ids>)')`
  - Returns `TenantRow[]`. Auth: authenticated session; `tenants_select_authenticated`.

- **`mapPortalTenants(tenants, memberships)`**: also set `isPublic: tenant.publico` on each item.

### `src/hooks/portal/tenant/useTenantBrandingImages.ts` (new)
- **`useTenantBrandingImages(identity: TenantIdentityPayload)`** → `{ logoSrc: string | null; bannerSrc: string | null; onLogoError: () => void; onBannerError: () => void }`. Logic moved as is from `TenantIdentityCard`. Auth: authenticated session (signed URLs from the org assets bucket).

### `src/hooks/portal/tenant/useTenantView.ts`
- In `mode === 'directory'`, replace the `Promise.all` with a sequential load: first `listUserTenantMemberships(supabase, user.id)`, then `listVisibleTenantsForPortal(supabase, memberships.map((m) => m.tenantId))`, then `mapPortalTenants` as today.

### `src/services/supabase/portal/solicitudes.service.ts`
- **`createSolicitud(input: CreateSolicitudInput): Promise<void>`**: in Guard 3 select `requiere_perfil_completo, publico`; if `tenantFlag.publico === false` throw `new SolicitudesServiceError('private_org', 'Esta organización no está recibiendo solicitudes de acceso.')` before the profile check. Auth: authenticated; final enforcement by `solicitudes_insert_own`.

### `src/types/portal/solicitudes.types.ts`
- Add `'private_org'` to the `SolicitudesServiceError` code union.

### `src/types/portal/tenant.types.ts`
- `TenantEditFormValues`: add `publico: string` (`'true' | 'false'`, same convention as `requiere_perfil_completo`).
- `TenantEditPayload`: add `publico: boolean`.
- `PortalTenantListItem`: add `isPublic: boolean`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261010120000_tenants_publico.sql` | Add `tenants.publico`; recreate `solicitudes_insert_own` requiring a public tenant |
| Types | `src/types/portal/tenant.types.ts` | `publico` in `TenantEditFormValues` and `TenantEditPayload`; `isPublic` in `PortalTenantListItem` |
| Types | `src/types/portal/solicitudes.types.ts` | New error code `private_org` |
| Service | `src/services/supabase/portal/tenant.service.ts` | `TenantRow.publico`, select in `fetchTenantById`, `mapTenantToEditFormValues`, `listVisibleTenantsForPortal(supabase, memberTenantIds)` filter, `isPublic` in `mapPortalTenants` |
| Service | `src/services/supabase/portal/solicitudes.service.ts` | Private-organization guard in `createSolicitud` |
| Hook | `src/hooks/portal/tenant/useTenantView.ts` | Directory mode: load memberships first, pass ids to the list query |
| Hook | `src/hooks/portal/tenant/useEditTenant.ts` | `publico: 'true'` in `EMPTY_VALUES`; `publico: values.publico === 'true'` in `toPayload` |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | "Organización pública" checkbox, helper text and private-state notice |
| Hook | `src/hooks/portal/tenant/useTenantBrandingImages.ts` | New hook: logo/banner signed-URL fallback extracted from `TenantIdentityCard` |
| Component | `src/components/portal/tenant/TenantDirectoryCard.tsx` | New directory card modeled on `EventoPublicoCard`, with "Miembro" / "Privada" chips |
| Component | `src/components/portal/tenant/TenantDirectoryList.tsx` | Render `TenantDirectoryCard`; pass `isMember`, `isPublic` and the actions |
| Component | `src/components/portal/tenant/TenantIdentityCard.tsx` | Use `useTenantBrandingImages`; no visual change |
| Component | `src/components/portal/PortalTenantsPage.tsx` | Empty state when no organization is listed |
| Docs | `projectspec/03-project-structure.md` | Note US-0133 on `orgs/page.tsx`, `tenant.service.ts`, `tenant.types.ts`, `solicitudes.service.ts`; add `TenantDirectoryCard.tsx` and `useTenantBrandingImages.ts` |

---

## Acceptance Criteria

1. After the migration, every existing tenant has `publico = true` and "Organizaciones disponibles" shows exactly the same organizations as before.
2. An administrator opening "Editar" in `gestion-organizacion` sees the "Organización pública" checkbox reflecting the stored value (checked for existing organizations).
3. Unchecking it and saving stores `tenants.publico = false`; reopening the drawer shows it unchecked. Checking it again and saving stores `true`.
4. While the checkbox is unchecked, the notice about pending requests and "Agregar miembro" is visible; it disappears when checked.
5. A user with no membership in a private organization does not see its card in "Organizaciones disponibles" (and therefore sees neither "Solicitar acceso" nor "Ver planes" for it).
6. A user with a membership in a private organization (administrator, trainer or athlete) still sees its card with "Ingresar" and can enter it.
7. A user who had a pending request when the organization became private no longer sees the card; the request still appears as pending in the administrator's "Solicitudes" tab and can be accepted or rejected. After acceptance the user sees the card with "Ingresar".
8. With a stale page (card rendered before the change), confirming "Solicitar acceso" on a now-private organization creates no row and shows "Esta organización no está recibiendo solicitudes de acceso." inline.
9. A direct `insert` into `miembros_tenant_solicitudes` for a private tenant, made with an authenticated non-member session through the Supabase client, is rejected by RLS.
10. Access requests to public organizations work exactly as before, including the duplicate, blocked and incomplete-profile guards.
11. The system tenant `public` is never listed, whatever its `publico` value.
12. If the resulting list is empty (no public organizations and no memberships), the page shows "No hay organizaciones disponibles por ahora." and no empty grid.
13. A non-administrator member cannot change `publico` (the update is rejected by `tenants_update_admin_only`).
14. Public events of a private organization still show the organization name on `/eventos` and `/portal/eventos`, and pending invitations from a private organization still render in `InvitacionesPendientesSection`.
15. Every card of an organization where the user has a membership shows the "Miembro" chip over the banner and the highlighted cyan border, for all three roles; cards of organizations where the user is not a member show neither.
16. A member's card of a private organization shows both "Miembro" and "Privada"; a member's card of a public organization shows only "Miembro".
17. The directory card follows the events card: `rounded-grit-2xl` shell, banner area on top with overlay chips, italic title, two-line clamped description, actions pinned to the bottom so cards in the same row align.
18. An organization without banner shows the gradient placeholder with the shield icon; without logo, the shield icon inside the logo circle. A broken image URL falls back the same way after the signed-URL retry.
19. An organization without description or founding date renders without empty rows or "—" placeholders; the founding date reads in Spanish ("Desde marzo de 2026").
20. "Ingresar", "Solicitar acceso" (with its confirmation, pending, blocked, incomplete-profile and history states) and "Ver planes" behave exactly as before inside the new card.
21. The organization card on `gestion-organizacion` looks the same as before this story.
22. The directory is usable at 360 px width: no horizontal scroll, chips wrap, long names wrap.
23. `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Create `20261010120000_tenants_publico.sql` and apply it locally
- [ ] Add `publico` to `TenantEditFormValues` / `TenantEditPayload` and `private_org` to the solicitudes error codes
- [ ] Update `tenant.service.ts`: `TenantRow`, `fetchTenantById` select, `mapTenantToEditFormValues`, `listVisibleTenantsForPortal` filter
- [ ] Update `useTenantView` directory mode to load memberships first and pass their tenant ids
- [ ] Update `useEditTenant` (`EMPTY_VALUES`, `toPayload`)
- [ ] Add the checkbox, helper text and notice to `EditTenantForm`
- [ ] Add the private-organization guard to `solicitudesService.createSolicitud`
- [ ] Extract `useTenantBrandingImages` from `TenantIdentityCard` and switch that card to it
- [ ] Build `TenantDirectoryCard` and wire it in `TenantDirectoryList` (`isMember`, `isPublic`, actions)
- [ ] Add the empty state to `PortalTenantsPage`
- [ ] Verify in Supabase: `solicitudes_insert_own` rejects a private tenant and accepts a public one; a non-admin cannot update `tenants.publico`
- [ ] Test manually: admin toggles private/public; non-member, member and pending-request user views; stale-page request; empty list; cards with and without banner/logo/description; mobile width; `gestion-organizacion` card unchanged
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npm run lint` and `npm run build`

---

## Non-Functional Requirements

- **Security**: The "no requests to private organizations" rule is enforced by RLS (`solicitudes_insert_own`), not only by the UI/service. Only tenant administrators can write `publico` (`tenants_update_admin_only`). The tenant ids interpolated into the `.or(...)` filter come from the user's own `miembros_tenant` rows (UUIDs), never from user input. Hiding a card is a listing rule, not a confidentiality guarantee: the tenant row remains readable to authenticated users by design.
- **Performance**: The directory makes two sequential queries instead of two parallel ones; both are small. Filtering happens in the database, so private organizations are not sent to non-members. No index required.
- **Accessibility**: The checkbox has a visible `<label>` and `aria-describedby="publico-desc"`; the private-state notice uses `role="status"`; the control is keyboard-operable and disabled while submitting, like the neighboring fields. In the card, membership is conveyed by the "Miembro" text and icon, not only by the border color; chip icons are decorative (`aria-hidden`); banner and logo images have descriptive `alt` text; the title stays an `<h3>` under the page heading.
- **Error handling**: A rejected request shows the message inline under `SolicitarAccesoButton` (existing `submitError`). Save failures in the edit drawer use the existing "No fue posible guardar los cambios. Inténtalo nuevamente." message. Directory load failures keep the existing error card with "Reintentar".
