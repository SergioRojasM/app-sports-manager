## Why

Clubs can already mark a training `visibilidad = 'publico'`, but nothing in the app ever reads that flag — there is no page where an athlete outside the organization can discover it, and the toggle itself lets an admin flip a training cross-tenant with no price, no marketing image, and no review step. US-0089 closes that gap: a deliberate "Publicar" action that snapshots a curated public listing (with its own price and banner), and a dedicated `/portal/entrenamientos-publicos` marketplace page — reusing this project's existing tech stack (Next.js App Router, Supabase/Postgres with RLS, TypeScript, Tailwind) and, critically, the *existing* reservation pipeline so bookings, forms, and restrictions keep working exactly as they do today.

## What Changes

- Add a new `entrenamientos_publicos` table: a denormalized, admin-curated snapshot of a single `entrenamientos` row (never the series/group), plus two new marketing fields (`precio`, `banner_url`) and a soft `activo` unpublish flag.
- Add a **pre-publish validation gate**: a training with any servicio-based restriction (`entrenamiento_restricciones.servicio_1_id`…`servicio_4_id`) cannot be published, enforced at three layers (disabled UI button, service pre-check, DB trigger). Trainings whose only restriction is the advance-notice window (`reserva_antelacion_horas`/`cancelacion_antelacion_horas`) remain publishable.
- Add a **"Publicar"/"Gestionar publicación"** admin-only action to the existing training options modal (`EntrenamientoActionModal.tsx`), opening a new modal with a live card preview + editable fields (nombre, descripción, precio, banner upload) and a "Despublicar" action.
- **BREAKING (UI only)**: remove the `Privado`/`Público` radio group from the training creation/edit wizard (`EntrenamientoWizard.tsx`). New trainings are always created `privado`; publishing is now the only path to cross-tenant visibility. The underlying `visibilidad`/`visible_para` columns and their RLS policy are left untouched for backward compatibility with any pre-existing `publico` rows.
- Add a new, non-tenant-scoped **"Entrenamientos Públicos"** page (`/portal/entrenamientos-publicos`) — a marketplace grid of published trainings with date/search/organization filters, styled per `projectspec/designs/pencil/grit-arena.pen` (node `ql3Ij`) — and a new dropdown menu entry linking to it, visible to any authenticated user who has not entered a tenant.
- **Reserving from the marketplace reuses today's booking pipeline as-is**: clicking "Reservar" opens the existing `ReservaFormModal`/`FormularioRespuestaModal` targeting the publication's `entrenamiento_id`, so restrictions, formularios, and advance-notice rules are enforced identically to a same-tenant booking — no new booking/restriction logic is introduced.
- Add a new Storage RLS SELECT policy so publication banners (stored under `orgs/{tenantId}/entrenamientos-publicos/`) are readable by any authenticated user, not just tenant members — required for a cross-tenant marketplace visitor to see the image.

## Capabilities

### New Capabilities
- `public-training-marketplace`: the `entrenamientos_publicos` table and RLS, the publish/despublish action (including the servicio-restriction pre-publish gate), the marketplace browsing page (filters, grid, featured card, widget), and the thin booking wrapper that reuses the existing reservation pipeline for cross-tenant visitors.

### Modified Capabilities
- `training-management`: the "Training instance visibility assignment" requirement changes — the wizard no longer exposes an editable `Privado`/`Público` radio group; new trainings always persist `visibilidad = 'privado'`, and an existing non-`'privado'` value is shown read-only.
- `portal-role-navigation`: the non-tenant-scoped dropdown menu (`resolvePortalMenu` when `!tenantId`) gains a new "Entrenamientos Públicos" entry, visible to every authenticated role.
- `object-storage`: adds a new RLS SELECT policy on `storage.objects` granting any authenticated user (not just tenant members) read access to files under `orgs/{tenantId}/entrenamientos-publicos/`, since these banners must be visible to cross-tenant marketplace visitors.

## Impact

- **Database**: one new migration — new table `entrenamientos_publicos` (RLS enabled, 4 policies, 1 validation trigger, indexes), plus one new `storage.objects` RLS policy. No existing table is altered or dropped.
- **Types**: new `src/types/portal/entrenamientos-publicos.types.ts`; small additions to `src/types/portal/storage.types.ts` (banner path builder) and `src/types/portal.types.ts` (new menu item).
- **Services**: new `src/services/supabase/portal/entrenamientos-publicos.service.ts`; small addition to `src/services/supabase/portal/storage.service.ts`. No changes to `reservas.service.ts`, `entrenamientos.service.ts` (read-only reuse), or their RPCs.
- **Hooks**: new hooks under `src/hooks/portal/entrenamientos-publicos/`; a small addition to `src/hooks/portal/entrenamientos/useEntrenamientos.ts` (published-id lookup for button labeling).
- **Components**: new feature slice `src/components/portal/entrenamientos-publicos/`; modifications to `EntrenamientoActionModal.tsx`, `EntrenamientosPage.tsx`, and `EntrenamientoWizard.tsx` under `src/components/portal/entrenamientos/`.
- **Routing**: `src/app/portal/entrenamientos-publicos/page.tsx` goes from an empty placeholder to a render-only page.
- **Dependencies**: none new — reuses existing Supabase client, existing reservation/formulario components, and the existing `org-assets` storage bucket.
