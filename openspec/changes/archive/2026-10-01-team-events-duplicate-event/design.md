## Context

The events wizard (US-0119) lives in `EventoWizardPage` + `useEventoWizard`. A new event starts from `emptyEventoDraft()` with a client-generated id; an existing event is loaded with `eventosService.getEventoCompleto` and mapped by `draftFromEventoCompleto`. Both modes save through the invoker RPC `guardar_evento_completo`, which on `p_es_nuevo = true` forces `tenant_id`, sets `creado_por`, `estado = 'confirmado'` and `nombre_tenant`, generates ticket / coupon ids, derives `precio` and creates the `evento_formularios` snapshot.

Constraints found in the code:
- `draftFromEventoCompleto` sets each ticket's and coupon's `clientKey` and `id` to the stored row id. Sending those ids for a new event would make the RPC raise `ENTRADA_INVALIDA`.
- `validateEventoDraft` rejects a past `fechaHora` when `esNuevo`.
- "Guardar borrador" is enabled only while `isDirty` (draft differs from the baseline).
- `banner_url` stores a signed URL of `org-assets/orgs/{tenantId}/eventos/{eventoId}.{ext}`; uploads use `upsert: true` on that deterministic path.
- `setStep` rebuilds the URL from the current search params, and the first draft save replaces the URL with `/{eventoId}/editar?paso={step}`.

## Goals / Non-Goals

**Goals:**
- One click from any event to a pre-filled create wizard.
- The copy is fully independent of the source once saved (own rows, own banner object).
- Reuse the create path end to end: no migration, no new RPC, no new policy.

**Non-Goals:**
- Cross-tenant duplication, bulk duplication, recurring series.
- Copying purchases, tickets sold or coupon usage.
- Refreshing stale snapshots (discipline, scenario, trainers, payment methods) against current data.

## Decisions

### D1. Duplicate in the client; persist only on save
"Duplicar" navigates to `nuevo?duplicar={id}`. The wizard loads the source and maps it to an unsaved draft.

```
EventoActionsMenu "Duplicar"
  └─ GestionEventosPage.onDuplicar → router.push(nuevo?duplicar={id})
       └─ nuevo/page.tsx (validates UUID) → EventoWizardPage duplicarDeId
            └─ useEventoWizard
                 ├─ getEventoCompleto(tenantId, duplicarDeId)
                 ├─ draftFromEventoDuplicado(evento, now) → draft + ajustes
                 └─ persist(): copyEventoBanner? → guardar_evento_completo(p_es_nuevo = true)
```

*Alternative considered*: a server-side `duplicar_evento` RPC that inserts a draft copy and redirects to edit. Rejected: it needs a migration and duplicates the RPC's insert logic, and it leaves orphan drafts whenever the admin changes their mind.

### D2. A dedicated pure mapper, `draftFromEventoDuplicado(evento, now)`
It composes `draftFromEventoCompleto` and then:
- `nombre` → `EVENTO_DUPLICADO_PREFIJO + nombre`, sliced to `EVENTO_NOMBRE_MAX`.
- Tickets and coupons → `id: undefined`, `clientKey: newClientKey()`.
- `fechaHora` → cleared when its instant is `<= now`.
- Ticket / coupon windows → copied as stored.

It returns `{ draft, ajustes, fechaOriginal }`. `now` is a parameter so the function stays pure and deterministic.

*Alternative considered*: flags on `draftFromEventoCompleto`. Rejected: it would mix two purposes in the edit-mode mapper.

### D3. Baseline stays the empty draft
In duplicate mode the baseline remains `serializeDraft(emptyEventoDraft())`, so `isDirty` is true immediately. This enables "Guardar borrador" without a dummy edit and arms the existing leave guard for the unsaved copy. No new flag is needed.

### D4. Hook state for duplicate mode
`useEventoWizard` gets `duplicarDeId?: string`, used only when `eventoId` is absent.
- `loading` initial value becomes `(Boolean(eventoIdProp) && !handoff.current) || Boolean(duplicarDeId)`.
- `load()` picks the id to read (`eventoIdProp ?? duplicarDeId`) and branches on which one it is. In duplicate mode it does **not** call `setBaseline`, `setEsBorrador(evento.borrador)`, `setStoredNombreTenant` or `setUltimoGuardado`.
- New state `duplicado: { id, nombre, ajustes } | null`, exposed as `duplicadoDe` and `duplicadoAjustes`; cleared after the first successful save.
- `esNuevo` stays `true`, so create-mode validation and forward-navigation checks apply as today.
- The bundle-cleanup effect already waits for `loading` to be false, so it also covers the copy.

### D5. Independent banner through download + re-upload
`storageService.copyEventoBanner(supabase, tenantId, eventoId, sourceUrl)` does `fetch(sourceUrl)` → blob → `File` → `uploadEventoBanner`. `persist()` calls it when the wizard is in duplicate mode, `esNuevo` is true, no `bannerFile` was chosen and `draft.bannerUrl` equals the source URL captured at load time. A failure is logged and the save continues with the source URL.

*Alternative considered*: `supabase.storage.copy(from, to)`. Rejected: it needs the object path, which would have to be parsed out of the stored signed URL, and the extension of the destination; the download path reuses `uploadEventoBanner` and its policies as they are.

*Alternative considered*: keep sharing the source URL. Rejected: the source path is overwritten in place when its banner is replaced, which would silently change the copy.

### D8. Window ends are shifted by the event-date delta
`updateField('fechaHora', …)` moves every non-empty ticket `validaHasta` and coupon `validoHasta` by `new − previous` event date (`shiftWithEventoFecha`). The previous date is the last complete value, kept in a ref (`fechaAncla`), seeded with the source's date for a copy whose past date was cleared. Starts never move; empty coupon ends stay empty.

*Alternative considered*: move an end only when it equals the event date. Rejected after testing with real data: a coupon ending at 16:07 for a 16:00 event did not follow. *Alternative considered*: clear expired windows in the mapper. Rejected: it discards the offsets the shift needs.

### D9. "Cancelar" in the wizard footer
`EventoWizardFooter` gets `onCancel`, wired to the page's existing `requestLeave` (confirmation when dirty).

### D6. `duplicar` is validated in the server page
`nuevo/page.tsx` accepts the param only when it matches a UUID pattern and passes it as `duplicarDeId`, with `key={duplicarDeId ?? 'nuevo'}` so navigating between a plain new event and a duplicate remounts the wizard. An invalid value opens the empty wizard.

### D7. Stale references are copied as stored
The wizard already renders and validates stale discipline, scenario, form, payment-method and bundle values in edit mode. The copy relies on that behavior; no refresh logic is added.

## Risks / Trade-offs

- [The banner fetch fails: expired signed URL, CORS, network] → The save continues with the source URL and the error is logged; the event is never blocked by the banner.
- [The banner shares the source URL after a failed copy] → Same coupling as before this change; the admin can upload a new image at any time.
- [Coupon codes are copied to the new event] → Intended; codes are unique per event and visible only to the tenant's staff. The admin can edit them in step 2.
- [A hard reload on `nuevo?duplicar=` discards unsaved edits] → Same as reloading an unsaved new event; the `beforeunload` guard warns first.
- [Copied stale snapshots (deleted trainer, inactive payment method) end up in a new event] → Existing warnings are shown, and an inactive form blocks publishing.
- [The menu grows to six items] → `MENU_HEIGHT_ESTIMATE` is raised to 260 so it still flips upward near the viewport bottom.

## Migration Plan

No database or storage migration. Deploy is a normal frontend release; rollback is reverting the commit. Nothing is pushed to the remote Supabase project.

## Open Questions

None.
