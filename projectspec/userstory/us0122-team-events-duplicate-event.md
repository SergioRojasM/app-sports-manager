# US-0122 — Team Events Management (Phase 2.1: Duplicate an Existing Event)

## ID
US-0122

## Name
Team events module, phase 2.1 — "Duplicar" action on the events management page. It opens the create wizard from US-0119 pre-filled with a copy of an existing event (configuration, tickets, coupons, access form and payment methods), so the admin only adjusts what changes.

## As a
Tenant administrator

## I Want
To duplicate an event that already exists and land in the create wizard with all of its data already filled in.

## So That
I can create similar or recurring events much faster, changing only the name, date and the few details that differ, instead of filling in the three wizard steps from scratch.

---

## Description

### Current State
- US-0119 (phase 2) delivered the three-step wizard (`EventoWizardPage` + `useEventoWizard`) on `/gestion-eventos/nuevo` and `/gestion-eventos/{eventoId}/editar`, saved atomically by the `guardar_evento_completo` RPC.
- A new event always starts from `emptyEventoDraft()`. There is no way to reuse an existing event: the admin retypes the description, cronograma, incluye, trainers, tickets, coupons, form and payment methods every time.
- `EventoActionsMenu` offers "Editar" / "Continuar editando", "Ver compras", "Activar / Desactivar evento", "Cancelar / Confirmar evento" and "Eliminar". There is no "Duplicar".

### Proposed Changes

#### Scope
| In scope | Out of scope |
|----------|--------------|
| "Duplicar" item in `EventoActionsMenu` (cards, list and calendar views) | Duplicating into another tenant |
| `/gestion-eventos/nuevo?duplicar={eventoId}`: create wizard pre-filled from the source event | Bulk duplication or generating a recurring series |
| Pure mapper `draftFromEventoDuplicado` (new ids, name prefix, past event date cleared); ticket and coupon window ends follow the event date | Copying purchases, tickets sold, attendees or coupon usage |
| Independent banner copy on the first save | Any database, RLS or RPC change |
| Notice in the wizard explaining that it is a copy and what was adjusted | A "Duplicar" button inside the wizard or on the public event pages |

#### Key decision: duplicate in the client, save nothing until the admin saves
"Duplicar" does **not** write to the database. It navigates to the existing create route with a `duplicar` query param. The wizard loads the source event, maps it to a **new, unsaved** draft, and from there behaves exactly like "Nuevo evento": the copy exists only when the admin presses "Guardar borrador" or "Publicar evento". This means:
- No orphan copies if the admin changes their mind.
- No new RPC, table, column or policy. The existing `guardar_evento_completo` call with `p_es_nuevo = true` creates the copy.
- All validation and draft rules from US-0119 apply unchanged.

#### Entry point — `EventoActionsMenu`
- New item **"Duplicar"** (icon `content_copy`, key `duplicar`), shown when the optional `onDuplicar` prop is passed.
- Position: right after "Editar" (published events) or "Continuar editando" (drafts), before "Ver compras".
- Available for **every** event: published, draft, cancelled, inactive and past.
- `MENU_HEIGHT_ESTIMATE` goes from `220` to `260` and its comment is updated to "six-item menu", so the menu still flips upward correctly near the bottom of the viewport.
- `GestionEventosPage` adds `onDuplicar(evento)` → `router.push('/portal/orgs/{tenantId}/gestion-eventos/nuevo?duplicar={evento.id}')` and passes it through `EventosGrid` → `EventoCard`, `EventosTable` and `EventosCalendar`, the same way `onVerCompras` is passed today.
- The wizard preview keeps using `EventoCard hideActions`, so it is unaffected.

#### Route
| Route | Mode |
|-------|------|
| `/portal/orgs/{tenantId}/gestion-eventos/nuevo?duplicar={eventoId}` | Create, pre-filled from `{eventoId}` |

`nuevo/page.tsx` also awaits `searchParams`, takes `duplicar` (first value if it is an array), accepts it only when it matches a UUID pattern, and renders `<EventoWizardPage key={duplicarDeId ?? 'nuevo'} tenantId={tenantId} duplicarDeId={duplicarDeId} />`. A missing or malformed value is ignored and the wizard opens empty, as today.

#### What is copied — `draftFromEventoDuplicado(evento, now)`
New pure function in `src/lib/portal/eventos-wizard.utils.ts`. It starts from `draftFromEventoCompleto(evento)` and applies these rules:

| Field | Rule |
|-------|------|
| `nombre` | `"Copia de {nombre}"`, truncated to `EVENTO_NOMBRE_MAX` (150) |
| `descripcion`, `descripcionLarga`, `paginaEventoUrl`, `disciplina`, `duracionMinutos`, `escenario`, `puntoEncuentro`, `entrenadores` (with `experiencia`), `cupoMaximo`, `reservaAntelacionHoras`, `cancelacionAntelacionHoras`, `omitirConfirmacionCompra`, `cronograma`, `incluye`, `publico`, `activo`, `formularioId`, `metodosPago` | Copied as stored |
| `bannerUrl` | Copied (the source URL). Replaced by an independent copy on the first save; see *Banner* |
| `fechaHora` | Kept when it is in the future. Cleared (`''`) when it is in the past or equal to `now`, because create mode rejects past dates |
| `entradas[]` | All copied, in the same order, with `id: undefined` and a fresh `clientKey` (`newClientKey()`). `tipoEntrada`, `nombre`, `valor` and `eventosIdBundle` are kept |
| `entradas[].validaDesde` / `validaHasta` | Copied as stored. `validaHasta` then follows the event date; see *Window ends follow the event date* |
| `entradas[].cupones[]` | All copied with `id: undefined` and a fresh `clientKey`. `nombre`, `cupon` and `descuento` are kept (codes are unique per event, so the same code is valid in the copy) |
| `cupones[].validoDesde` / `validoHasta` | Copied as stored. `validoHasta` then follows the event date |

It returns `{ draft: EventoDraft; ajustes: EventoDuplicadoAjustes; fechaOriginal: string }` (`fechaOriginal` is the source's event date as a `datetime-local` value), where:
```ts
export type EventoDuplicadoAjustes = {
  fechaLimpiada: boolean;      // the event date was in the past and was cleared
};
```

#### Window ends follow the event date
When `fechaHora` changes to a complete value in the wizard (`updateField`), every non-empty `validaHasta` (tickets) and `validoHasta` (coupons) moves by the same amount the event date moved, using `shiftWithEventoFecha(value, fechaAnterior, fechaNueva)` from `eventos-wizard.utils.ts`. So a sale that closed when the event started, 7 minutes after, or a week before keeps that distance.
- The reference is the **last complete event date** (kept in a ref), so clearing the field while retyping does not lose it. For a copy of a past event the reference is the source's date (`fechaOriginal`).
- Window starts (`validaDesde`, `validoDesde`) never move. An empty coupon end stays empty (no limit).
- A ticket with an empty end on an event that never had a date takes the new date (the "until the event starts" default).
- The rule applies to the wizard in general (create, duplicate and edit), not only to copies.

**Never copied** (they come from the create path of the RPC or do not belong to the copy): the event `id`, `estado` (the copy is created `confirmado`), `borrador` (the copy starts as a new, unsaved event), `creado_por`, `created_at` / `updated_at`, `nombre_tenant` (the RPC sets the tenant's current name), `precio` (derived by the RPC), the `evento_formularios` snapshot (the RPC creates a fresh one from the selected template), purchases and tickets sold.

**Stale references** are copied as stored and handled by the existing wizard behavior, with no new logic:
- Discipline that no longer exists → shown as "{nombre} (ya no existe)".
- Scenario no longer in the list → "{nombre} (guardado en el evento)".
- Form template inactive or deleted → "Formulario inactivo o eliminado"; publishing is blocked by the existing final validation.
- Payment methods inactive or deleted → listed as "(inactivo o eliminado)", checked, removable.
- Bundled events (`eventosIdBundle`) that no longer exist → dropped by the existing bundle-cleanup effect, with the existing warning on the ticket card.

The source event itself is **not** added to any bundle of the copy.

#### Wizard behavior in duplicate mode — `useEventoWizard`
New optional argument `duplicarDeId?: string` (only meaningful when `eventoId` is not passed).

- **Load**: `loading` starts `true`. The hook calls `eventosService.getEventoCompleto(tenantId, duplicarDeId)`.
  - `null` (does not exist, or belongs to another tenant) → `notFound = true`. The page shows the existing "Evento no encontrado" state.
  - Error → existing `loadError` state with "Reintentar" (`reload` must also work in duplicate mode).
  - Success → `setDraft(draft)` from `draftFromEventoDuplicado(evento, Date.now())`, and the adjustments are kept in state.
- **Identity**: the event id is still the client-generated `crypto.randomUUID()`. `esNuevo = true`, `esBorrador = true`, `ultimoGuardado = null`, `storedNombreTenant = null` (the preview shows the tenant's current name).
- **Dirty from the start**: the baseline stays `serializeDraft(emptyEventoDraft())`, so `isDirty` is `true` as soon as the copy loads. As a result "Guardar borrador" is enabled immediately and the leave guard (`beforeunload` + `SalirSinGuardarModal`) protects the unsaved copy.
- **Saving**: unchanged. The first "Guardar borrador" inserts the copy, hands the draft off and replaces the URL with `/gestion-eventos/{newId}/editar?paso={step}`; the `duplicar` param disappears with that replace. "Publicar evento" runs the full validation and redirects to the list with `?guardado=creado`.
- **Step navigation**: unchanged create-mode behavior (moving forward validates the steps being skipped). `setStep` already preserves the other query params, so `duplicar` survives step changes before the first save.
- **Reload before saving**: a hard reload of `/nuevo?duplicar={id}` loads the source again and discards unsaved edits, the same as reloading an unsaved new event.
- New values returned by the hook: `duplicadoDe: { id: string; nombre: string } | null` and `duplicadoAjustes: EventoDuplicadoAjustes | null`. Both are reset to `null` after the first successful save (the notice is no longer relevant once the copy exists).

#### Banner
The stored `banner_url` is a signed URL of `orgs/{tenantId}/eventos/{sourceId}.{ext}`. If the copy kept that URL, replacing the source's banner later would silently change the copy's banner too. So:
- New `storageService.copyEventoBanner(supabase, tenantId, eventoId, sourceUrl)`: downloads the image with `fetch(sourceUrl)`, builds a `File` from the blob (extension derived from the blob's MIME type: `image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`), and delegates to `uploadEventoBanner`. It returns the same `StorageUploadResult`.
- In `persist()`, when the wizard is in duplicate mode, this is the first save (`esNuevo`), no new `bannerFile` was chosen and `draft.bannerUrl` is still the source's URL, call `copyEventoBanner` and save the returned `signedUrl`.
- If the admin picked a new image, the existing upload path runs and nothing is copied. If the admin pressed "Quitar imagen", `bannerUrl` is `null` and nothing is copied.
- If the copy fails (network, expired URL, unsupported type), the save **continues** with the source URL and logs the error with `console.error`. A failed banner copy must never block saving the event.

#### UI — duplicate notice in `EventoWizardPage`
When `wizard.duplicadoDe` is set, render a dismissible notice between the page header and the stepper (`role="status"`, `grit-*` info styling consistent with the existing banners in `GestionEventosPage`, icon `content_copy`):
- A "Cancelar" button in the wizard footer (next to "Guardar borrador" / "Siguiente", every step, create and edit) leaves the wizard through the same unsaved-changes guard as "Volver a eventos".
- Main text: `Estás creando una copia de "{nombre original}". No se guarda nada hasta que pulses "Guardar borrador" o "Publicar evento".`
- When `ajustes.fechaLimpiada`: extra line `La fecha del evento original ya pasó: define una nueva fecha. Las fechas de cierre de entradas y cupones se ajustarán a ella.`
- A close button (`aria-label="Cerrar mensaje"`) hides it for the rest of the session on that page.

The page title stays "Nuevo evento". The loading skeleton, not-found and error states are the existing ones.

---

## Database Changes

None. No migration is needed.

- The copy is created by the existing `guardar_evento_completo(p_tenant_id, p_evento_id, p_es_nuevo = true, p_borrador, p_evento, p_entradas)` RPC, which already forces `tenant_id`, sets `creado_por`, `estado = 'confirmado'` and `nombre_tenant`, generates ticket and coupon ids, derives `precio` and creates the `evento_formularios` snapshot.
- Reading the source uses the existing `eventos` / `evento_entradas` / `evento_entrada_cupones` SELECT policies (admins and trainers of the tenant).
- The banner copy writes to `org-assets/orgs/{tenantId}/eventos/{newId}.{ext}`, already covered by the `org_admin_*` write policies and `event_banner_read`.

---

## API / Server Actions

No new server action, route handler or RPC. All calls use the browser client with the user's session.

### `src/services/supabase/portal/storage.service.ts` (modify)
- **Function**: `copyEventoBanner(supabase: SupabaseClient, tenantId: string, eventoId: string, sourceUrl: string): Promise<StorageUploadResult>`
- **Behavior**: `fetch(sourceUrl)` → blob → `File` → `uploadEventoBanner(supabase, tenantId, eventoId, file)`. Throws when the response is not `ok` or the MIME type is not one of `EVENTO_BANNER_MIME_TYPES`.
- **Returns**: `{ signedUrl, path }` of the new object.
- **Auth / RLS**: same as `uploadEventoBanner` (tenant admin write policies on `orgs/{tenantId}/`).

### `src/services/supabase/portal/eventos.service.ts` (unchanged, reused)
- `getEventoCompleto(tenantId, eventoId)` loads the source with its tickets and coupons. It filters by `tenant_id`, so an id from another tenant returns `null`.
- `guardarEventoCompleto(tenantId, eventoId, payload, { esNuevo: true, borrador })` creates the copy.

### `src/lib/portal/eventos-wizard.utils.ts` (modify)
- **Function**: `draftFromEventoDuplicado(evento: EventoCompleto, now: number): { draft: EventoDraft; ajustes: EventoDuplicadoAjustes }`, with the rules in *What is copied*. Pure, no I/O.
- **Constant**: `EVENTO_DUPLICADO_PREFIJO = 'Copia de '`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/eventos.types.ts` | Add `EventoDuplicadoAjustes` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Add `draftFromEventoDuplicado` and `EVENTO_DUPLICADO_PREFIJO` |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `copyEventoBanner` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | New `duplicarDeId` argument; load the source and build the copy; `duplicadoDe` / `duplicadoAjustes` state; banner copy in `persist()` on the first save |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | New `duplicarDeId` prop passed to the hook; dismissible duplicate notice |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | Optional `onDuplicar` prop; "Duplicar" item; `MENU_HEIGHT_ESTIMATE = 260` |
| Component | `src/components/portal/gestion-eventos/EventoCard.tsx` | Optional `onDuplicar` prop forwarded to the menu |
| Component | `src/components/portal/gestion-eventos/EventosGrid.tsx` | `onDuplicar: (evento) => void` prop forwarded to each card |
| Component | `src/components/portal/gestion-eventos/EventosTable.tsx` | `onDuplicar` prop forwarded to the row menu |
| Component | `src/components/portal/gestion-eventos/EventosCalendar.tsx` | `onDuplicar` prop forwarded to the selected-day menu |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | `onDuplicar` handler (navigates to `nuevo?duplicar={id}`), passed to the three views |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Await `searchParams`, validate `duplicar` as a UUID, pass `duplicarDeId` and `key` |
| Docs | `projectspec/03-project-structure.md` | Note the `?duplicar=` param on the `nuevo` route, the "Duplicar" menu item, `draftFromEventoDuplicado`, `copyEventoBanner` and the hook's duplicate mode |

---

## Acceptance Criteria

1. The actions menu of every event in the cards, list and calendar views shows "Duplicar", for published, draft, cancelled, inactive and past events.
2. Choosing "Duplicar" navigates to `/portal/orgs/{tenantId}/gestion-eventos/nuevo?duplicar={eventoId}` and writes nothing to the database: the events list still has the same number of events if the admin leaves the wizard without saving.
3. The wizard opens titled "Nuevo evento", with the name `Copia de {nombre original}` (at most 150 characters) and every other step-1 field equal to the source, including description, Markdown description, URL, discipline, duration, scenario, meeting point, trainers with their experience, capacity, lead times, automatic-confirmation checkbox, cronograma, incluye, público and activo.
4. Step 2 shows the same tickets in the same order with the same type, name, value and bundled events, each with its coupons (name, code, discount), and the same access form selected.
5. Step 3 shows the same payment methods selected.
6. When the source date is in the future, the copy keeps it. When it is in the past, the date field is empty and the notice says a new date must be defined and that the closing dates of tickets and coupons will follow it.
7. Ticket and coupon windows are copied as stored. Setting or changing the event date moves every non-empty ticket "Venta disponible hasta" and coupon "válido hasta" by the same amount as the event date (source 10 Oct 11:00 with a coupon ending 11:07 → copy on 15 Nov 18:30 has the coupon ending 15 Nov 18:37). Start dates and empty coupon ends do not change.
8. The notice `Estás creando una copia de "{nombre}"…` is shown above the stepper, can be dismissed, and is no longer shown after the first successful save.
9. "Guardar borrador" is enabled as soon as the copy loads, without editing anything. Pressing it creates a **new** draft event, and the URL becomes `/gestion-eventos/{newId}/editar?paso={step}` with a different id from the source.
10. "Publicar evento" on step 3 runs the full validation and, on success, redirects to the list with "Evento creado correctamente." The list shows both the source and the copy.
11. After saving, the source event is unchanged: same data, same tickets and coupons (same ids), same purchases.
12. The copy has its own ticket and coupon rows (new ids), `estado = confirmado`, zero purchases, and its own `evento_formularios` snapshot when a form is selected.
13. A copy saved with the inherited banner stores a banner URL under `orgs/{tenantId}/eventos/{newId}.*`. Replacing the source's banner afterwards does not change the copy's banner.
14. If the banner copy fails, the event is still saved and keeps the source's banner URL; no error blocks the save.
15. Choosing a new image or pressing "Quitar imagen" before the first save does not copy the source banner.
16. Trying to leave the wizard (link "Volver a eventos", closing or reloading the tab) before saving the copy triggers the existing unsaved-changes guard.
17. `nuevo?duplicar={id}` with an id that does not exist or belongs to another tenant shows "Evento no encontrado" with "Volver a eventos". A `duplicar` value that is not a UUID is ignored and the empty wizard opens.
18. If loading the source fails, the error state with "Reintentar" is shown and retrying loads the copy.
19. Stale references in the source (deleted discipline, scenario, form, payment method or bundled event) appear in the copy with the same labels and warnings the wizard already shows in edit mode; an inactive form blocks publishing but not saving the draft.
20. A user who is not an administrator of the tenant cannot reach the route (existing `(administrador)` layout guard).
21. "Duplicar" is reachable by keyboard in the menu (arrow keys, Enter) and the menu still opens upward when there is no room below.

---

## Implementation Steps

- [ ] Add `EventoDuplicadoAjustes` to `eventos.types.ts`
- [ ] Add `draftFromEventoDuplicado` and `EVENTO_DUPLICADO_PREFIJO` to `eventos-wizard.utils.ts`
- [ ] Add `copyEventoBanner` to `storage.service.ts`
- [ ] Extend `useEventoWizard` with `duplicarDeId`: load, copy, `duplicadoDe` / `duplicadoAjustes`, banner copy on the first save
- [ ] Update `nuevo/page.tsx` to read and validate `?duplicar=`
- [ ] Add the `duplicarDeId` prop and the duplicate notice to `EventoWizardPage`
- [ ] Add "Duplicar" to `EventoActionsMenu` and thread `onDuplicar` through `EventoCard`, `EventosGrid`, `EventosTable`, `EventosCalendar` and `GestionEventosPage`
- [ ] Run lint and type-check
- [ ] Test manually, happy path: duplicate a published event with banner, Sencilla and Múltiple tickets, coupons, form and payment methods; save as draft; publish
- [ ] Test manually, edge cases: past event, draft source, cancelled source, source without banner, source with stale references, invalid / foreign `duplicar` id, leaving without saving, banner replaced on the source after duplicating
- [ ] Confirm in Supabase that the source rows are untouched and the copy has new ticket / coupon ids
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No new privileges. The route stays under the `(administrador)` layout guard. The source is read with `tenant_id` + `id` under RLS, so an event of another tenant cannot be duplicated. The copy is written through the invoker RPC, which forces `tenant_id` and checks the caller's role. The `duplicar` param is accepted only as a UUID and is used only as a query filter value. Coupon codes are copied only inside the same tenant, by staff who can already read them.
- **Performance**: One extra `getEventoCompleto` request when opening the wizard in duplicate mode, run in parallel with the option lists. One image download and upload on the first save, only when the banner is inherited. No new queries on the list page.
- **Accessibility**: "Duplicar" is a `role="menuitem"` with icon and text, inside the existing keyboard-navigable menu. The duplicate notice uses `role="status"` and its close button has `aria-label="Cerrar mensaje"`. Focus management of the wizard is unchanged.
- **Error handling**: Source not found → existing "Evento no encontrado" empty state. Load error → existing error state with "Reintentar". Save errors → existing `role="alert"` block in the wizard footer. A failed banner copy is logged and does not block the save.
