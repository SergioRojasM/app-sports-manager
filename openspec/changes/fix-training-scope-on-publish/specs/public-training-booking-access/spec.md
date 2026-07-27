## ADDED Requirements

### Requirement: Publication state drives source training scope
The system SHALL keep `entrenamientos.visibilidad` and `entrenamientos.visible_para` in sync with the `activo` state of the training's `entrenamientos_publicos` row, via a database trigger on `entrenamientos_publicos` (`AFTER INSERT OR UPDATE`). When a publication is active (`activo = true`), the referenced training's `visibilidad` MUST be `'publico'` and `visible_para` MUST equal the `PUBLIC_TENANT_ID` sentinel (`'2a089688-3cfc-4216-9372-33f50079fbd1'`). When a publication is inactive (`activo = false`), the referenced training's `visibilidad` MUST revert to `'privado'` and `visible_para` MUST equal the training's own `tenant_id`. Trainings not currently `'publico'` MUST NOT be modified by a despublish event (no-op guard).

#### Scenario: Publishing a training flips its scope to public
- **WHEN** a tenant admin publishes a training for the first time (`entrenamientosPublicosService.publicarEntrenamiento` inserts a row with `activo = true`)
- **THEN** the source `entrenamientos` row for that `entrenamiento_id` has `visibilidad = 'publico'` and `visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'` immediately after the call returns

#### Scenario: Despublishing reverts the scope to private
- **WHEN** a tenant admin clicks "Quitar publicación" (`despublicarEntrenamiento` sets `activo = false`)
- **THEN** the source `entrenamientos` row reverts to `visibilidad = 'privado'` and `visible_para` equal to its own `tenant_id`

#### Scenario: Republishing flips the scope back to public
- **WHEN** an admin reopens "Gestionar publicación" on a previously despublished training and saves again (`activo` re-set to `true`)
- **THEN** the source training's `visibilidad` becomes `'publico'` again

#### Scenario: Backfill fixes already-published trainings
- **WHEN** the migration runs against a database that already contains one or more `entrenamientos_publicos` rows with `activo = true` whose source training is still `visibilidad = 'privado'`
- **THEN** those trainings' `visibilidad` is updated to `'publico'` as part of the migration, without any admin action required

#### Scenario: Sync is scoped to the single published instance
- **WHEN** a training that belongs to a recurring series is published
- **THEN** only the `entrenamientos` row matching `entrenamientos_publicos.entrenamiento_id` changes scope — no sibling instance in the same `entrenamiento_grupo` is affected

---

### Requirement: Cross-tenant read access to a public training's booking data
The RLS SELECT policies on `entrenamiento_categorias` and `entrenamiento_restricciones` SHALL grant read access, in addition to their existing tenant-membership branch, when the row's associated `entrenamientos.visibilidad = 'publico'`. The RLS SELECT and INSERT policies on `reservas` SHALL grant access, in addition to their existing branches, when the target `entrenamientos.visibilidad = 'publico'` (INSERT additionally requires `atleta_id = auth.uid()`, i.e. self-booking only).

#### Scenario: Non-member sees selectable categories/levels
- **WHEN** an authenticated user who is not a member of the publishing tenant opens the booking form for a published training
- **THEN** `entrenamiento_categorias` rows for that training are returned and rendered as selectable levels, instead of an empty list

#### Scenario: Non-servicio restrictions are still evaluated for a visitor
- **WHEN** a published training carries an `entrenamiento_restricciones` row with `validar_nivel_disciplina` or `usuario_estado` set (servicio-based restrictions are already blocked at publish time) and a non-member visitor who does not meet it attempts to book
- **THEN** the restriction rows are readable and the booking is rejected with the same `NIVEL_INSUFICIENTE`/`USUARIO_INACTIVO` messaging used for same-tenant bookings — the restriction MUST NOT be silently skipped because RLS hid the row

#### Scenario: Duplicate booking is detected for a non-member
- **WHEN** a non-member visitor who already has an active booking for a published training attempts to book it again
- **THEN** the booking is rejected as a duplicate, because their own prior `reservas` row is now visible under the widened SELECT policy

#### Scenario: Capacity is accurately enforced for a non-member
- **WHEN** a non-member visitor attempts to book a published training whose active bookings already equal `cupo_maximo`
- **THEN** the booking is rejected with `capacity_exceeded`, because the real active-reservation count is now visible under the widened SELECT policy

#### Scenario: Non-member successfully books a published training
- **WHEN** a non-member visitor completes the booking form for a published training with an available category and no unmet restriction
- **THEN** a `reservas` row is created for that visitor against the source `entrenamiento_id`

#### Scenario: Private-tenant data stays hidden
- **WHEN** a user who is not a member of a tenant queries `entrenamiento_categorias`, `entrenamiento_restricciones`, or `reservas` for a training that is not published (`visibilidad = 'privado'`)
- **THEN** no rows are returned, identical to today's behavior

---

### Requirement: Non-member image uploads for a published training's form
The Storage RLS policies on `storage.objects` (bucket `org-assets`, path `orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/...`) SHALL permit a non-member visitor to upload and read back their own image-type form-response file when the target `formularioPlantillaId` is attached (`entrenamientos.formulario_id`) to at least one training in that tenant with `visibilidad = 'publico'`. This access MUST remain scoped to the visitor's own uploaded file (their own `auth.uid()` path segment) and MUST NOT grant read access to any other visitor's uploaded file. This is additive to, and does not modify, the existing tenant-member upload/read policies.

#### Scenario: Non-member uploads and previews their own image field
- **WHEN** a non-member visitor fills out a published training's attached form and it contains an image-type field
- **THEN** the upload succeeds and the immediately-following signed-URL read-back also succeeds, allowing the field's preview to render

#### Scenario: Upload is rejected for a non-published training's form
- **WHEN** a non-member visitor attempts the same upload against a training's `formulario_id` where the training is `visibilidad = 'privado'`
- **THEN** the upload is rejected by RLS, identical to today's behavior

#### Scenario: Tenant admin retains visibility into the visitor's submission
- **WHEN** the publishing tenant's admin later reviews the cross-tenant visitor's `formulario_respuestas` row for a published training
- **THEN** the admin can read the visitor's uploaded image via the pre-existing, unmodified `org_member_read` policy — this requirement neither grants nor restricts that access

#### Scenario: Existing tenant-member upload is unaffected
- **WHEN** an existing member of a tenant uploads an image for a form response on a training in their own tenant (public or private)
- **THEN** the upload succeeds via the original membership branch, unchanged

---

### Requirement: Publish modal button labels state their action unambiguously
`PublicarEntrenamientoModal` SHALL label its footer actions based on the training's current publication state (`isPublished`). When not published, the modal SHALL show a single primary button labeled "Publicar". When already published, the modal SHALL show both a "Quitar publicación" button (unpublish) and a "Guardar cambios de la publicación" button (save edits to the publication's marketing fields) — the labels "Despublicar" and the bare "Guardar cambios" MUST NOT be used.

#### Scenario: Unpublished training shows a single Publicar action
- **WHEN** an admin opens "Publicar" on a training with no existing publication
- **THEN** the modal footer shows one primary button labeled "Publicar"

#### Scenario: Published training shows both actions with unambiguous labels
- **WHEN** an admin opens "Gestionar publicación" on an already-published training
- **THEN** the modal footer shows "Quitar publicación" (left) and "Guardar cambios de la publicación" (right primary), and neither reads "Despublicar" or "Guardar cambios"

#### Scenario: Saving edits on a published listing behaves unchanged
- **WHEN** an admin edits nombre/descripción/precio/banner on an already-published training and clicks "Guardar cambios de la publicación"
- **THEN** the changes are persisted to `entrenamientos_publicos` exactly as the previous "Guardar cambios" button did — the rename introduces no functional change
