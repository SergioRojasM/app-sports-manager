## 1. Branch setup

- [x] 1.1 Create the branch `feat/publish-training-as-event` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Page

- [x] 2.1 In `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx`, add `desdeEntrenamiento?: string | string[]` to `searchParams`. Take the first value if it is an array, and accept it only when it matches the existing `UUID_RE`
- [x] 2.2 Ignore `desdeEntrenamiento` when `duplicarDeId` is set (duplicate mode wins)
- [x] 2.3 Render `<EventoWizardPage key={duplicarDeId ?? (desdeEntrenamientoId ? `entrenamiento-${desdeEntrenamientoId}` : 'nuevo')} tenantId={tenantId} duplicarDeId={duplicarDeId} desdeEntrenamientoId={desdeEntrenamientoId} />` inside the existing `Suspense`, and update the comment

## 3. Components

- [x] 3.1 `wizard/EventoWizardPage.tsx`: add the `desdeEntrenamientoId?: string` prop and pass it to `useEventoWizard`
- [x] 3.2 `wizard/EventoWizardPage.tsx`: choose the empty-state title and description by `wizard.notFoundKind`:
  - `'evento'`: unchanged.
  - `'entrenamiento'`: "Entrenamiento no encontrado" / `El entrenamiento no existe o pertenece a otra organización.`
  - `'entrenamiento-pasado'`: "Este entrenamiento ya pasó" / `Solo los entrenamientos futuros se pueden publicar como evento.`

  All three keep "Volver a eventos".
- [x] 3.3 `wizard/EventoWizardPage.tsx`: while `wizard.origenEntrenamiento` is set, render the dismissible source notice between the header and the stepper. Reuse the duplicate notice markup (`role="status"`, icon `fitness_center`, close button `aria-label="Cerrar mensaje"`) and its own dismissed state. Lines:
  - Always: the source line, the capacity line and the tickets/payment-methods line.
  - When `ajustes.descripcionMovida`: the moved-description line.
  - When `ajustes.formularioExternoOmitido`: the external-form line.

  Use the exact texts from the spec.
- [x] 3.4 `wizard/EventoConfiguracionStep.tsx`: while `wizard.origenEntrenamiento` is set, replace the "Cupo máximo" hint (same `hintId="evento-cupo-hint"`) with `Cupo propio del evento, no compartido con el entrenamiento "{nombre}" (cupo {n}). Vacío = cupo ilimitado.`, omitting ` (cupo {n})` when the training's `cupoMaximo` is `null`
- [x] 3.5 `wizard/EventoEscenarioSelector.tsx`: delete the local `toSnapshot` and import `toEscenarioSnapshot` from `@/lib/portal/eventos-wizard.utils` (no behavior change)
- [x] 3.6 `entrenamientos/EntrenamientoActionModal.tsx`: add the optional props `onPublicarEnEventos`, `canPublicarEnEventos` and `publicarEnEventosDisabledReason`. When `onPublicarEnEventos` is passed, render the "Publicar en eventos" card after "Ver reservas" and before "Editar":
  - Enabled: subtitle `Abre el asistente de eventos con los datos de este entrenamiento.`
  - Disabled: same `disabled` / `cursor-not-allowed` / `opacity-70` styling as "Editar", showing the reason.
- [x] 3.7 `entrenamientos/EntrenamientosPage.tsx`: in `selectedActionContext`, add `canPublicarEnEventos = esEntrenamientoFuturo(instance.fecha_hora, currentTimestamp)` and `publicarEnEventosDisabledReason = 'Solo los entrenamientos futuros se pueden publicar como evento.'` when it is false
- [x] 3.8 `entrenamientos/EntrenamientosPage.tsx`: pass `onPublicarEnEventos` only when `role === 'administrador'`. The handler returns early when the training is not future. Otherwise it closes the action modal and calls `router.push(`/portal/orgs/${tenantId}/gestion-eventos/nuevo?desdeEntrenamiento=${instance.id}`)` (add `useRouter` from `next/navigation`)

## 4. Hook

- [x] 4.1 `useEventoWizard.ts`: add `desdeEntrenamientoId?: string` to `UseEventoWizardArgs`. Derive `const desdeEntrenamientoId = eventoIdProp || duplicarDeId ? undefined : desdeEntrenamientoIdProp`, and start `loading` as `true` when it is set
- [x] 4.2 Add state `origenEntrenamiento: { id; nombre; cupoMaximo: number | null; ajustes: EventoDesdeEntrenamientoAjustes } | null` and `notFoundKind: 'evento' | 'entrenamiento' | 'entrenamiento-pasado'` (default `'evento'`)
- [x] 4.3 Extend `load()` with a training branch:
  - Call `entrenamientosService.getEntrenamientoParaEvento(tenantId, desdeEntrenamientoId)`.
  - `null` → `notFound = true`, `notFoundKind = 'entrenamiento'`.
  - `!esEntrenamientoFuturo(fecha_hora, Date.now())` → `notFound = true`, `notFoundKind = 'entrenamiento-pasado'`.
  - Otherwise → `draftFromEntrenamiento`, `setDraft(draft)`, `fechaAncla.current = fechaOriginal`, set `origenEntrenamiento`.

  Do not touch the baseline, `esBorrador`, `storedNombreTenant` or `ultimoGuardado`. On error, set the existing `loadError`.
- [x] 4.4 Update the load effect so the training mode also calls `load()`, and add `desdeEntrenamientoId` to the dependency arrays. Confirm `reload` works in this mode
- [x] 4.5 Clear `origenEntrenamiento` after the first successful save, where `duplicado` is cleared. Make sure the `copyEventoBanner` branch is not reached in training mode
- [x] 4.6 Return `origenEntrenamiento` and `notFoundKind` from the hook

## 5. Service

- [x] 5.1 `entrenamientos.service.ts`: add `getEntrenamientoParaEvento(tenantId, entrenamientoId): Promise<EntrenamientoParaEvento | null>`:
  - Select the training columns plus the embeds `disciplina:disciplinas(nombre)`, `escenario:escenarios(id, nombre, tipo, ubicacion, direccion, coordenadas, capacidad, image_url)` and `entrenador:usuarios!entrenamientos_entrenador_id_fkey(id, nombre, apellido, email)`.
  - Filter with `.eq('tenant_id', tenantId).eq('id', entrenamientoId).maybeSingle()`.
  - Normalize each embed (array or object) to an object or `null`.
  - Map errors with `mapServiceError`.

## 6. Lib and types

- [x] 6.1 `src/types/portal/eventos.types.ts`: add `EventoDesdeEntrenamientoAjustes = { descripcionMovida: boolean; formularioExternoOmitido: boolean }`
- [x] 6.2 `src/types/portal/entrenamientos.types.ts`: add `EntrenamientoParaEvento`, with the training columns plus `disciplina`, `escenario` (`Pick<Scenario, …>`) and `entrenador` embeds
- [x] 6.3 `src/lib/portal/eventos-wizard.utils.ts`: add exported `toEscenarioSnapshot(scenario)`, moved from `EventoEscenarioSelector`
- [x] 6.4 Create `src/lib/portal/entrenamiento-evento.utils.ts` with `esEntrenamientoFuturo(fechaHora, now)`, which is true only when the date is non-null and strictly later than `now`
- [x] 6.5 In the same file, add `draftFromEntrenamiento(entrenamiento)` → `{ draft, ajustes, fechaOriginal }`, starting from `emptyEventoDraft()`:
  - name trimmed and truncated to `EVENTO_NOMBRE_MAX`;
  - a description over `EVENTO_DESCRIPCION_MAX` goes whole to `descripcionLarga`;
  - `fechaHora` via `toDateTimeLocalInBogota`;
  - numbers as strings;
  - discipline name;
  - `toEscenarioSnapshot` for the scenario;
  - trainer snapshot from `"{nombre} {apellido}".trim() || email || 'Entrenador'`, with empty experience;
  - `formularioId` from the internal form;
  - `formularioExternoOmitido` when there was an external link.

## 7. Verification

- [x] 7.1 Run `npx tsc --noEmit` and `npm run lint` and fix any issues. No test runner is configured; do not run `build`
- [x] 7.2 Manual happy path: as an admin, take a future training with a trainer, internal form, scenario and capacity → "Publicar en eventos" → check the copied fields, the notice and the capacity hint → "Guardar borrador" (URL becomes `/editar`, notice and hint gone) → add a ticket and a payment method → "Publicar evento"
- [x] 7.3 Manual check that capacity is not shared: buy a ticket on the new event and confirm that the training's available spots are unchanged, and vice versa
- [x] 7.4 Manual edge cases:
  - past training: disabled option, and `?desdeEntrenamiento=` opened directly → "Este entrenamiento ya pasó";
  - series occurrence (its own date);
  - description over 300 characters;
  - external form;
  - inactive discipline, scenario or form;
  - training without capacity (hint without "(cupo n)");
  - non-UUID and foreign ids;
  - `duplicar` + `desdeEntrenamiento` together;
  - trainer and athlete roles (no option);
  - leaving before saving (guard).
- [x] 7.5 Confirm in local Supabase that the source `entrenamientos` row is unchanged after saving the event

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`:
  - the `?desdeEntrenamiento=` param on the `nuevo` route;
  - the "Publicar en eventos" option in `EntrenamientoActionModal` / `EntrenamientosPage`;
  - the training-origin notice, empty states and capacity hint in `EventoWizardPage` / `EventoConfiguracionStep`;
  - the `useEventoWizard` training mode;
  - `getEntrenamientoParaEvento`;
  - the new `entrenamiento-evento.utils.ts`;
  - `toEscenarioSnapshot`;
  - the new types.

## 9. Commit and pull request

- [x] 9.1 After type-check and lint pass, write the commit message (`feat(eventos): publish a future training as an event`, referencing US-0132) and the pull request description: summary, scope / non-goals (capacity not shared, training → event only, future only), test notes
