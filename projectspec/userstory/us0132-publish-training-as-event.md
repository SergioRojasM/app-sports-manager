# US-0132 — Publish a Future Training as an Event

## ID
US-0132

## Name
"Publicar en eventos" action on a future training. It opens the create-event wizard pre-filled with that training's data, and tells the admin explicitly that the event's capacity is separate from the training's.

## As a
Tenant administrator

## I Want
To take one upcoming training and open the create-event wizard with its name, date, place, discipline, trainer, capacity and form already filled in.

## So That
I can sell a training to people outside the team (tickets, prices, payment methods) without typing the same data twice, while team members keep booking the training with their team plans.

---

## Description

### Current State
- **Trainings** (`gestion-entrenamientos`, `(shared)` route, admin + trainer) are private to the tenant. Since US-0123 they cannot be published. Team members book them with the units of their team plans.
- **Events** (`gestion-eventos`, `(administrador)` route) are sold through tickets (US-0119 / US-0121).
- To offer a training to the public, the admin has to retype it in the three-step event wizard: name, description, date and time, duration, place, discipline, trainer, capacity, lead times and form.
- US-0122 already pre-fills the event wizard from another event (`nuevo?duplicar={id}`): it loads the source, maps it to an **unsaved** draft, and saves nothing until the admin saves. This story follows the same approach, using a training as the source.

### Proposed Changes

#### Scope
| In scope | Out of scope |
|----------|--------------|
| "Publicar en eventos" action on one **future** training occurrence (one-time or part of a series) | Event → training direction (creating a training from an event) |
| `gestion-eventos/nuevo?desdeEntrenamiento={id}`: create wizard pre-filled from the training | Past trainings, or trainings without a date |
| Pure mapper `draftFromEntrenamiento` + `esEntrenamientoFuturo` rule | Turning a whole recurring series into several events |
| Notice in the wizard: source, adjustments, and that **capacity is not shared** | Shared capacity, or keeping training and event linked or in sync after creation |
| Persistent capacity hint next to "Cupo máximo" while creating from a training | A stored link (FK) between `entrenamientos` and `eventos`, or "already published" badges |
| | Buying event tickets with team plans |
| | Any database, RLS, RPC or migration change |

#### Key decision: pre-fill only, save nothing until the admin saves
The action does not write to the database. It navigates to the existing create-event route with a query param. The wizard loads the training, maps it to a **new, unsaved** draft, and from then on behaves exactly like "Nuevo evento", with all existing validation. If the admin leaves without saving, nothing is created. After creation, the training and the event are independent records: editing, cancelling or deleting one never changes the other.

#### Key decision: capacity is not shared, and the admin is told so while creating
The training's reservations and the event's tickets are counted separately. The event's `cupo_maximo` starts with the training's value, but it is the event's own capacity. Selling 20 tickets does not use up any of the training's spots, and the reverse is also true. The wizard states this explicitly in two places while the event is being created from a training (see *UI*), so the admin can adjust both capacities when together they must not exceed the real capacity of the place.

#### Rule: only future trainings
A training can be published as an event only when its `fecha_hora` is **later than now**. `null` dates and past trainings are excluded. The rule lives in one pure helper and is checked twice:
- In the training's options modal: the action is disabled for non-future trainings.
- In the wizard on load: this covers stale or hand-typed URLs, and a training that started while the modal was open.

```ts
// src/lib/portal/entrenamiento-evento.utils.ts
export function esEntrenamientoFuturo(fechaHora: string | null, now: number): boolean {
  return fechaHora !== null && new Date(fechaHora).getTime() > now;
}
```

The rule applies to trainings in any `estado`. A cancelled future training can be published if the admin chooses to.

---

#### Entry point — `EntrenamientoActionModal`
- New optional props `onPublicarEnEventos?: () => void`, `canPublicarEnEventos?: boolean` and `publicarEnEventosDisabledReason?: string`.
- When `onPublicarEnEventos` is passed, a new option card is shown **after "Ver reservas" and before "Editar"**:
  - Title: **"Publicar en eventos"**
  - Subtitle when enabled: `Abre el asistente de eventos con los datos de este entrenamiento.`
  - When disabled: the card uses the same `disabled` / `cursor-not-allowed` / `opacity-70` styling as "Editar", with the subtitle `publicarEnEventosDisabledReason`.
- `EntrenamientosPage`:
  - It passes `onPublicarEnEventos` **only when `role === 'administrador'`**, because the event wizard lives under the `(administrador)` route group. Trainers and athletes do not see the option.
  - `selectedActionContext` gains `canPublicarEnEventos = esEntrenamientoFuturo(instance.fecha_hora, currentTimestamp)` and `publicarEnEventosDisabledReason = 'Solo los entrenamientos futuros se pueden publicar como evento.'` when that is false.
  - Handler: if the training is not future, do nothing. Otherwise close the action modal and `router.push('/portal/orgs/{tenantId}/gestion-eventos/nuevo?desdeEntrenamiento={instance.id}')`. `instance.id` is the `entrenamientos` row (the specific occurrence), never the `entrenamientos_grupo` id.

#### Route
`src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` already validates `?duplicar=` with its local `UUID_RE`. It also reads `desdeEntrenamiento` the same way: first value if it is an array, accepted only when it matches `UUID_RE`.
- If both params are valid, `duplicar` wins and `desdeEntrenamiento` is ignored.
- `key` becomes `duplicarDeId ?? (desdeEntrenamientoId ? `entrenamiento-${desdeEntrenamientoId}` : 'nuevo')`.
- Renders `<EventoWizardPage key={…} tenantId={tenantId} duplicarDeId={duplicarDeId} desdeEntrenamientoId={desdeEntrenamientoId} />`.
- A missing or malformed value is ignored and the empty wizard opens, as today.

#### Loading the training — new service function
`entrenamientosService.getEntrenamientoParaEvento(tenantId, entrenamientoId)` reads one `entrenamientos` row with everything the mapper needs in a single query:

```ts
supabase
  .from('entrenamientos')
  .select(`
    id, nombre, descripcion, punto_encuentro, formulario_externo, formulario_id,
    fecha_hora, duracion_minutos, cupo_maximo, reserva_antelacion_horas, cancelacion_antelacion_horas,
    disciplina:disciplinas(nombre),
    escenario:escenarios(id, nombre, tipo, ubicacion, direccion, coordenadas, capacidad, image_url),
    entrenador:usuarios!entrenamientos_entrenador_id_fkey(id, nombre, apellido, email)
  `)
  .eq('tenant_id', tenantId)
  .eq('id', entrenamientoId)
  .maybeSingle();
```

It returns `EntrenamientoParaEvento | null`. The result is `null` when the row does not exist or belongs to another tenant. Supabase may return a one-element array for an embed; the function normalizes each embed to an object or `null`. Errors go through the existing `mapServiceError`.

#### Mapping — `draftFromEntrenamiento(entrenamiento)`
New pure function in the new file `src/lib/portal/entrenamiento-evento.utils.ts`. It starts from `emptyEventoDraft()` and returns `{ draft: EventoDraft; ajustes: EventoDesdeEntrenamientoAjustes; fechaOriginal: string }`. The caller guarantees the training is future, so the date is always copied.

| Event draft field | Source | Rule |
|-------------------|--------|------|
| `nombre` | `nombre` | Copied, trimmed, truncated to `EVENTO_NOMBRE_MAX` (150). `null` → `''` |
| `descripcion` | `descripcion` | Copied when its trimmed length is ≤ `EVENTO_DESCRIPCION_MAX` (300) |
| `descripcionLarga` | `descripcion` | When the description is **longer than 300**, the full text goes here and `descripcion` stays `''` (`ajustes.descripcionMovida = true`). Nothing is cut |
| `fechaHora` | `fecha_hora` | `toDateTimeLocalInBogota(fecha_hora)` |
| `duracionMinutos` | `duracion_minutos` | Copied as a string, `null` → `''` |
| `cupoMaximo` | `cupo_maximo` | Copied as a string, `null` → `''` (unlimited). **Not shared** with the training; see *UI* |
| `reservaAntelacionHoras` / `cancelacionAntelacionHoras` | same columns | Copied as strings, `null` → `''` |
| `disciplina` | `disciplina.nombre` | The discipline **name** (events store the name snapshot). An inactive discipline is still copied, and the wizard shows its existing "{nombre} (ya no existe)" label |
| `escenario` | `escenario` row | `toEscenarioSnapshot(escenario)` (see *Shared helper*). An inactive scenario is still copied, and the wizard shows its existing "(guardado en el evento)" label |
| `puntoEncuentro` | `punto_encuentro` | Copied, `null` → `''` |
| `entrenadores` | `entrenador` | `[{ id, nombre: "{nombre} {apellido}".trim() || email || 'Entrenador', experiencia: '' }]` when the training has a trainer, else `[]` |
| `formularioId` | `formulario_id` | Copied when the training has an internal form. An inactive template is handled by the existing wizard warning ("Formulario inactivo o eliminado"), which blocks publishing but not saving a draft |
| — | `formulario_externo` | Events do not support external form links. Not copied; `ajustes.formularioExternoOmitido = true` when it was non-empty |
| `publico` / `activo` | — | `true` / `true` (the `emptyEventoDraft()` defaults) |
| `bannerUrl`, `paginaEventoUrl`, `cronograma`, `incluye`, `omitirConfirmacionCompra`, `entradas`, `metodosPago` | — | Empty defaults from `emptyEventoDraft()`. A training has no banner, tickets, prices or payment methods |

**Never copied**, because there is no event equivalent: `formulario_obligatorio` (an event form is always answered at checkout), per-level categories (`entrenamiento_categorias`), booking restrictions (`entrenamiento_restricciones`), series rules, reservations and attendance.

```ts
// src/types/portal/eventos.types.ts
export type EventoDesdeEntrenamientoAjustes = {
  descripcionMovida: boolean;        // description > 300 chars, moved to "Descripción larga"
  formularioExternoOmitido: boolean; // the training used an external form link
};
```

`fechaOriginal` is the training's date as a `datetime-local` value. It seeds the hook's `fechaAncla`, as US-0122 does, so ticket windows created later follow the date if the admin changes it.

#### Shared helper
Move the private `toSnapshot(scenario)` from `EventoEscenarioSelector.tsx` to `eventos-wizard.utils.ts` as the exported `toEscenarioSnapshot(scenario: Pick<Scenario, 'id' | 'nombre' | 'tipo' | 'ubicacion' | 'direccion' | 'coordenadas' | 'capacidad' | 'image_url'>): EventoEscenarioSnapshot`. `EventoEscenarioSelector` imports it, with no change in behavior.

#### Wizard behavior — `useEventoWizard`
New optional argument `desdeEntrenamientoId?: string`. It only applies when neither `eventoId` nor `duplicarDeId` is passed.
- **Load**: `loading` starts `true`. `load()` calls `entrenamientosService.getEntrenamientoParaEvento(tenantId, desdeEntrenamientoId)`.
  - `null` → `notFound = true`, `notFoundKind = 'entrenamiento'`.
  - `!esEntrenamientoFuturo(entrenamiento.fecha_hora, Date.now())` → `notFound = true`, `notFoundKind = 'entrenamiento-pasado'`. No draft is built.
  - Error → the existing `loadError` state with "Reintentar" (`reload` works in this mode too).
  - Success → `setDraft(draft)`, `fechaAncla.current = fechaOriginal`, and new state `origenEntrenamiento = { id, nombre, cupoMaximo: entrenamiento.cupo_maximo, ajustes }`.
- **Identity and dirty state**: same as duplicate mode. The client-generated `eventoId` is kept, along with `esNuevo = true` and `esBorrador = true`, and the baseline stays `serializeDraft(emptyEventoDraft())`. The draft is therefore dirty from the start: "Guardar borrador" is enabled and the leave guard is armed.
- **Saving**: unchanged. The first "Guardar borrador" replaces the URL with `/gestion-eventos/{newId}/editar?paso={step}`, which removes `desdeEntrenamiento`. "Publicar evento" runs the full validation. With no tickets it stops on step 2, as for any new event. The redirect after publishing is the existing `?guardado=creado`. There is no banner to copy (the `copyEventoBanner` path is only for duplicates).
- **Returned values**: `origenEntrenamiento: { id: string; nombre: string; cupoMaximo: number | null; ajustes: EventoDesdeEntrenamientoAjustes } | null`, reset to `null` after the first successful save; and `notFoundKind: 'evento' | 'entrenamiento' | 'entrenamiento-pasado'` (default `'evento'`).

#### UI — `EventoWizardPage`
- New prop `desdeEntrenamientoId?: string`, forwarded to the hook.
- Not-found variants (same empty-state component and "Volver a eventos" button as today):
  - `'entrenamiento'` → title **"Entrenamiento no encontrado"**, description `El entrenamiento no existe o pertenece a otra organización.`
  - `'entrenamiento-pasado'` → title **"Este entrenamiento ya pasó"**, description `Solo los entrenamientos futuros se pueden publicar como evento.`
- When `wizard.origenEntrenamiento` is set, a dismissible notice is rendered between the header and the stepper. It uses the same markup and styling as the US-0122 duplicate notice (`role="status"`, cyan info, icon `fitness_center`, close button `aria-label="Cerrar mensaje"`):
  - Main line: `Estás publicando como evento el entrenamiento "{nombre}". No se guarda nada hasta que pulses "Guardar borrador" o "Publicar evento".`
  - Always (capacity): `La capacidad no es compartida: el evento tiene su propio cupo, independiente del entrenamiento. Las reservas del entrenamiento y las entradas del evento se cuentan por separado; ajusta ambos cupos si juntos no deben superar la capacidad real.`
  - Always: `Define las entradas (paso 2) y los métodos de pago (paso 3): un entrenamiento no tiene precios.`
  - `descripcionMovida`: `La descripción del entrenamiento supera 300 caracteres: la movimos a "Descripción larga". Escribe una descripción corta.`
  - `formularioExternoOmitido`: `El entrenamiento usa un enlace de formulario externo, que los eventos no admiten. Elige un formulario interno si lo necesitas.`
- The page title stays "Nuevo evento".

#### UI — capacity hint in `EventoConfiguracionStep`
The notice can be dismissed, so the capacity rule is also shown where the value is edited. While `wizard.origenEntrenamiento` is set, the "Cupo máximo" field (section "Cupo y reservas") shows this hint, with `id="evento-cupo-hint"` (already referenced by `aria-describedby`), in place of the current `Vacío = cupo ilimitado.`:
- Training with capacity: `Cupo propio del evento, no compartido con el entrenamiento "{nombre}" (cupo {n}). Vacío = cupo ilimitado.`
- Training without capacity: `Cupo propio del evento, no compartido con el entrenamiento "{nombre}". Vacío = cupo ilimitado.`

The hint cannot be dismissed. It disappears together with `origenEntrenamiento` after the first successful save.

---

## Database Changes

None. No migration is needed.

- Reading the training uses the existing `entrenamientos` SELECT policy (tenant members via `get_member_tenants_for_authenticated_user()`). The embeds read `disciplinas`, `escenarios` and `usuarios` under their existing policies, the same tables `listDisciplineOptions` / `listScenarioOptions` / `listTrainerOptions` already read.
- The event is created by the existing `guardar_evento_completo` RPC (`p_es_nuevo = true`), which already enforces role, tenant, format and completeness.

---

## API / Server Actions

No new server action, route handler or RPC. All calls use the browser client with the user's session.

### `src/services/supabase/portal/entrenamientos.service.ts` (modify)
- **Function**: `getEntrenamientoParaEvento(tenantId: string, entrenamientoId: string): Promise<EntrenamientoParaEvento | null>`
- **Query**: the select shown above, `.eq('tenant_id', tenantId).eq('id', entrenamientoId).maybeSingle()`.
- **Returns**: the mapped row with normalized embeds, or `null`.
- **Auth / RLS**: existing `entrenamientos` SELECT policy. Called only from the `(administrador)` wizard route.

### `src/services/supabase/portal/eventos.service.ts` (unchanged, reused)
- `guardarEventoCompleto(tenantId, eventoId, payload, { esNuevo: true, borrador })` creates the event.

### `src/lib/portal/entrenamiento-evento.utils.ts` (new)
- `esEntrenamientoFuturo(fechaHora: string | null, now: number): boolean`
- `draftFromEntrenamiento(entrenamiento: EntrenamientoParaEvento): { draft: EventoDraft; ajustes: EventoDesdeEntrenamientoAjustes; fechaOriginal: string }`
- Pure functions with no I/O. They reuse `toDateTimeLocalInBogota` from `eventos.utils.ts`, and `emptyEventoDraft` / `toEscenarioSnapshot` / `EVENTO_NOMBRE_MAX` / `EVENTO_DESCRIPCION_MAX` from `eventos-wizard.utils.ts`.

### Types
```ts
// src/types/portal/entrenamientos.types.ts
export type EntrenamientoParaEvento = {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  punto_encuentro: string | null;
  formulario_externo: string | null;
  formulario_id: string | null;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  disciplina: { nombre: string } | null;
  escenario: Pick<Scenario, 'id' | 'nombre' | 'tipo' | 'ubicacion' | 'direccion' | 'coordenadas' | 'capacidad' | 'image_url'> | null;
  entrenador: { id: string; nombre: string | null; apellido: string | null; email: string | null } | null;
};
```

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/eventos.types.ts` | Add `EventoDesdeEntrenamientoAjustes` |
| Types | `src/types/portal/entrenamientos.types.ts` | Add `EntrenamientoParaEvento` |
| Lib | `src/lib/portal/entrenamiento-evento.utils.ts` | **New**: `esEntrenamientoFuturo`, `draftFromEntrenamiento` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | Add exported `toEscenarioSnapshot` (moved from the selector) |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Add `getEntrenamientoParaEvento` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | `desdeEntrenamientoId` argument and load branch (with the future check); `origenEntrenamiento`; `notFoundKind` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | `desdeEntrenamientoId` prop; training-origin notice with the capacity line; "Entrenamiento no encontrado" / "Este entrenamiento ya pasó" variants |
| Component | `src/components/portal/gestion-eventos/wizard/EventoConfiguracionStep.tsx` | Capacity hint on "Cupo máximo" while `origenEntrenamiento` is set |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEscenarioSelector.tsx` | Import `toEscenarioSnapshot` instead of the local `toSnapshot` |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | `onPublicarEnEventos` / `canPublicarEnEventos` / `publicarEnEventosDisabledReason` + "Publicar en eventos" card |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Admin-only `onPublicarEnEventos` → wizard; future check in `selectedActionContext` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Validate `desdeEntrenamiento`; `duplicar` precedence; new `key`; pass the prop |
| Docs | `projectspec/03-project-structure.md` | Note the `?desdeEntrenamiento=` param, the "Publicar en eventos" action, the new lib file, `getEntrenamientoParaEvento` and `toEscenarioSnapshot` |

---

## Acceptance Criteria

1. As an administrador, the options modal of any training shows "Publicar en eventos" between "Ver reservas" and "Editar". As an entrenador or athlete it is not shown.
2. For a training whose date is later than now (one-time or part of a series, in any `estado`), the option is enabled.
3. For a past training, or one without a date, the option is disabled and reads `Solo los entrenamientos futuros se pueden publicar como evento.`
4. Choosing the enabled option navigates to `/portal/orgs/{tenantId}/gestion-eventos/nuevo?desdeEntrenamiento={entrenamientoId}` and writes nothing to the database: leaving the wizard without saving leaves the events list unchanged.
5. The wizard opens titled "Nuevo evento". It has name, description, date and time, duration, discipline, scenario, meeting point, trainer, capacity, booking and cancellation lead times and internal form taken from that specific occurrence. For a series, the date is that occurrence's date, not the series start.
6. The tickets step and the payment methods step start empty, and the notice says to define them.
7. The notice states that capacity is not shared. The "Cupo máximo" field shows the non-dismissible hint `Cupo propio del evento, no compartido con el entrenamiento "{nombre}" (cupo {n}). …`, and it stays visible after the notice is closed.
8. Capacity is not shared after creation: once the event is published, buying event tickets does not change the training's available spots, and booking the training does not change the event's sold count.
9. A training description longer than 300 characters is placed, complete, in "Descripción larga", with "Descripción" empty and the notice line explaining it. A description of 300 characters or less goes to "Descripción".
10. A training with an external form link produces no form in the event, and the notice says external links are not supported.
11. A training whose discipline or scenario is inactive shows them with the wizard's existing stale labels. A training whose internal form is inactive shows the existing warning and can be saved as a draft but not published.
12. "Guardar borrador" is enabled as soon as the draft loads. Pressing it creates a new draft event, and the URL becomes `/gestion-eventos/{newId}/editar?paso={step}` without `desdeEntrenamiento`. The notice and the capacity hint are gone after that save.
13. "Publicar evento" with at least one complete ticket and its payment method publishes the event and redirects to the list with "Evento creado correctamente."
14. The source training is unchanged after the event is saved (same data, same capacity, same reservations).
15. `nuevo?desdeEntrenamiento={id}` of a past training (for example, a URL opened later) shows "Este entrenamiento ya pasó" with "Volver a eventos", and no draft.
16. `nuevo?desdeEntrenamiento={id}` with an id that does not exist or belongs to another tenant shows "Entrenamiento no encontrado" with "Volver a eventos".
17. A `desdeEntrenamiento` value that is not a UUID is ignored, and the empty wizard opens. With both `duplicar` and `desdeEntrenamiento`, the duplicate mode wins.
18. If loading the training fails, the error state with "Reintentar" is shown, and retrying loads the draft.
19. Trying to leave before the first save triggers the existing unsaved-changes guard.
20. The option card can be reached with Tab and activated with Enter. The notice uses `role="status"` and its close button has `aria-label="Cerrar mensaje"`. The capacity hint is announced through the field's `aria-describedby`.

---

## Implementation Steps

- [ ] Add the types `EventoDesdeEntrenamientoAjustes` and `EntrenamientoParaEvento`
- [ ] Move `toSnapshot` to `eventos-wizard.utils.ts` as `toEscenarioSnapshot` and update `EventoEscenarioSelector`
- [ ] Create `entrenamiento-evento.utils.ts` with `esEntrenamientoFuturo` and `draftFromEntrenamiento`
- [ ] Add `entrenamientosService.getEntrenamientoParaEvento`
- [ ] Extend `useEventoWizard` with `desdeEntrenamientoId` (load, future check, `origenEntrenamiento`, `notFoundKind`)
- [ ] Update `nuevo/page.tsx` to read and validate `?desdeEntrenamiento=`
- [ ] `EventoWizardPage`: prop, notice (with the capacity line), not-found variants
- [ ] `EventoConfiguracionStep`: capacity hint
- [ ] `EntrenamientoActionModal` option + admin-only, future-only wiring in `EntrenamientosPage`
- [ ] Run lint and type-check
- [ ] Test manually, happy path: future training with trainer, internal form and scenario → publish as an event with one ticket. Confirm that the training's spots and the event's sold count stay independent
- [ ] Test manually, edge cases: past training (disabled option, and the URL opened directly), series occurrence, long description, external form, inactive discipline/scenario/form, training without capacity, invalid / foreign id, trainer and athlete roles, leaving without saving
- [ ] Confirm in Supabase that the training row is untouched after saving the event
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No new privileges, tables or policies. The wizard stays under the `(administrador)` layout guard, and the option is only rendered for administradores. The training is read with `tenant_id` + `id` under RLS, so a foreign id behaves as not found. The param is accepted only as a UUID and is used only as a filter value. The future-only rule is re-checked on load, not only in the modal. The event is written through the existing invoker RPC, which re-checks role and tenant.
- **Performance**: One extra single-row query (`getEntrenamientoParaEvento`) when the wizard opens in this mode, run in parallel with the existing option lists. No change to the trainings or events list pages.
- **Accessibility**: "Publicar en eventos" is a native `<button>` card, and when disabled it has the `disabled` attribute and shows a visible reason. The notice uses `role="status"`, and its close button has `aria-label="Cerrar mensaje"`. The capacity hint reuses the existing `evento-cupo-hint` id referenced by the input's `aria-describedby`. The wizard's focus management is unchanged.
- **Error handling**: Training not found → "Entrenamiento no encontrado" state. Past training → "Este entrenamiento ya pasó" state. Load error → the existing wizard error state with "Reintentar". Save errors → the existing `role="alert"` block in the wizard footer.
