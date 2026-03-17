## 1. Branch Setup

- [x] 1.1 Create new branch `feat/us0023-booking-with-discipline-level-selection` from `develop`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Types

- [x] 2.1 Add `CategoriaDisponibilidad` type to `src/types/portal/reservas.types.ts` with fields: `id`, `nivel_id`, `nombre`, `orden`, `cupos_asignados`, `reservas_activas`, `disponible`
- [x] 2.2 Add `'categoria_not_found'` to `ReservaServiceErrorCode` union in `src/services/supabase/portal/reservas.service.ts`

## 3. Service

- [x] 3.1 Implement `getCategoriasConDisponibilidad(tenantId, entrenamientoId)` in `reservas.service.ts`: fetch `entrenamiento_categorias` joined with `nivel_disciplina`, count non-cancelled `reservas` per category, merge counts and compute `disponible`, return `CategoriaDisponibilidad[]` ordered by `orden` ASC
- [x] 3.2 Implement `getAtletaNivelId(tenantId, atletaId, disciplinaId)` in `reservas.service.ts`: query `usuario_nivel_disciplina` and return `nivel_id` or `null`
- [x] 3.3 Extend `create()` in `reservas.service.ts`: when `entrenamiento_categoria_id` is provided, verify it belongs to `entrenamiento_id` (throw `categoria_not_found` if not), then count active reservas for that category and throw `capacity_exceeded` if full
- [x] 3.4 Extend `create()` insert statement to include `entrenamiento_categoria_id` when present
- [x] 3.5 Export new service functions via `reservasService` object

## 4. Hook — `useReservas`

- [x] 4.1 Add `categorias: CategoriaDisponibilidad[]` and `loadingCategorias: boolean` to `UseReservasResult` type in `useReservas.ts`
- [x] 4.2 Add state and loading flag for `categorias` inside the hook; load via `reservasService.getCategoriasConDisponibilidad` alongside `reservas` and `capacidad` in `loadReservas`
- [x] 4.3 Expose `refetchCategorias(): Promise<void>` — calls `getCategoriasConDisponibilidad` and updates state

## 5. Hook — `useReservaForm`

- [x] 5.1 Add `entrenamiento_categoria_id: string | null` to `ReservaFormValues` and `ReservaFormErrors` in `useReservaForm.ts`
- [x] 5.2 Extend `UseReservaFormOptions` with `categorias: CategoriaDisponibilidad[]`, `disciplinaId: string | null`, `atletaId: string | null`
- [x] 5.3 Make `openCreate()` async; when `categorias.length > 0` and `atletaId` is set, call `reservasService.getAtletaNivelId` and pre-fill `entrenamiento_categoria_id` with the matching available category (if found)
- [x] 5.4 Add validation in `submitCreate()`: if `categorias.length > 0` and `entrenamiento_categoria_id` is null, set field error `'Debes seleccionar un nivel para esta reserva.'` and return false
- [x] 5.5 Pass `entrenamiento_categoria_id` in `CreateReservaInput` when calling `onCreateReserva`
- [x] 5.6 Extend `updateField` union type to include `'entrenamiento_categoria_id'`
- [x] 5.7 Reset `entrenamiento_categoria_id` to `null` in `reset()` and on `openEdit()`

## 6. Component — `ReservaFormModal`

- [x] 6.1 Add `categorias: CategoriaDisponibilidad[]` and `loadingCategorias: boolean` to `ReservaFormModalProps` in `ReservaFormModal.tsx`
- [x] 6.2 Add `entrenamiento_categoria_id: string | null` to the `form` prop shape and `entrenamiento_categoria_id?: string` to `errors` prop shape
- [x] 6.3 Add `'entrenamiento_categoria_id'` to the `onUpdateField` prop union
- [x] 6.4 Implement the level selector section (create mode only, `categorias.length > 0`): `<fieldset>` / `<legend>` with one `<input type="radio">` per category, ordered by `orden`; each option shows `nombre · X cupos disponibles`; disabled + `aria-disabled="true"` when `disponible = false`; skeleton/spinner when `loadingCategorias = true`
- [x] 6.5 Render inline validation error below the selector when `errors.entrenamiento_categoria_id` is set

## 7. Component — `ReservasPanel`

- [x] 7.1 Destructure `categorias`, `loadingCategorias`, `refetchCategorias` from `useReservas` in `ReservasPanel.tsx`
- [x] 7.2 Pass `disciplinaId` (from `instance.disciplina_id`) and `atletaId` (from `currentUserId`) into `useReservaForm` options
- [x] 7.3 Pass `categorias` and `loadingCategorias` to `ReservaFormModal`
- [x] 7.4 Call `refetchCategorias()` after `createReserva` and `cancelReserva` mutations complete successfully

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` to document the new `CategoriaDisponibilidad` type, the new service functions (`getCategoriasConDisponibilidad`, `getAtletaNivelId`), and the extended hook/form API

## 9. Commit and PR

- [x] 9.1 Stage all changes, create commit with message: `feat(reservas): level-aware booking with discipline category selection (US0023)`
- [x] 9.2 Push branch and open pull request with description: "Implements US0023 — when a training has per-level categories (`entrenamiento_categorias`), the booking form now shows a level selector with remaining spots. The athlete's assigned level is auto-selected when available. Per-category capacity is validated server-side before insert. Trainings without categories retain existing behavior unchanged."
