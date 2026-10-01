# Delivery — team-events-duplicate-event (US-0122)

## Commit message

```
feat(team-events-duplicate-event): duplicate an event into the create wizard

Add a "Duplicar" action to the events management views. It opens
/gestion-eventos/nuevo?duplicar={eventoId}, where the wizard loads the
source event and starts from an unsaved copy: "Copia de …" name, new
ticket and coupon identities, past event date and expired validity
windows cleared. Nothing is written until the admin saves; the copy is
created by the existing guardar_evento_completo RPC.

On the first save the inherited banner is re-uploaded under the new
event's path so the copy does not follow later changes to the source
banner. A failed banner copy does not block the save.

No database, RLS or RPC changes.
```

## Pull request

**Title:** feat: duplicate team events (US-0122, phase 2.1)

**Base:** `develop`

### What

Admins can duplicate any event from its actions menu (cards, list and calendar views). The create wizard opens pre-filled with the source event's configuration, tickets, coupons, access form and payment methods, so only the differences need editing.

### How

- `EventoActionsMenu` gets a "Duplicar" item; `GestionEventosPage` navigates to `nuevo?duplicar={id}`.
- `nuevo/page.tsx` accepts `duplicar` only as a UUID and passes `duplicarDeId` to `EventoWizardPage`.
- `useEventoWizard` loads the source with `getEventoCompleto` and builds the draft with the new pure mapper `draftFromEventoDuplicado`. The baseline stays the empty draft, so the copy is dirty from the start: "Guardar borrador" is enabled and the leave guard is armed.
- `storageService.copyEventoBanner` gives the copy its own banner object on the first save.
- The wizard shows a dismissible notice naming the source and listing what was cleared.

### Not changed

No migration, RPC, RLS or storage policy. The source event is never written.

### Verification

- `npx tsc --noEmit`: passes.
- `eslint` on the changed files: passes.
- Manual testing in the running app is still pending (tasks 7.2–7.4): happy path, past / draft / cancelled sources, source without banner, stale references, invalid or foreign `duplicar` id, banner independence.

### Notes for the reviewer

- Stale references in the source (deleted discipline, scenario, form, payment method, bundled event) are copied as stored and rely on the wizard's existing edit-mode handling.
- Coupon codes are copied; they are unique per event, so the same code is valid in the copy.
