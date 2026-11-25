# US-0117 — Public Training Detail Inside the Portal Shell

## ID
US-0117

## Name
Portal-scoped public training detail route (`/portal/entrenamientos-publicos/[entrenamiento_id]`) with a Portal-aware card link and breadcrumb

## As a
Authenticated Portal user (athlete, coach, or administrator)

## I Want
To open a public training's detail from the Portal marketplace and stay inside the Portal: same header, role menu, notifications, avatar and breadcrumb.

## So That
I don't lose my Portal navigation context when I look at a training, and I can go back to where I came from (global marketplace or my organization's "Entrenamientos disponibles") with one click.

> **Depends on US-0116.** This story reuses `PublicTrainingDetalleBody`, `PublicTrainingDetalleStates`, the `ui/grit` kit and the restyled Portal breadcrumb introduced there. No visual work is defined here.

---

## Description

### Current State

- `PublicTrainingCard` (`src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx`) always builds `detalleHref = /entrenamientos-publicos/{id}?from=<pathname>`. That is the case on the public listing, on `/portal/entrenamientos-publicos` and on `/portal/orgs/{tenant}/entrenamientos-disponibles`.
- `/entrenamientos-publicos/[id]` renders outside `src/app/portal/layout.tsx`. A logged-in user who clicks "Ver detalles" in the Portal leaves the Portal shell (no `PortalHeader`, no role menu, no avatar).
- `PortalBreadcrumb` has no label for `entrenamientos-publicos`. It also treats the first UUID in any path as a tenant id, so a path like `/portal/entrenamientos-publicos/{uuid}` would show `…` (or a wrong name) for the training.
- `resolveOrigin(from)` lives inside `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx` and accepts any same-origin absolute path.

### Proposed Changes

#### 1. Relocate shared pieces (no behavior change)

Two routes now consume the detail components, so move them next to the marketplace slice:
- `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalle{Hero,Descripcion,Incluye,Cronograma,Ubicacion,Reserva,Precios,Body,CtaBanner,States}.tsx` → `src/components/portal/entrenamientos-publicos/detalle/`, with a barrel `index.ts`.
- `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts` → `src/hooks/portal/entrenamientos-publicos/usePublicTrainingDetalle.ts`.
- The public page `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx` stays where it is and updates its imports.

#### 2. Origin resolution

Create `src/lib/portal/entrenamientos-publicos/resolveOrigin.ts`:

```ts
export const PUBLIC_LISTADO_PATH = '/entrenamientos-publicos';
export const PORTAL_LISTADO_PATH = '/portal/entrenamientos-publicos';

/** Existing rule, moved verbatim: same-origin absolute path, never protocol-relative. */
export function resolvePublicOrigin(from: string | null): string;

/** Only `/portal/...` paths; anything else (incl. `//x`, `https://x`, `/entrenamientos-publicos`) → PORTAL_LISTADO_PATH. */
export function resolvePortalOrigin(from: string | null): string;
```

The public page replaces its local `resolveOrigin` with `resolvePublicOrigin`. Its behavior must be identical.

#### 3. Portal-aware card link

In `PublicTrainingCard.tsx`:

```ts
const detalleBase = pathname.startsWith('/portal') ? PORTAL_LISTADO_PATH : PUBLIC_LISTADO_PATH;
const detalleHref = data.entrenamientoId
  ? `${detalleBase}/${data.entrenamientoId}?from=${encodeURIComponent(pathname)}`
  : null;
```

The `PublicarEntrenamientoModal` preview (no `entrenamientoId`) still renders no link.

#### 4. Breadcrumb override

Create `src/components/portal/PortalBreadcrumbContext.tsx` (`'use client'`):

```ts
type PortalBreadcrumbOverride = { lastLabel?: string; parentHref?: string };

export function PortalBreadcrumbProvider({ children }: { children: React.ReactNode }): JSX.Element;
/** Sets the override while the calling component is mounted; clears it on unmount or when args change. */
export function usePortalBreadcrumbOverride(override: PortalBreadcrumbOverride | null): void;
export function usePortalBreadcrumbOverrideValue(): PortalBreadcrumbOverride | null;
```

- `src/app/portal/layout.tsx` wraps the header, breadcrumb row and `<main>` in `PortalBreadcrumbProvider`. The provider is a client component; the layout stays a server component.
- `PortalBreadcrumb.tsx`:
  - Adds `SLUG_LABELS['entrenamientos-publicos'] = 'Entrenamientos públicos'` if US-0116 has not already added it.
  - Resolves UUID segments as tenant/plantilla names **only** under `/portal/orgs/{tenant_id}/…`, which is the current behavior for those paths. Any other UUID segment shows `override.lastLabel` when it is the last segment, and `…` until then.
  - When `override.parentHref` is set, it replaces the href of the second-to-last crumb.

#### 5. New Portal route

`src/app/portal/entrenamientos-publicos/[entrenamiento_id]/page.tsx`:

```tsx
export const metadata: Metadata = { title: 'Entrenamiento público | GRIT Arena' };

export default async function Page({ params }: { params: Promise<{ entrenamiento_id: string }> }) {
  const { entrenamiento_id } = await params;
  return (
    <Suspense fallback={null}>
      <PortalPublicTrainingDetallePage entrenamientoId={entrenamiento_id} />
    </Suspense>
  );
}
```

`src/components/portal/entrenamientos-publicos/detalle/PortalPublicTrainingDetallePage.tsx` (`'use client'`):
- `const { item, loading, error, refetch } = usePublicTrainingDetalle(entrenamientoId)`.
- `const origin = resolvePortalOrigin(useSearchParams().get('from'))`.
- `usePortalBreadcrumbOverride(item ? { lastLabel: item.nombre, parentHref: origin } : { parentHref: origin })`.
- Renders inside `GritPageContainer`:
  - loading / error (`refetch`) / not found via `PublicTrainingDetalleStates` with `listadoHref={PORTAL_LISTADO_PATH}`;
  - otherwise `PublicTrainingDetalleBody` with `onReservar={() => setReservaOpen(true)}` and `reservarDisabled={false}`. The user is always authenticated here, so `RegistrateParaReservarModal` is never used.
- Renders `PublicTrainingReservaModal` with the same props the public page passes today (`tenantId`, `entrenamientoId`, `disciplinaId`, `trainingNombre`, `tenantNombre`, `omitirConfirmacionPlan`).
- It has no public navbar/footer and no page-level breadcrumb. The Portal shell provides both.

#### 6. Public route

`/entrenamientos-publicos/[entrenamiento_id]` keeps working for everyone (anonymous and logged in), because external links and shared URLs point there. It is not redirected to the Portal route.

---

## Database Changes

None. The Portal route reads the same anon-safe view through `entrenamientosPublicosService.getPublicTrainingDetail`. That view is already readable by the `authenticated` role (the Portal marketplace reads it today); verify during testing.

---

## API / Server Actions

- **Reused unchanged**: `entrenamientosPublicosService.getPublicTrainingDetail(entrenamientoId: string): Promise<PublicTrainingListItem | null>` in `src/services/supabase/portal/entrenamientos-publicos.service.ts`.
- **Route auth**: `/portal/entrenamientos-publicos/[entrenamiento_id]` is protected by `middleware.ts` (`protectedPaths` includes `/portal`) and by `src/app/portal/layout.tsx` (redirects when there is no user or no valid role cookie). No extra guard is needed. The public route must stay out of `protectedPaths`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Lib | `src/lib/portal/entrenamientos-publicos/resolveOrigin.ts` | New: `resolvePublicOrigin`, `resolvePortalOrigin`, path constants |
| Hook | `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts` → `src/hooks/portal/entrenamientos-publicos/usePublicTrainingDetalle.ts` | Move; update imports |
| Components | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalle{Hero,Descripcion,Incluye,Cronograma,Ubicacion,Reserva,Precios,Body,CtaBanner,States}.tsx` → `src/components/portal/entrenamientos-publicos/detalle/` | Move (no code change) |
| Components | `src/components/portal/entrenamientos-publicos/detalle/index.ts` | New barrel |
| Components | `src/components/portal/entrenamientos-publicos/detalle/PortalPublicTrainingDetallePage.tsx` | New: Portal page wrapper |
| Components | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx` | Import moved pieces; use `resolvePublicOrigin` |
| Components | `src/components/landing/entrenamientos-publicos/detalle/index.ts` | Export only `PublicTrainingDetallePage` |
| Card | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Portal-aware `detalleHref` |
| Shell | `src/components/portal/PortalBreadcrumbContext.tsx` | New: provider + hooks |
| Shell | `src/components/portal/PortalBreadcrumb.tsx` | UUID scoping, override support, `entrenamientos-publicos` label |
| Shell | `src/app/portal/layout.tsx` | Wrap in `PortalBreadcrumbProvider` |
| Page | `src/app/portal/entrenamientos-publicos/[entrenamiento_id]/page.tsx` | New route |
| Docs | `projectspec/03-project-structure.md` | New route, moved files, breadcrumb context, card link rule |

---

## Acceptance Criteria

1. From `/portal/entrenamientos-publicos`, "Ver detalles" navigates to `/portal/entrenamientos-publicos/{id}?from=%2Fportal%2Fentrenamientos-publicos`. The `PortalHeader` (menu, notifications, avatar) stays visible.
2. From `/portal/orgs/{tenant}/entrenamientos-disponibles`, "Ver detalles" navigates to `/portal/entrenamientos-publicos/{id}?from=%2Fportal%2Forgs%2F{tenant}%2Fentrenamientos-disponibles`.
3. From the public listing `/entrenamientos-publicos`, "Ver detalles" still navigates to `/entrenamientos-publicos/{id}?from=%2Fentrenamientos-publicos`. The admin publish preview still shows no link.
4. On the Portal route, the breadcrumb reads `⌂ Inicio › Entrenamientos públicos › {nombre}` once loaded. It never shows a tenant name for the training id, and shows `…` only while loading.
5. The "Entrenamientos públicos" crumb links to the `from` value when it starts with `/portal/`. For `from` missing, `from=//evil.com`, `from=https://evil.com` or `from=/entrenamientos-publicos`, it links to `/portal/entrenamientos-publicos`.
6. Leaving the detail page (for example to Inicio) clears the override: no stale training name or href remains in the breadcrumb.
7. Breadcrumbs under `/portal/orgs/{tenant}/…` (including `gestion-formularios/{plantilla}`) render exactly as before.
8. The Portal detail body is identical to the public route's body (same component). "Reservar mi cupo" in the reserve card and in the CTA banner opens `PublicTrainingReservaModal`, and a booking completes end to end.
9. A non-existent, unpublished or past training id shows the not-found state, whose link goes to `/portal/entrenamientos-publicos`. A fetch failure shows the error state, and "Reintentar" refetches.
10. An unauthenticated request to `/portal/entrenamientos-publicos/{id}` redirects to login (existing middleware behavior).
11. The public route `/entrenamientos-publicos/{id}` behaves exactly as after US-0116, for both anonymous and logged-in visitors. Its `from` fallback rules are unchanged.
12. `npm run build` and `npm run lint` pass, and no import references the old hook/component paths.

---

## Implementation Steps

- [ ] Create `resolveOrigin.ts`; switch the public page to `resolvePublicOrigin` and confirm the behavior is identical
- [ ] Move the detail components and `usePublicTrainingDetalle`; fix imports; build
- [ ] Add `PortalBreadcrumbContext`; wire the provider in `portal/layout.tsx`; update `PortalBreadcrumb` (UUID scoping, override, label)
- [ ] Create `PortalPublicTrainingDetallePage` and the route `page.tsx`
- [ ] Make `PublicTrainingCard`'s `detalleHref` Portal-aware
- [ ] Test manually: AC 1–11, as athlete, coach and admin, plus a logged-out user
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No DB/RLS change. The route relies on the existing middleware and Portal layout guards. `resolvePortalOrigin` only accepts `/portal/…` paths, never protocol-relative or absolute URLs, so `from` can't become an open redirect. `usePortalBreadcrumbOverride` only takes values from already-validated data (`item.nombre`, the resolved origin).
- **Performance**: One detail fetch per visit, the same as the public route. The breadcrumb override adds no fetch.
- **Accessibility**: The breadcrumb keeps `nav[aria-label="Ruta de navegación"] > ol` with `aria-current="page"` on the last crumb. The page keeps a single `h1` (the training name from the hero). Focus returns to the "Reservar mi cupo" trigger when the booking modal closes.
- **Error handling**: Loading, error (retryable) and not-found are distinct states, reusing `PublicTrainingDetalleStates`. Booking errors surface inside `PublicTrainingReservaModal`, unchanged.
