# Delivery — team-events-management-phase-three (US-0120)

## Commit message

```
feat(team-events-management-phase-three): add public and portal event listing and detail pages

- Add /eventos and /eventos/[event_id] (anonymous) and /portal/eventos and
  /portal/eventos/[event_id] (authenticated), reading only the eventos table
- Portal listing: featured card + grid, filters drawer (Bogotá date range, quick chips,
  search, Organización, Disciplina), 60-day default window; undated events always shown
- Event page (EventoDetalleBody) keeps the approved event layout and adds organization,
  trainers with experience and tickets; payment methods are left to the purchase flow
- "Obtener entrada": signup / login (next=/portal/eventos/{id}?entradas=1) or
  "Continuar sin registro" (guest mode); tickets modal with the onContinuar purchase seam
- eventos.nombre_tenant snapshot (backfilled), set by guardar_evento_completo on create only
- eventosService.listEventosPublicados / getEventoPublicado with explicit visibility filters
  and column projections
- Wizard preview now renders EventoDetalleBody (with the organization name); step 3 says the
  selected payment methods are shown to ticket buyers
- Management page: Activo/Inactivo pill in cards (opaque, over the banner), list and calendar,
  plus a quick "Activar evento" / "Desactivar evento" action
- Wizard: the "Oculto" toggle becomes an "Activo" / "Inactivo" toggle explaining where the event is published
- Events module no longer imports from the entrenamientos-publicos slices
- Navigation: portal menu "Eventos", landing header "Eventos", breadcrumb labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request description

### Why
Events created in US-0118 / US-0119 were only visible on the tenant's admin page. US-0120 adds
the audience-facing side: event discovery and event pages for visitors and portal users, with a
"get ticket" entry that also works without signing up. It is built in its own `eventos` slices
so the public-trainings feature can be deprecated later without breaking events.

User story: `projectspec/userstory/us0120-team-events-public-listing.md`
OpenSpec change: `openspec/changes/team-events-management-phase-three/`

### What changes
- **Routes**
  - `/eventos`, `/eventos/[event_id]`: public (outside `protectedPaths`); only `publico` events.
  - `/portal/eventos`, `/portal/eventos/[event_id]`: public events of every tenant plus the
    private events of the user's own tenants ("Solo miembros" / "Evento privado").
- **Data access**: every read is `from('eventos')` only. Explicit filters
  (`activo`, `borrador = false`, `estado = 'confirmado'`, future or undated, plus `publico` on the
  landing pages), because RLS lets admins/trainers read their own drafts and inactive rows.
  Explicit projections; `formulario_id`, `creado_por`, `omitir_confirmacion_compra` are never
  selected. `metodos_pago` is read but only shown in the tickets modal for a paid ticket; the
  event page leaves payment methods to the purchase flow.
- **Get-ticket flow** (`useObtenerEntrada`):
  - anonymous → "Crear cuenta gratis" / "Ya tengo cuenta" (return to the portal event page with
    the tickets modal open) / "Continuar sin registro" (tickets modal in guest mode);
  - logged in → tickets modal (portal) or redirect to the portal event page (landing).
  - `EventoEntradasModal` ends in a disabled "Continuar" (`onContinuar` seam for the purchase phase).
- **Database** (`20260930120000_eventos_nombre_tenant.sql`): `eventos.nombre_tenant` (not null,
  backfilled) and `guardar_evento_completo` re-created with the same signature and grants; it
  stores the tenant name on create only and ignores any client value.
- **Wizard (US-0119)**: the *Página* preview renders the new `EventoDetalleBody` with the
  organization name (stored snapshot in edit mode, current tenant name before the first save);
  step 3 helper text says payment methods are shown to ticket buyers; `EventoFormularioSelector` uses a
  copy of `useFormularioPreview` in the formularios slice.
- **Navigation**: global portal menu "Eventos", landing header "Eventos", breadcrumb
  "Eventos" / "Evento" (never a raw uuid).
- `METODO_PAGO_TIPO_LABELS` replaces two duplicated label maps.
- **Management page**: an "Activo" / "Inactivo" pill in every view (opaque pills over the card
  banner, dashed amber border for inactive cards, an "Activo" list column, calendar chip icon and
  day `aria-label` count) and a quick "Activar evento" / "Desactivar evento" menu action
  (`updateActivoEvento`, no modal, status/alert feedback).

### Migration notes
- Apply **locally only** (`npx supabase migration up --local`); it was not pushed to the remote project.
- Rollback: re-apply the previous `guardar_evento_completo` definition from
  `20260929120100_guardar_evento_completo.sql`, then drop `eventos.nombre_tenant`.

### Screenshots checklist
- [ ] `/eventos` listing (featured card, organization line, prices)
- [ ] "Obtén tu entrada" modal (three options)
- [ ] `/eventos/{id}` event page (hero, trainers, tickets, closing banner — no payment methods)
- [ ] Tickets modal in guest mode (payment methods for a paid ticket, disabled "Continuar")
- [ ] `/portal/eventos` with the filters drawer open
- [ ] Wizard *Página* preview showing the organization name
- [ ] Management cards view with Activo / Inactivo pills

### Test plan
- [x] `npx tsc --noEmit` passes; `eslint` passes on all 50 changed/new TS files (the repo-wide
      `npm run lint` still reports 18 pre-existing `react-hooks/set-state-in-effect` errors in
      untouched files)
- [x] SQL (local): backfill; RPC create stores the tenant name and ignores a client
      `nombre_tenant`; edit keeps it after a tenant rename; US-0119 RPC scenarios still pass
      (`METODO_PAGO_REQUERIDO`, incomplete drafts, no duplicate rows on re-save, free publish)
- [x] Visibility matrix (anon / admin / member / non-member / pending member) with the service
      filters: drafts, inactive, cancelled and past events never listed; private events only for
      members, and never on the landing surfaces
- [x] Browser (local): landing listing and detail, not-found (private, draft, malformed id),
      unsafe `from`, guest flow from listing and detail, login flow landing on the portal page with
      the modal open, logged-in landing redirect, portal filters (organization, discipline,
      accent-insensitive search, chips, reset), portal breadcrumb and menu, wizard preview in
      create and edit mode, network: a single request to `rest/v1/eventos` per page
- [x] Management page (local): activo pills in cards, list and calendar; activate from a card,
      deactivate from the list, activate from the calendar; DB updated
- [x] Regression: `/entrenamientos-publicos`, `/portal/entrenamientos-publicos` and
      `gestion-eventos` render as before
- [x] Isolation grep over the events slices and the wizard returns nothing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
