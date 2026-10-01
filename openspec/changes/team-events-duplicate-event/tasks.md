## 1. Branch setup

- [x] 1.1 Create the branch `feat/team-events-duplicate-event` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Page

- [x] 2.1 In `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx`, await `searchParams`, take `duplicar` (first value if it is an array) and accept it only when it matches a UUID pattern
- [x] 2.2 Render `<EventoWizardPage key={duplicarDeId ?? 'nuevo'} tenantId={tenantId} duplicarDeId={duplicarDeId} />` inside the existing `Suspense`

## 3. Components

- [x] 3.1 `wizard/EventoWizardPage.tsx`: add the `duplicarDeId` prop and pass it to `useEventoWizard`
- [x] 3.2 `wizard/EventoWizardPage.tsx`: render the dismissible `role="status"` duplicate notice between the header and the stepper (source name, cleared-date line, cleared-windows line with singular / plural, close button `aria-label="Cerrar mensaje"`), shown only while `wizard.duplicadoDe` is set
- [x] 3.3 `EventoActionsMenu.tsx`: add the optional `onDuplicar` prop and the "Duplicar" item (key `duplicar`, icon `content_copy`) after "Editar" / "Continuar editando"; set `MENU_HEIGHT_ESTIMATE = 260` and update its comment
- [x] 3.4 `EventoCard.tsx`: add the optional `onDuplicar` prop and forward it to the menu
- [x] 3.5 `EventosGrid.tsx`, `EventosTable.tsx`, `EventosCalendar.tsx`: add `onDuplicar: (evento: EventoListItem) => void` and forward it like `onVerCompras`
- [x] 3.6 `GestionEventosPage.tsx`: add `onDuplicar` (`router.push(`${basePath}/nuevo?duplicar=${evento.id}`)`) and pass it to the three views

## 4. Hook

- [x] 4.1 `useEventoWizard.ts`: add `duplicarDeId?: string` to the arguments; start `loading` as true in duplicate mode
- [x] 4.2 Extend `load()` and its effect to read the source with `getEventoCompleto(tenantId, duplicarDeId)`, set `notFound` on `null`, and set the draft from `draftFromEventoDuplicado(evento, Date.now())` without touching the baseline, `esBorrador`, `storedNombreTenant` or `ultimoGuardado`
- [x] 4.3 Add the `duplicado` state (`id`, `nombre`, `ajustes`, source banner URL), expose `duplicadoDe` and `duplicadoAjustes`, and clear it after the first successful save
- [x] 4.4 In `persist()`, on the first save in duplicate mode with no `bannerFile` and `draft.bannerUrl` equal to the source URL, call `storageService.copyEventoBanner` and use its `signedUrl`; on failure log with `console.error` and continue with the source URL

## 5. Service

- [x] 5.1 `storage.service.ts`: add `copyEventoBanner(supabase, tenantId, eventoId, sourceUrl)` — `fetch` the image, reject a non-ok response or a MIME type outside `EVENTO_BANNER_MIME_TYPES`, build a `File` with the extension from the MIME type, delegate to `uploadEventoBanner`

## 6. Lib and types

- [x] 6.1 `src/types/portal/eventos.types.ts`: add `EventoDuplicadoAjustes` (`fechaLimpiada: boolean`, `ventanasLimpiadas: number`)
- [x] 6.2 `src/lib/portal/eventos-wizard.utils.ts`: add `EVENTO_DUPLICADO_PREFIJO` and `draftFromEventoDuplicado(evento, now)` (name prefix and truncation, new `clientKey` and `id: undefined` for tickets and coupons, past event date cleared, expired windows cleared and counted)

## 7. Verification

- [x] 7.1 Run the type check (`npx tsc --noEmit`) and lint (`npm run lint`); the project has no test script; do not run a build
- [x] 7.2 Manual happy path: duplicate a published event with banner, Sencilla and Múltiple tickets, coupons, form and payment methods; save as draft; publish; confirm the success banner and both events in the list
- [x] 7.3 Manual edge cases: past event, draft source, cancelled source, source without banner, source with stale references, non-UUID and foreign `duplicar` id, leaving without saving, "Quitar imagen" before saving
- [x] 7.4 Confirm in the local Supabase that the source rows are unchanged, the copy has new ticket / coupon ids, and its banner is stored under `orgs/{tenantId}/eventos/{newId}.*` and survives replacing the source banner

## 8. Documentation and delivery

- [x] 8.1 Update `projectspec/03-project-structure.md`: `?duplicar=` on the `nuevo` route, the "Duplicar" menu item, `draftFromEventoDuplicado`, `copyEventoBanner`, and the duplicate mode of `useEventoWizard`
- [x] 8.2 Write the commit message and the pull request description for the implementation
