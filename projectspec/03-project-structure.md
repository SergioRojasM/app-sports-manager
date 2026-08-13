# Project Structure

Following structure reflects the current implementation and the target scalable pattern based on hexagonal architecture + feature slices.

## Directory Structure

```text
/

│
├── src/
│   ├── app/                              # Inbound adapters (routing / delivery)
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Landing/home
│   │   ├── globals.css                   # Global styles & Tailwind imports
│   │   ├── auth/                         # Authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   ├── entrenamientos-publicos/page.tsx  # Public, unauthenticated trainings discovery page (top-level, outside /portal — not matched by middleware.ts's protectedPaths) (US-0091)
│   │   ├── dashboard/                    # Legacy redirect entry
│   │   └── portal/                       # Main post-login bounded context
│   │       ├── layout.tsx                # Shared portal shell (header + nav)
│   │       ├── loading.tsx
│   │       ├── page.tsx                  # Redirects to /portal/inicio
│   │       ├── bootstrap/route.ts        # Post-login bootstrap (default → /portal/inicio)
│   │       ├── inicio/                   # User home dashboard (cross-tenant overview)
│   │       │   ├── page.tsx
│   │       │   └── loading.tsx
│   │       ├── perfil/page.tsx           # User profile (global, not tenant-scoped)
│   │       ├── (atleta)/                 # Portal-level athlete area (US-0093) — no role gate: roles are per-tenant and public-plan buyers hold no membership; pages are self-scoped by atleta_id = auth.uid()
│   │       │   ├── layout.tsx            # Pass-through; auth is enforced by the parent portal shell
│   │       │   ├── mis-suscripciones/page.tsx  # Cross-tenant "Mis Suscripciones" (replaces the tenant-scoped route)
│   │       │   └── mis-reservas/page.tsx       # Cross-tenant "Mis Reservas" (replaces the tenant-scoped route, US-0097)
│   │       ├── entrenamientos-publicos/page.tsx  # Public Training Marketplace (non-tenant-scoped, render-only) — cross-tenant discovery of published trainings (US-0089)
│   │       └── orgs/
│   │           ├── page.tsx              # Organizations discovery (all authenticated users)
│   │           └── [tenant_id]/
│   │               ├── layout.tsx        # Membership + role gate for tenant entry
│   │               ├── page.tsx          # Redirect to tenant role landing
│   │               ├── (administrador)/
│   │               │   ├── layout.tsx        # Role guard: redirects non-administrador users to /portal/orgs/[tenant_id]
│   │               │   ├── gestion-disciplinas/page.tsx
│   │               │   ├── gestion-equipo/page.tsx
│   │               │   ├── gestion-escenarios/page.tsx
│   │               │   ├── gestion-formularios/page.tsx  # Admin: form templates list (US-0084/US-0085)
│   │               │   ├── gestion-formularios/[formulario]/page.tsx  # Admin: Google-Forms-style section builder for one template (US-0085)
│   │               │   ├── gestion-organizacion/page.tsx
│   │               │   ├── gestion-servicios/page.tsx   # Admin: services catalog CRUD (US-0062)
│   │               │   └── gestion-suscripciones/page.tsx
│   │               ├── (atleta)/
│   │               │   ├── layout.tsx        # Role guard: redirects non-usuario users to /portal/orgs/[tenant_id]
│   │               │   ├── entrenamientos-disponibles/page.tsx
│   │               │   ├── mis-suscripciones-y-pagos/page.tsx  # Legacy route — redirects to /portal/mis-suscripciones (US-0093)
│   │               │   └── mis-reservas/page.tsx               # Legacy route — redirects to /portal/mis-reservas (US-0097)
│   │               ├── (entrenador)/
│   │               │   ├── layout.tsx        # Role guard: redirects non-entrenador users to /portal/orgs/[tenant_id]
│   │               │   └── atletas/page.tsx
│   │               └── (shared)/
│   │                   ├── layout.tsx        # Membership guard: any valid role allowed
│   │                   ├── gestion-entrenamientos/page.tsx
│   │                   ├── gestion-planes/page.tsx
│   │                   └── gestion-reservas/page.tsx        # Shared: cross-training reservations management with server-side filtering (US-0073)
│   │
│   ├── components/                       # Presentation layer
│   │   ├── auth/
│   │   ├── landing/
│   │   │   └── entrenamientos-publicos/  # Feature slice (landing/entrenamientos-publicos — public discovery page, US-0091)
│   │   │       ├── PublicEntrenamientosLandingPage.tsx  # Page shell; reuses PublicTrainingCard/PublicTrainingsGrid from components/portal/entrenamientos-publicos as-is (no auth coupling)
│   │   │       ├── RegistrateParaReservarModal.tsx      # "Regístrate para reservar" CTA dialog shown instead of the real booking flow for anonymous visitors
│   │   │       └── index.ts
│   │   ├── portal/
│   │   │   ├── PortalHeader.tsx          # Shared portal shell components
│   │   │   ├── PortalNavMenu.tsx
│   │   │   ├── PortalSidebar.tsx
│   │   │   ├── RoleBasedMenu.tsx
│   │   │   ├── UserAvatarMenu.tsx
│   │   │   ├── inicio/                   # Feature slice (portal/inicio — user home dashboard)
│   │   │   │   ├── InicioPage.tsx
│   │   │   │   ├── InicioStatsCards.tsx
│   │   │   │   ├── InicioFeaturedTraining.tsx
│   │   │   │   ├── InicioProximosEntrenamientos.tsx
│   │   │   │   ├── InicioSuscripciones.tsx  # "use client" — filter chips
│   │   │   │   ├── InicioOrganizaciones.tsx
│   │   │   │   ├── InicioQuickActions.tsx
│   │   │   │   ├── InicioPagosPendientesAlert.tsx
│   │   │   │   └── index.ts
│   │   │   ├── tenant/                   # Feature slice (portal/tenant)
│   │   │   │   ├── TenantIdentityCard.tsx
│   │   │   │   ├── TenantContactCard.tsx
│   │   │   │   ├── TenantDirectoryList.tsx
│   │   │   │   ├── TenantPaymentMethodsCard.tsx  # Admin card: CRUD list of tenant payment methods
│   │   │   │   ├── MetodoPagoFormModal.tsx        # Right-side form modal for create/edit payment method
│   │   │   │   ├── TenantReglasSuspensionCard.tsx # Admin card: CRUD list of suspension rules (max 3)
│   │   │   │   ├── ReglaSuspensionFormModal.tsx   # Right-side form modal for create/edit suspension rule
│   │   │   │   └── SolicitarAccesoButton.tsx  # 5-state access request button: idle/pending/blocked/incomplete_profile/member
│   │   │   └── scenarios/                # Feature slice (portal/scenarios)
│   │   │       ├── ScenariosPage.tsx
│   │   │       ├── ScenarioCard.tsx
│   │   │       └── ScenarioFormModal.tsx
│   │   │   └── disciplines/              # Feature slice (portal/disciplines)
│   │   │       ├── DisciplinesPage.tsx
│   │   │       ├── DisciplinesTable.tsx
│   │   │       ├── DisciplineFormModal.tsx
│   │   │       ├── NivelesDisciplinaPanel.tsx   # Collapsible panel per discipline row for level CRUD
│   │   │       └── NivelDisciplinaFormModal.tsx  # Right-side modal for create/edit level
│   │   │   └── entrenamientos/           # Feature slice (portal/entrenamientos)
│   │   │       ├── EntrenamientosPage.tsx  # Computes canPublish/publishDisabledReason (servicio-restriction pre-publish gate) alongside selectedActionContext; wires PublicarEntrenamientoModal (US-0089)
│   │   │       ├── EntrenamientosCalendar.tsx   # Dot colors driven by visibilidad; includes public/private legend
│   │   │       ├── EntrenamientoFormModal.tsx   # Visibilidad is now a read-only info row (always 'privado' on create) — publishing happens via the "Publicar" action instead (US-0089)
│   │   │       ├── EntrenamientoDetalleModal.tsx  # Read-only "Ver detalle" view (incl. past trainings); includes "Guardar como plantilla"
│   │   │       ├── EntrenamientoCategoriasSection.tsx  # Optional per-level capacity allocation step
│   │   │       ├── EntrenamientoRestriccionesSection.tsx  # Collapsible restriction-row editor (timing + service-based access conditions, AND/OR per row)
│   │   │       ├── EntrenamientoFormularioSection.tsx  # Formulario attachment: none/externo/interno toggle, plantilla picker (role-gated "crear nueva"), obligatorio checkbox (US-0086)
│   │   │       ├── EntrenamientosList.tsx       # Renders VisibilidadBadge per row; shows attached formulario (externo link or interno plantilla name) + Obligatorio tag
│   │   │       ├── EntrenamientoActionModal.tsx  # Options menu; admin-only "Publicar"/"Gestionar publicación" entry, disabled when historical or servicio-restricted (US-0089)
│   │   │       ├── PublicarEntrenamientoModal.tsx  # Publish/manage-publication slide-over: live PublicTrainingCard preview + editable nombre/descripcion/precio/banner, "Despublicar" (US-0089)
│   │   │       └── reservas/              # Sub-feature slice (booking)
│   │   │           ├── ReservasPanel.tsx        # Two-step booking flow when training has an internal formulario (US-0087): ReservaFormModal → FormularioRespuestaModal; "Ver respuesta" row action opens FormularioRespuestaViewerModal; forwards perfilResumen/perfilFaltantes/refetchPerfil and isSelf (target athlete vs current user) to FormularioRespuestaModal, and perfil_campos_requeridos to the "Ver formulario" FormularioPreviewModal call (US-0095); handleOpenRespuestaViewer resolves perfil_snapshot into the viewer's perfilCampos via FORMULARIO_PERFIL_CAMPOS; handleExportFormularioRespuestas adds one Excel column per unique perfil_snapshot key (union across responses, catalog order) after the fixed identity columns (US-0096)
│   │   │           ├── ReservaFormModal.tsx     # Shows "Formulario adjunto" banner + signals parent (onRequireFormulario) instead of submitting directly when training has formulario_id (US-0087)
│   │   │           ├── ReservaStatusBadge.tsx
│   │   │           ├── AsistenciaStatusBadge.tsx  # Inline badge: Sin registrar / Asistió / No asistió
│   │   │           ├── AsistenciaFormModal.tsx    # Create/edit/delete attendance record (admin/coach only)
│   │   │           ├── FormularioRespuestaModal.tsx        # Fill-out step: editable inputs per campo_tipo (incl. imagen upload), "Guardar y reservar" + conditional "Reservar sin formulario" skip (US-0087); read-only profile summary strip / amber incomplete-profile warning (with "Actualizar perfil" + re-check) above the sections, submit disabled while any requested profile field is missing (US-0095)
│   │   │           ├── FormularioRespuestaViewerModal.tsx  # Read-only "Ver respuesta" viewer — labels + submitted values, signed-URL images (US-0087); optional "Datos de perfil" section above the answers, rendered from perfil_snapshot via the FORMULARIO_PERFIL_CAMPOS catalog (US-0096)
│   │   │           └── index.ts
│   │   │   └── planes-publicos/          # Feature slice (portal/planes-publicos — US-0093)
│   │   │       ├── VerPlanesButton.tsx     # "Ver planes" secondary action on every organization card; owns modal open state + focus restore
│   │   │       ├── PlanesPublicosModal.tsx # Public catalog dialog: search input (plans AND services), loading/empty/no-results/error states; reuses useSuscripcion + SuscripcionModal for the acquisition; optional initialSearch prop pre-fills/resets the search on every open (not just first mount) for callers that want a pre-filtered catalog (US-0101)
│   │   │       ├── PlanPublicoCard.tsx     # One public plan: modalidad, disciplines, benefits, "Adquirir"; subtypes live in a native <details> disclosure summarizing count + lowest price (precio COP + vigencia_dias + granted services, "ilimitado" when unidades is null), auto-expanded while a search term is active
│   │   │       └── index.ts
│   │   │   └── planes/                   # Feature slice (portal/planes)
│   │   │       ├── PlanesPage.tsx
│   │   │       ├── PlanesTable.tsx         # Props: onEdit, onDuplicate?, onDelete?, showVisibilidad?, renderRowAction? — showVisibilidad renders the admin-only Visibilidad column (Público/Privado); readOnly can't gate it because the athlete view also passes readOnly={false} (US-0093)
│   │   │       ├── PlanesHeaderFilters.tsx
│   │   │       ├── PlanFormModal.tsx        # mode: 'create' | 'edit' | 'duplicate'
│   │   │       ├── PlanTipoServiciosSection.tsx  # Services assignment rows inside plan tipo sub-form (US-0062)
│   │   │       ├── PlanesViewPage.tsx
│   │   │       ├── PlanesRolePage.tsx
│   │   │       ├── SuscripcionModal.tsx
│   │   │       └── index.ts
│   │   │   └── servicios/                # Feature slice (portal/servicios — US-0062)
│   │   │       ├── ServiciosPage.tsx      # Admin CRUD page for tenant services catalog
│   │   │       ├── ServiciosTable.tsx     # Table: nombre, descripcion, activo badge, edit/delete actions
│   │   │       ├── ServicioFormModal.tsx  # Right-side slide modal for create/edit service
│   │   │       └── index.ts
│   │   │   └── formularios/               # Feature slice (portal/formularios — US-0084/US-0085)
│   │   │       ├── FormulariosPage.tsx             # List page: create (redirects into editor) + delete + lazy preview
│   │   │       ├── FormulariosTable.tsx            # Table: nombre, descripcion, section count, activo badge; icon actions (Previsualizar/Editar/Eliminar)
│   │   │       ├── FormularioFormModal.tsx         # Right-side slide modal, create-only (nombre + descripcion)
│   │   │       ├── FormularioEditorPage.tsx        # Dedicated per-template editor: auto-saving header + section builder + vista previa; "Datos de perfil requeridos" checkbox grid (personal/deportivo) below the "Plantilla activa" toggle, auto-saved via updatePlantillaField (US-0095)
│   │   │       ├── FormularioSeccionesBuilder.tsx  # Ordered list of section cards + pinned "Añadir sección de formulario" button
│   │   │       ├── FormularioSeccionCard.tsx       # Collapsed (per-tipo render) / expanded (live type-driven edit form) section card; collapse = save
│   │   │       ├── FormularioSeccionContent.tsx    # Shared per-seccion_tipo renderer (título/subtítulo/texto/datos), used by card + preview
│   │   │       ├── FormularioCampoPreviewInput.tsx # Disabled input preview matching a "Datos" section's campo_tipo
│   │   │       ├── FormularioPreviewModal.tsx      # Read-only render of all secciones in order, no submit control; optional "Datos de perfil solicitados" chip list when perfil_campos_requeridos is non-empty (US-0095)
│   │   │       ├── FormularioTipoCampoBadge.tsx    # Badge mapping campo_tipo to label/icon
│   │   │       └── index.ts
│   │   │   └── gestion-equipo/            # Feature slice (portal/gestion-equipo)
│   │   │       ├── EquipoPage.tsx
│   │   │       ├── EquipoTable.tsx
│   │   │       ├── EquipoStatsCards.tsx
│   │   │       ├── EquipoHeaderFilters.tsx
│   │   │       ├── EquipoStatusBadge.tsx
│   │   │       ├── AsignarNivelModal.tsx        # Per-discipline level assignment for athletes
│   │   │       ├── EditarPerfilMiembroModal.tsx  # Slide-in modal: edit member profile + sports data
│   │   │       ├── EliminarMiembroModal.tsx      # Confirmation dialog: remove member from team
│   │   │       ├── BloquearMiembroModal.tsx      # Confirmation dialog: block member with optional motivo
│   │   │       ├── CambiarRolModal.tsx           # Confirmation dialog: change member role with self-demotion warning
│   │   │       └── ConfigurarSuspensionModal.tsx  # 2-step modal: assign/remove suspension rules to members in bulk
│   │   │   └── gestion-solicitudes/       # Feature slice (portal/gestion-equipo/gestion-solicitudes)
│   │   │       ├── SolicitudEstadoBadge.tsx
│   │   │       ├── SolicitudesTable.tsx
│   │   │       ├── AceptarSolicitudModal.tsx
│   │   │       └── SolicitudesTab.tsx
│   │   │   └── gestion-suscripciones/     # Feature slice (portal/gestion-suscripciones)
│   │   │       ├── GestionSuscripcionesPage.tsx  # Owns activeTab (Miembros/No miembros) state, tab bar with tabCounts badges, tab-aware empty state (US-0098)
│   │   │       ├── SuscripcionesTable.tsx        # Includes "Tipo" column rendering SuscripcionTipoBadge per row (US-0098)
│   │   │       ├── SuscripcionesStatsCards.tsx
│   │   │       ├── SuscripcionesHeaderFilters.tsx
│   │   │       ├── SuscripcionEstadoBadge.tsx
│   │   │       ├── PagoEstadoBadge.tsx
│   │   │       ├── ValidarPagoModal.tsx
│   │   │       ├── ValidarSuscripcionModal.tsx
│   │   │       ├── EditarSuscripcionModal.tsx    # Full-field edit modal for existing subscriptions
│   │   │       ├── EliminarSuscripcionModal.tsx  # Confirmation dialog for permanent deletion
│   │   │       ├── VerDetallePagoModal.tsx       # Read-only modal: full payment details + comprobante viewer (all payment statuses)
│   │   │       ├── VerServiciosModal.tsx          # Read-only modal: all service unit balances for a subscription (US-0067)
│   │   │       ├── CrearSuscripcionModal.tsx     # 3-step admin modal to create a subscription on behalf of an athlete
│   │   │       ├── SuscripcionTipoBadge.tsx      # "Miembro"/"No miembro" badge from es_miembro (US-0098)
│   │   │       └── index.ts
│   │   │   └── gestion-reservas/           # Feature slice (portal/gestion-reservas — US-0073)
│   │   │       ├── GestionReservasPage.tsx        # Main page: filters, table, banner, CSV export
│   │   │       ├── ReservasFiltersPanel.tsx        # Server-side filter panel: date range, athlete search, attendance, discipline
│   │   │       ├── ReservasManagementTable.tsx     # Data table with two-line athlete cell, badges, client-side pagination
│   │   │       ├── ReservaEstadoBadge.tsx          # Colored badge for reservation status
│   │   │       └── index.ts
│   │   │   └── perfil/                    # Feature slice (portal/perfil — user profile)
│   │   │       ├── PerfilPage.tsx
│   │   │       ├── PerfilHeader.tsx
│   │   │       ├── PerfilPersonalForm.tsx
│   │   │       ├── PerfilDeportivoForm.tsx
│   │   │       └── index.ts
│   │   │   └── mis-suscripciones/          # Feature slice (portal/mis-suscripciones — cross-tenant subscription & payment view, renamed from mis-suscripciones-y-pagos in US-0093)
│   │   │       ├── MisSuscripcionesYPagosPage.tsx  # List container with filters, empty states; props { suscripciones, userId } — tenant comes per row
│   │   │       ├── MisSuscripcionesFilters.tsx     # Chip filter bar (subscription status + payment status) + "Organización" select, shown only when the user holds subscriptions in more than one org
│   │   │       ├── SuscripcionCard.tsx              # Subscription card with organization name, plan info + SuscripcionEstadoBadge
│   │   │       ├── PagoCard.tsx                     # Payment info, comprobante viewer, upload trigger
│   │   │       └── index.ts
│   │   │   └── mis-reservas/               # Feature slice (portal/mis-reservas — cross-tenant athlete reservation history, US-0074, moved cross-tenant in US-0097)
│   │   │       ├── MisReservasPage.tsx             # Main page: filters, table, banner, CSV export (atleta_id-scoped, no tenant param)
│   │   │       ├── MisReservasFiltersPanel.tsx     # Server-side filter panel: date range, attendance, discipline (derived from loaded rows), Organización (shown only when >1 org)
│   │   │       ├── MisReservasTable.tsx            # Data table with Organización column, badges, client-side pagination
│   │   │       └── index.ts
│   │   │   └── entrenamientos-publicos/     # Feature slice (portal/entrenamientos-publicos — cross-tenant marketplace, US-0089)
│   │   │       ├── EntrenamientosPublicosPage.tsx  # Sticky floating header (title + subtitle + widget + "Filtrar" button) above a full-width grid, styled per grit-arena.pen node ql3Ij using the existing landing-* Tailwind tokens
│   │   │       ├── PublicTrainingFiltersDrawer.tsx  # Right-side drawer (opened via the header's "Filtrar" button): date chips, visual-only current-month calendar, "Organización" dropdown, search
│   │   │       ├── PublicTrainingCard.tsx           # Shared card (marketplace grid AND PublicarEntrenamientoModal's live preview), driven by PublicTrainingCardData; shows tenantNombre and a "Requiere: …" row from serviciosRequeridos (empty on the anonymous landing page — US-0094); "Ver" button over the banner (only when bannerUrl is set) opens PublicTrainingBannerModal fullscreen, local useState, no auth coupling (US-0100); "Vista previa" (internal formulario via useFormularioPreview + FormularioPreviewModal, or external link) and "Adquirir plan" (opens PlanesPublicosModal pre-searched to the first required service) actions, each gated on formularioId/formularioExterno/serviciosRequeridos so they're absent wherever that data isn't populated (US-0101)
│   │   │       ├── PublicTrainingBannerModal.tsx    # Fullscreen banner viewer: backdrop + Escape + close button, modeled on FormularioPreviewModal's overlay pattern (US-0100)
│   │   │       ├── PublicTrainingsGrid.tsx          # Responsive 1/2-col grid (never more than 2 cols — cards max out at half the column width); "Próximo" badge on the most-recently-published listing; empty state
│   │   │       ├── PublicTrainingReservaModal.tsx   # Thin wrapper reusing the EXISTING ReservaFormModal/FormularioRespuestaModal for a cross-tenant booking — no reservations list/export/asistencias; shows a checkingEligibility loading state, then any BookingRejectionCode rejection with a message-only dialog, with the "Ver planes de {org}" action (opening PlanesPublicosModal, pre-searched to bookingRejection.servicioNombre) shown only for SERVICIO_REQUERIDO/UNIDADES_AGOTADAS (US-0094, broadened US-0101); forwards perfilResumen/perfilFaltantes/refetchPerfil (isSelf always true — marketplace is always self-booking) to FormularioRespuestaModal (US-0095)
│   │   │       ├── SessionsAvailableWidget.tsx      # Compact one-line stat ("N entrenamientos disponibles esta semana"), placed under the header subtitle
│   │   │       └── index.ts
│   │   └── ui/
│   │       ├── MultilineText.tsx        # Renders a string with whitespace-pre-wrap (preserves line breaks), optional maxLength truncation, `as` tag prop (p/span/div) — US-0099
│   │       └── index.ts
│   │
│   ├── hooks/                            # Application core (use cases)
│   │   ├── auth/
│   │   ├── landing/
│   │   │   └── entrenamientos-publicos/
│   │   │       └── usePublicEntrenamientosLanding.ts  # Loads listPublicTrainingsForLanding(); exposes { items, loading, error, refetch } — no filters in v1 (US-0091)
│   │   └── portal/
│   │       ├── usePortalNavigation.ts    # Shared portal logic
│   │       ├── tenant/
│   │       │   ├── useTenantView.ts
│   │       │   ├── useMetodosPago.ts      # Full CRUD state for tenant_metodos_pago
│   │       │   ├── useReglasSuspension.ts  # CRUD state + 3-rule limit guard for tenant_reglas_suspension
│   │       │   └── useOrgLogoUpload.ts    # File select, MIME/size validation, preview URL, upload trigger for org logo
│   │       │   └── useOrgBannerUpload.ts   # File select, MIME/size validation, preview URL, upload trigger for org banner
│   │       └── scenarios/
│   │           └── useScenarios.ts
│   │       └── disciplines/
│   │           ├── useDisciplines.ts
│   │           └── useDisciplineForm.ts
│   │       └── nivel-disciplina/
│   │           └── useNivelesDisciplina.ts    # List + CRUD state for discipline levels
│   │       └── entrenamientos/
│   │           ├── useEntrenamientos.ts   # Also exposes detail-view state (viewTarget, isViewModalOpen, viewLoading, requestViewInstance, closeViewModal), buildPlantillaContenidoFromInstance for "Guardar como plantilla" from the detail view, formulariosPlantillas (active, tenant-scoped) fetched alongside other selects, and formularioForm state/setters (US-0086); fetches publishedEntrenamientoIds alongside the rest of loadAll's Promise.all (US-0089)
│   │           ├── useEntrenamientoForm.ts  # Includes restriction row state (add/remove/duplicate/update), timing fields, and a formularioForm slice (tipo ninguno/externo/interno, formulario_id, obligatorio) kept separate from TrainingWizardValues (US-0086)
│   │           ├── useEntrenamientoScope.ts
│   │           ├── useEntrenamientoCategorias.ts  # Fetch categories for a selected training instance
│               └── reservas/              # Sub-feature hooks (booking + attendance)
│               │   ├── useReservas.ts     # Loads reservas, capacidad, categorias; exposes refetchCategorias
│               │   ├── useReservaForm.ts  # Form state with entrenamiento_categoria_id, auto-select via getAtletaNivelId; exposes validateBase(); submitCreate() accepts an optional { formulario_plantilla_id, formulario_respuesta } payload (US-0087)
│               │   ├── useFormularioRespuestaForm.ts  # Loads attached plantilla's secciones, manages fill-out values/errors/per-field image upload, validate()/buildRespuesta() (US-0087); also fetches the target athlete's profile when perfil_campos_requeridos is non-empty, exposing perfilResumen/perfilFaltantes/perfilLoading/refetchPerfil — validate() fails while any requested field is missing (US-0095)
│               │   └── useAsistencias.ts  # Attendance map keyed by reserva_id; isEnabled guard skips fetch for atleta role
│   │       └── planes/
│   │           ├── usePlanes.ts            # Exposes openCreateModal, openEditModal, openDuplicateModal; includes tiposServiceRows + updateTipoServiceRows (US-0062)
│   │           ├── usePlanForm.ts          # Exposes setFormFromPlan, setFormForDuplicate; manages tiposServiceRows parallel array (US-0062)
│   │           ├── usePlanTipoServicios.ts # Manages service rows state for plan tipo service assignment (US-0062)
│   │           ├── usePlanesView.ts
│   │           └── useSuscripcion.ts
│   │       └── servicios/            # Feature hooks for services catalog (US-0062)
│   │           ├── useServicios.ts       # List + CRUD + modal coordination for servicios
│   │           └── useServicioForm.ts    # Controlled form state for ServicioFormModal
│   │       └── formularios/          # Feature hooks for form templates (US-0084/US-0085)
│   │           ├── useFormularios.ts            # List + create + delete for plantillas (list page)
│   │           ├── useFormularioForm.ts         # Controlled form state for FormularioFormModal (create-only: nombre + descripcion)
│   │           ├── useFormularioEditor.ts       # Loads plantilla + secciones; header auto-save; addSeccion/saveSeccion (create-or-update by persisted id)/deleteSeccion/reorderSecciones; computes campo_nombre via slugify + collision suffix
│   │           ├── useFormularioSeccionForm.ts  # Controlled state for one section card's edit mode; validation branches by seccion_tipo
│   │           └── useFormularioPlantillaName.ts # Fetches a plantilla's nombre by id (breadcrumb, mirrors useTenantName)
│   │       └── gestion-equipo/
│   │           ├── useEquipo.ts
│   │           ├── useConfigurarSuspension.ts     # 2-step modal state: rule selection + member multi-select + submit
│   │           └── useUsuarioNivelDisciplina.ts  # Fetch + upsert athlete discipline levels
│   │       └── gestion-solicitudes/
│   │           ├── useSolicitudesAdmin.ts    # Admin: load pending, accept/reject actions
│   │           └── useSolicitudRequest.ts   # User: submit request, track history/blocked state
│   │       └── gestion-reservas/
│   │           └── useGestionReservas.ts     # Filter state, loading, pagination, CSV export; delegates to reservasService.getReservasManagement (US-0073)
│   │       └── gestion-suscripciones/
│   │           ├── useGestionSuscripciones.ts    # Accepts activeTab (Miembros/No miembros); tab-filters rows before search/chip filters, tab-scoped stats, exposes tabCounts derived from the full unfiltered list (US-0098)
│   │           ├── useValidarPago.ts
│   │           ├── useValidarSuscripcion.ts
│   │           ├── useComprobanteViewer.ts    # Signed-URL generation for comprobante_path (TTL 300s)
│   │           ├── useEditarSuscripcion.ts   # Form state + plans fetch + date validation for full-field edit
│   │           ├── useEliminarSuscripcion.ts  # Confirmation + delete action for permanent deletion
│   │           └── useCrearSuscripcion.ts    # 3-step form state for admin-initiated subscription creation
│   │       └── perfil/
│   │           └── usePerfil.ts
│   │       └── planes-publicos/            # Feature hooks for the public plan catalog (US-0093)
│   │           └── usePlanesPublicos.ts    # Loads getPlanesPublicos + listDisciplinesByTenant on modal open (enabled flag); keeps active subtypes via getActiveTipos; accent/case-insensitive in-memory search across plan, subtype AND service names; optional initialSearch option seeds search's initial state (US-0101)
│   │       └── mis-suscripciones/
│   │           ├── useMisSuscripciones.ts      # Client-side filter state (subscription status + payment status + organization) with AND logic; derives tenantOptions from the loaded rows
│   │           └── useSubirComprobante.ts     # File validation (MIME, 5 MB), upload with upsert, comprobante_path update
│   │       └── mis-reservas/
│   │           └── useMisReservas.ts          # Filter state, loading, pagination, CSV export; delegates to reservasService.getMisReservas (US-0074); takes atletaId only (no tenantId), derives disciplines/tenantOptions from loaded rows, adds Organización filter (US-0097)
│   │       └── entrenamientos-publicos/       # Feature hooks for the public marketplace (US-0089)
│   │           ├── usePublicarEntrenamiento.ts        # Publish/manage-publication modal state: prefill, banner upload/validation (mirrors useOrgBannerUpload), submit (upsert), despublicar
│   │           ├── useEntrenamientosPublicosMarketplace.ts  # Fetches listPublicTrainings + listPublicTenantOptions; client-side dateChip/search/tenant filters; "this week" count independent of active filters
│   │           ├── usePublicTrainingReserva.ts        # Thin composition of the EXISTING useReservaForm/useFormularioRespuestaForm for a cross-tenant booking; fetches formulario_id/formulario_externo directly from the source entrenamientos row (never duplicated); openBooking() runs validateBookingRestrictions as an upfront pre-check (checkingEligibility state) before opening the form, fails open on unexpected errors — the RPC-level check at submit remains authoritative (US-0101)
│   │           └── useFormularioPreview.ts            # Read-only formulario preview for PublicTrainingCard's "Vista previa" action: wraps formulariosService.getPlantillaConSecciones, exposing open/loading/error/plantillaNombre/secciones/perfilCamposRequeridos + openPreview(formularioId)/closePreview() (US-0101)
│   │
│   ├── services/                         # Outbound adapters (API)
│   │   └── supabase/
│   │       ├── client.ts                 # Browser client
│   │       ├── server.ts                 # Server client
│   │       ├── middleware.ts             # Auth middleware helpers
│   │       ├── auth.ts
│   │       ├── portal/                   # Portal bounded-context services
│   │       │   ├── index.ts
│   │       │   ├── tenant.service.ts
│   │       │   └── scenarios.service.ts
│   │       │   └── disciplines.service.ts
│   │       │   └── entrenamientos.service.ts  # entrenamientos/entrenamientos_grupo select/insert/update all carry formulario_id, formulario_obligatorio, and a formulario_plantilla:formularios_plantillas(nombre) embed for display (US-0086)
│   │       │   └── entrenamientos-publicos.service.ts  # getPublishRestrictionSummary/hasBlockingMembershipRestrictions (pre-publish gate — US-0094 blocks only when NO restriction row is satisfiable without membership; service restrictions no longer block), getPublicacionByEntrenamientoId, listPublishedEntrenamientoIds, publicarEntrenamiento (upsert by entrenamiento_id, snapshots reserva/cancelacion_antelacion_horas from source for display), despublicarEntrenamiento (soft, activo=false), listPublicTrainings (cross-tenant, enriches via reservasService.getCapacidad, plus a single batched entrenamientos query for formulario_id/formulario_externo — never duplicated onto entrenamientos_publicos — US-0101), listPublicTenantOptions (US-0089); listPublicTrainingsForLanding queries the anon-readable entrenamientos_publicos_view (reservas_activas precomputed in the view, no per-row getCapacidad calls; formularioId/formularioExterno always null — formulario tables are authenticated-only) for the public /entrenamientos-publicos page (US-0091)
│   │       │   └── reservas.service.ts   # CRUD + getCategoriasConDisponibilidad, getAtletaNivelId, per-category capacity check, getReservasReport (CSV export), getReservasManagement (cross-training query with server-side filters on reservas_reporte_view — US-0073), getMisReservas (athlete-scoped query on reservas_reporte_view filtered by atleta_id — US-0074; tenant_id filter now optional/cross-tenant, US-0097), validateBookingRestrictions (service-set based, returns matchedRow; also populates BookingRejection.servicioNombre on SERVICIO_REQUERIDO — US-0101), validateCancellationRestriction, findServiceSubscriptionsToCharge; create() and cancel() include isEntrenamientoPast guard and delegate to SECURITY DEFINER RPCs book_and_deduct_service_units / cancel_and_restore_service_units for atomic service-unit deduction/restoration; reserva_servicios ledger tracks which subscription units were deducted per booking; create() also forwards p_formulario_plantilla_id/p_formulario_respuesta and maps FORMULARIO_CAMPOS_FALTANTES (US-0087); also maps PERFIL_INCOMPLETO (US-0095); create()'s UNIDADES_AGOTADAS branch also resolves and populates BookingRejection.servicioNombre via a single-row servicios lookup (US-0101)
│   │       │   └── asistencias.service.ts  # getByEntrenamiento (returns reserva_id-keyed map), upsert (onConflict: reserva_id), deleteById
│   │   │   └── planes.service.ts     # CRUD for planes + plan_tipos (getPlanTiposByPlan, createPlanTipo, updatePlanTipo, deletePlanTipo with soft-deactivate guard); getPlanTiposByPlan populates servicios[] per tipo (US-0062); planes rows carry es_publico on read/insert/update and getPlanesPublicos(tenantId) returns the public+active catalog readable by non-members (US-0093)
│   │   │   └── servicios.service.ts  # CRUD for servicios catalog + syncPlanTipoServicios (US-0062)
│   │   │   └── formularios.service.ts  # CRUD for formularios_plantillas + formulario_plantilla_esquema "secciones" (getPlantillaConSecciones, getSeccionesByPlantilla, createSeccion/updateSeccion — write seccion_tipo/seccion_descripcion and null out the other branch's campo_* columns —, deleteSeccion, reorderSecciones); US-0084/US-0085; getRespuestaById reads a submitted formulario_respuestas row, RLS-gated to owning athlete or tenant staff (US-0087); updatePlantilla accepts perfil_campos_requeridos (US-0095); getRespuestasByEntrenamiento select/mapping includes perfil_snapshot (US-0096)
│   │       │   └── suscripciones.service.ts  # createSuscripcion (calls populate_suscripcion_servicios RPC when plan_tipo_id is set — US-0063; maps a 42501 RLS rejection to SuscripcionServiceError 'plan_unavailable' — US-0093), hasPendingSuscripcion, getSuscripcionServicios (returns SuscripcionServicio[] for a given suscripcion_id)
│   │       │   └── pagos.service.ts
│   │       │   └── equipo.service.ts
│   │       │   └── solicitudes.service.ts      # CRUD for miembros_tenant_solicitudes (access requests)
│   │       │   └── nivel-disciplina.service.ts         # CRUD for nivel_disciplina table
│   │       │   └── usuario-nivel-disciplina.service.ts # Upsert for usuario_nivel_disciplina
│   │       │   └── entrenamiento-categorias.service.ts # Create/sync/delete for entrenamiento_categorias
│   │       │   └── gestion-suscripciones.service.ts  # Joins plan_tipos for plan_tipo_nombre / plan_tipo_vigencia_dias; crearSuscripcionAdmin calls populate_suscripcion_servicios RPC when plan_tipo_id is set (US-0063); throws GestionSuscripcionesServiceError 'populate_servicios_failed' on RPC failure; fetchSuscripcionesAdmin also queries miembros_tenant.usuario_id for the tenant (parallel query) and sets es_miembro per row — no FK/embed exists between suscripciones and miembros_tenant (US-0098)
│   │       │   └── perfil.service.ts
│   │       │   └── metodos-pago.service.ts          # CRUD for tenant_metodos_pago
│   │       │   └── reglas-suspension.service.ts      # CRUD for tenant_reglas_suspension
│   │       │   └── inicio.service.ts      # Server-side cross-tenant dashboard queries
│   │       │   └── storage.service.ts     # uploadOrgLogo, uploadOrgBanner, uploadPaymentProof (upsert option; receipts are writable by an active member OR any subscription holder of the tenant, so non-member buyers of public plans can submit proof — US-0093), getSignedUrl — wraps Supabase Storage API for org-assets bucket; uploadFormularioRespuestaImage uploads a "imagen"-type form-response file under the booking athlete's own users/{atletaId}/formularios/ path (US-0087); uploadEntrenamientoPublicoBanner uploads to orgs/{tenantId}/entrenamientos-publicos/{entrenamientoId}.{ext}, readable by any authenticated user via the public_training_banner_read storage policy (US-0089)
│   │       │   └── mis-suscripciones.service.ts  # fetchMisSuscripciones — the user's subscriptions across ALL tenants with tenant + plan + pago + suscripcion_servicios joins, scoped by atleta_id only (RLS enforces ownership); replaces the tenant-scoped fetch (US-0093)
│   │       └── portal.ts                 # Transitional/legacy entrypoint
│   │
│   ├── types/                            # Domain & contracts
│   │   ├── auth.types.ts
│   │   ├── portal.types.ts               # Shared portal contracts (INICIO_MENU_ITEM, PUBLIC_TRAININGS_MENU_ITEM, resolvePortalMenu, etc.) — PUBLIC_TRAININGS_MENU_ITEM appended only to the !tenantId branch (US-0089)
│   │   └── portal/
│   │       ├── tenant.types.ts            # TenantIdentityPayload (bannerUrl), TenantEditFormValues (banner_url), TenantEditPayload (banner_url)
│   │       └── scenarios.types.ts
│   │       └── disciplines.types.ts
│   │       └── entrenamientos.types.ts   # TrainingFormularioTipo (ninguno/externo/interno), TrainingFormularioFormState, TrainingGroup/TrainingInstance carry formulario_id/formulario_obligatorio/formulario_plantilla (US-0086)
│   │       └── entrenamientos-publicos.types.ts  # EntrenamientoPublico, PublicarEntrenamientoInput, PublicTrainingListItem (adds formularioId/formularioExterno, batched from the source entrenamientos row — US-0101), PublicTrainingFilters (dateChip/search/tenantId), EntrenamientoPublicoServiceError (codes incl. 'servicio_restriction') (US-0089)
│   │       └── reservas.types.ts         # ReservaView, CreateReservaInput, CategoriaDisponibilidad, ReservaReportRow (flat view type for CSV export, includes atleta_id), ReservasManagementFilters (server-side filter input — US-0073), MisReservasFilters (athlete-scoped filter input — US-0074; tenantId optional/cross-tenant, US-0097), ReservaReportRow.tenant_nombre (US-0097); Reserva.formulario_respuesta_id, CreateReservaInput.formulario_plantilla_id/formulario_respuesta (US-0087)
│   │       └── asistencias.types.ts      # Asistencia, AsistenciaFormValues, UpsertAsistenciaInput
│   │       └── planes.types.ts           # PlanModalidad (renamed from PlanTipo union), PlanTipo (DB entity), PlanTipoFormValues, CreatePlanTipoInput, UpdatePlanTipoInput; PlanTipo.servicios? added (US-0062); Plan.es_publico, CreatePlanInput/UpdatePlanInput.esPublico, PlanFormValues.es_publico (US-0093)
│   │       └── planes-publicos.types.ts   # PlanPublicoItem (extends PlanWithDisciplinas with beneficiosList/disciplinaNames/tipos), PlanPublicoTipoItem, PlanPublicoServicioItem, UsePlanesPublicosResult (US-0093)
│   │       └── servicios.types.ts        # Servicio, CreateServicioInput, UpdateServicioInput, ServicioFormValues, ServicioServiceError, PlanTipoServicio, PlanTipoServicioRow, SyncPlanTipoServiciosInput (US-0062)
│   │       └── formularios.types.ts      # FormularioPlantilla, FormularioSeccion (seccion_tipo: titulo|subtitulo|texto|datos + seccion_descripcion; campo_* nullable), FormularioTipoCampo union, FormularioPlantillaConSecciones, FormularioPlantillaListItem (seccionesCount), Create/UpdateSeccionInput, form-values types, FormularioServiceError (US-0084/US-0085); FormularioRespuesta (id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta jsonb — US-0087); FormularioPerfilCampo union + FORMULARIO_PERFIL_CAMPOS catalog (9 usuarios/perfil_deportivo fields), FormularioPlantilla.perfil_campos_requeridos, UpdatePlantillaInput.perfil_campos_requeridos (US-0095); FormularioRespuesta.perfil_snapshot — requested profile values frozen at submission time, survives later profile edits (US-0096)
│   │       └── suscripciones.types.ts  # Suscripcion, SuscripcionInsert, SuscripcionServicio (id, suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes, created_at — US-0063), SuscripcionServiceError with code 'plan_unavailable' (US-0093)
│   │       └── pagos.types.ts
│   │       └── metodos-pago.types.ts      # MetodoPago, CreateMetodoPagoInput, UpdateMetodoPagoInput
│   │       └── reglas-suspension.types.ts # ReglaSuspension, ReglaSuspensionCreatePayload, ReglaSuspensionUpdatePayload, ReglaSuspensionFormValues
│   │       └── equipo.types.ts
│   │       └── solicitudes.types.ts            # SolicitudRow, CreateSolicitudInput, SolicitudesServiceError
│   │       └── nivel-disciplina.types.ts      # NivelDisciplina, form values, service error types
│   │       └── entrenamiento-categorias.types.ts # EntrenamientoCategoria, input, view models
│   │       └── entrenamiento-restricciones.types.ts # EntrenamientoRestriccion (with servicio_1_id…servicio_4_id, descripcion; plan_id/disciplina_id kept @deprecated), restriction inputs, BookingRejectionCode (SERVICIO_REQUERIDO, UNIDADES_AGOTADAS, PERFIL_INCOMPLETO — US-0095), BookingResult; BookingRejection.servicioNombre (optional, SERVICIO_REQUERIDO/UNIDADES_AGOTADAS only) feeds the pre-filtered plan catalog (US-0101)
│   │       └── gestion-suscripciones.types.ts  # SuscripcionAdminRow includes plan_tipo_id, plan_tipo_nombre, plan_tipo_vigencia_dias; SuscripcionAdminRow.es_miembro (computed from miembros_tenant existence, not stored) and SuscripcionTab ('miembros' | 'no_miembros') (US-0098)
│   │       └── mis-suscripciones.types.ts  # MiSuscripcionRow (incl. tenant_id + tenant_nombre — US-0093), MiPagoRow — user-facing subscription + payment view types
│   │       └── perfil.types.ts
│   │       └── inicio.types.ts            # Dashboard view model interfaces
│   │
│   └── lib/                              # Pure utilities
│       ├── utils.ts
       ├── constants.ts                      # PUBLIC_TENANT_ID: well-known UUID for the system-level public tenant (used by resolveVisiblePara in entrenamientos.service.ts)
│       ├── csv.ts                           # RFC 4180 CSV generation (toCsvString, downloadTextFile) — used by ReservasPanel CSV export
│       ├── slugify.ts                        # slugify(value): snake_case key (diacritics stripped, leading digits trimmed) — used to auto-compute campo_nombre for "Datos" sections (US-0085)
│       ├── validators.ts
│       └── portal/
│           ├── tenant-access.cache.ts       # React cache()-wrapped getCachedTenantAccess — deduplicates canUserAccessTenant DB call across nested tenant layouts
│           └── bogota-date.ts               # bogotaDayStartIso/bogotaDayEndIso — converts a "YYYY-MM-DD" Bogotá calendar day into -05:00-offset ISO boundaries for timestamptz range queries (US-0075)
│
├── public/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── openspec/                    # OpenSpec configuration
│   ├── config.yaml
│   ├── custom-specs/
│   │   ├── project-init.md      # Initialization guide
│   │   ├── project-structure.md # This file
│   │   ├── supabase-setup.md    # Supabase configuration
│   │   └── tech-spec.md         # Technology specifications
│   └── specs/
│
├── proxy.ts                     # Next.js proxy (required for Supabase)
├── .env.local                   # Environment variables (not committed)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.mjs            # ESLint configuration
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── package.json                 # Dependencies
```

## Hexagonal Architecture Layers

### Layer Overview

| Layer | Directory | Responsibility | Hexagonal Role | Example |
|-------|-----------|---------------|----------------|---------|
| **Delivery** | `app/` | HTTP routing & request handling | Inbound adapters | Pages, API routes |
| **Presentation** | `components/` | UI rendering & user interaction | Inbound adapters | React components |
| **Application** | `hooks/` | Business logic & use cases | Application core | Custom hooks |
| **Infrastructure** | `services/` | External API & database access | Outbound adapters | Supabase clients |
| **Domain** | `types/` | Data contracts & interfaces | Ports | TypeScript types |
| **Utilities** | `lib/` | Pure helper functions | Support | Utils, constants |

## Feature Slice Convention (Current Standard)

For all new portal features, use this structure consistently:

```text
app/portal/orgs/[tenant_id]/(role)/<route>/page.tsx # Tenant-scoped route entrypoint
components/portal/<feature-name>/*              # UI/presentation
hooks/portal/<feature-name>/*                   # Use-case orchestration
services/supabase/portal/<feature-name>.service.ts # Data access
types/portal/<feature-name>.types.ts            # Contracts and view models
```

Rules:
- Keep shell/shared portal components outside feature folders (`PortalHeader`, `PortalNavMenu`, etc.).
- Never call Supabase directly from page/components.
- Feature folder names use kebab-case (e.g., `organization-view`, `training-management`).

### Data Flow

```
User Action
    ↓
Component (presentation)
    ↓
Hook (business logic)
    ↓
Service (data access)
    ↓
Supabase (database)
```

## Database Functions & Scheduled Jobs

### PL/pgSQL SECURITY DEFINER Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `book_and_deduct_service_units(...)` | Atomic booking + multi-service unit deduction via JSONB deductions array; optionally validates required "datos" fields and inserts a linked `formulario_respuestas` row atomically when `p_formulario_plantilla_id`/`p_formulario_respuesta` are provided (US-0087); also validates the attached template's `perfil_campos_requeridos` against `p_atleta_id`'s `usuarios`/`perfil_deportivo` profile before any write, raising `PERFIL_INCOMPLETO` when a requested field is missing (US-0095); freezes the validated profile values into `formulario_respuestas.perfil_snapshot` at insert time, so later profile edits don't retroactively change a historical response (US-0096) | Called via RPC from `reservas.service.ts` |
| `cancel_and_restore_service_units(...)` | Atomic cancellation + service unit restoration from `reserva_servicios` ledger | Called via RPC from `reservas.service.ts` |
| `check_entrenamiento_publico_restricciones_membresia()` | Blocks publishing only when a training HAS restriction rows and NONE is free of membership-only conditions (`usuario_estado` / `validar_nivel_disciplina`) — rows are OR-ed at booking time, so a single service-only row keeps it publishable. Replaces the US-0089 service-restriction rule (US-0094) | `before insert or update` trigger on `entrenamientos_publicos` |
| `populate_suscripcion_servicios(p_suscripcion_id, p_plan_tipo_id)` | Inserts `suscripcion_servicios` rows from `plan_tipos_servicios` at subscription creation time; idempotent via `ON CONFLICT DO NOTHING` (US-0063) | Called via RPC from `suscripciones.service.ts` and `gestion-suscripciones.service.ts` |
| `get_member_tenants_for_authenticated_user()` | Tenant ids where the caller holds any `miembros_tenant` row, any role/state (US-0093) | RLS policy expressions |
| `can_read_plan(p_plan_id)` | Plan is public AND active, OR caller is a member of its tenant, OR caller already holds a subscription to it — the last branch keeps a buyer's own rows readable after an un-publish (US-0093) | SELECT policies on `planes`, `plan_tipos`, `planes_disciplina` |
| `can_read_plan_tipo(p_plan_tipo_id)` | Delegates to `can_read_plan` through the subtype's parent plan (US-0093) | SELECT policy on `plan_tipos_servicios` |
| `can_read_servicio(p_servicio_id)` | Caller is a member of the service's tenant, OR the service is granted by a public active plan's subtype, OR the caller already holds units of it (US-0093) | SELECT policy on `servicios` |
| `can_subscribe_to_plan(p_plan_id, p_tenant_id)` | Plan is `activo` and either public or owned by a tenant the caller belongs to (US-0093) | `suscripciones_insert_own` WITH CHECK |
| `evaluar_suspensiones_cron()` | Evaluates active members against assigned suspension rules; suspends those exceeding absence thresholds, logs `miembros_tenant_novedades` (tipo `inasistencias_acumuladas`), and marks processed absences (`validacion_suspension = true`) | pg_cron daily schedule |
| `reactivar_suspensiones_expiradas()` | Reactivates members whose temporary suspension (`duracion > 0`) has elapsed; logs novedad (tipo `reactivacion`) | pg_cron daily schedule |

### pg_cron Scheduled Jobs

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `evaluar-suspensiones-diarias` | `0 6 * * *` (06:00 UTC / 01:00 AM COT) | Runs `reactivar_suspensiones_expiradas()` first, then `evaluar_suspensiones_cron()` |

## File Naming Conventions

### Components
```
PascalCase.tsx
Examples:
  - Button.tsx
  - EventList.tsx
  - UserProfile.tsx
```

### Hooks
```
useCamelCase.ts
Examples:
  - useAuth.ts
  - useEvents.ts
  - useEventForm.ts
```

### Services
```
camelCaseService.ts
Examples:
  - authService.ts
  - eventsService.ts
  - uploadService.ts
```

### Types
```
camelCase.types.ts or PascalCase (for interfaces)
Examples:
  - database.types.ts
  - events.types.ts
  - interface User {}
  - type Event = {}
```

### Constants
```
UPPER_SNAKE_CASE in constants.ts
Examples:
  - API_BASE_URL
  - MAX_FILE_SIZE
  - DEFAULT_PAGE_SIZE
```

## Architecture Rules

### Hard Rules (MUST follow)

1. **No Direct Database Calls from Components**
   - ❌ Components/pages calling Supabase directly
   - ✅ Components → Hooks → Services → Supabase

2. **Separation of Concerns**
   - `components/`: Only UI rendering, no business logic
   - `hooks/`: Business logic, orchestration
   - `services/`: External API calls only

3. **TypeScript Mandatory**
   - All new code must be TypeScript
   - No `any` types (use `unknown` if necessary)
   - Proper type definitions for all functions

4. **Server vs Client Components**
   - Use Server Components by default
   - Only add `'use client'` when necessary
   - See [Supabase Setup](supabase-setup.md) for client usage

### Best Practices

1. **Co-location by feature slice**
  - Keep each feature grouped across layers using the same feature name.
  - Example: `components/portal/scenarios/`, `hooks/portal/scenarios/`, `services/supabase/portal/scenarios.service.ts`, `types/portal/scenarios.types.ts`

2. **Single Responsibility**
   - One component = one responsibility
   - One hook = one use case
   - One service = one data source

3. **Composition Over Inheritance**
   - Use functional components only
   - Prefer composition and custom hooks

4. **Error Handling**
   - Always handle errors in services
   - Show user-friendly messages in components
   - Use error boundaries in App Router

## Example Implementation

### Feature: Portal Tenant + Scenarios + Disciplines

```
src/
├── app/portal/orgs/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx
├── components/portal/tenant/
│   ├── TenantIdentityCard.tsx
│   └── TenantContactCard.tsx
├── components/portal/scenarios/
│   ├── ScenariosPage.tsx
│   ├── ScenarioCard.tsx
│   └── ScenarioFormModal.tsx
├── components/portal/disciplines/
│   ├── DisciplinesPage.tsx
│   ├── DisciplinesTable.tsx
│   └── DisciplineFormModal.tsx
├── hooks/portal/tenant/
│   └── useTenantView.ts
├── hooks/portal/scenarios/
│   └── useScenarios.ts
├── hooks/portal/disciplines/
│   ├── useDisciplines.ts
│   └── useDisciplineForm.ts
├── hooks/portal/gestion-solicitudes/
│   ├── useSolicitudRequest.ts        # submit, track hasPending/isBlocked/isProfileIncomplete state
│   ├── useSolicitudesAdmin.ts
│   └── useBloqueados.ts
├── services/supabase/portal/
│   ├── tenant.service.ts
│   └── scenarios.service.ts
│   └── disciplines.service.ts
│   └── solicitudes.service.ts
└── types/portal/
  ├── tenant.types.ts
  └── scenarios.types.ts
  └── disciplines.types.ts
  └── solicitudes.types.ts
```

### Code Flow Example

```typescript
// 1. Component (presentation)
// components/portal/organization-view/OrganizationInfoCards.tsx
'use client'

import { useOrganizationView } from '@/hooks/portal/organization-view/useOrganizationView'
import { OrganizationIdentityCard } from './OrganizationIdentityCard'
import { OrganizationContactCard } from './OrganizationContactCard'

export function OrganizationInfoCards() {
  const { data, loading, error } = useOrganizationView()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>Empty state</div>
  
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <OrganizationIdentityCard identity={data.identity} context={data.context} />
      <div className="lg:col-span-2">
        <OrganizationContactCard contact={data.contact} social={data.social} />
      </div>
    </div>
  )
}

// 2. Hook (business logic)
// hooks/portal/organization-view/useOrganizationView.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'
import { organizationViewService } from '@/services/supabase/portal/organization-view.service'
import { OrganizationViewData } from '@/types/portal/organization-view.types'

export function useOrganizationView() {
  const [data, setData] = useState<OrganizationViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error('No active session')
        const payload = await organizationViewService.fetchOrganizationViewData(supabase, auth.user.id)
        setData(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  return { data, loading, error }
}

// 3. Service (data access)
// services/supabase/portal/organization-view.service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { OrganizationViewData } from '@/types/portal/organization-view.types'

export const organizationViewService = {
  async fetchOrganizationViewData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<OrganizationViewData> {
    // Query tenant + coach + location and map to view model
    return {} as OrganizationViewData
  }
}

// 4. Types (contracts)
// types/portal/organization-view.types.ts
export type OrganizationViewData = {
  identity: {
    name: string
    description: string | null
    foundedAt: string | null
  }
  context: {
    headCoachName: string | null
    location: string | null
  }
  contact: {
    email: string | null
    phone: string | null
    websiteUrl: string | null
  }
  social: {
    instagramUrl: string | null
    facebookUrl: string | null
    xUrl: string | null
  }
}
```

## Environment Variables

Required variables in `.env.local`:

```env
# Supabase Configuration (see supabase-setup.md)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics, monitoring, etc.
NEXT_PUBLIC_GA_ID=your-ga-id
```

## Testing Strategy (Future)

```
src/
├── components/
│   └── __tests__/
│       └── EventList.test.tsx
├── hooks/
│   └── __tests__/
│       └── useEvents.test.ts
└── services/
    └── __tests__/
        └── eventsService.test.ts
```

## Related Documentation

- [Project Initialization](project-init.md) - Setup instructions
- [Supabase Setup](supabase-setup.md) - Complete Supabase configuration
- [Tech Spec](tech-spec.md) - Technology stack details

## Code Style Rules

### Language
- All code, comments, and documentation must be in **English**
- User-facing messages can be localized

### General
- Use functional components only (no class components)
- Prefer `const` over `let`, never use `var`
- Use arrow functions for callbacks
- Always add semicolons

### Imports
```typescript
// 1. External libraries
import { useState } from 'react'

// 2. Internal absolute imports
import { Button } from '@/components/common/Button'

// 3. Relative imports
import { EventCard } from './EventCard'

// 4. Types (at the end)
import type { Event } from '@/types/events.types'
```

### Component Structure
```typescript
'use client' // if needed

// Imports
import { useState } from 'react'
import type { Props } from './types'

// Types/Interfaces
interface ComponentProps {
  // ...
}

// Component
export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState()

  // Handlers
  const handleClick = () => {
    // ...
  }

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## Common Patterns

### Loading States
```typescript
if (loading) return <Loading />
if (error) return <ErrorMessage error={error} />
if (!data) return <EmptyState />

return <DataDisplay data={data} />
```

### Error Handling
```typescript
try {
  const result = await service.someOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw error instanceof Error ? error : new Error('Unknown error')
}
```

### Async Operations
```typescript
// In hooks
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const doSomething = async () => {
  setLoading(true)
  setError(null)
  try {
    await service.operation()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error occurred')
  } finally {
    setLoading(false)
  }
}
```

## Quick Reference for new feature

| Task | Location | Example |
|------|----------|---------|
| Add route entry | `src/app/portal/(role)/{route}/page.tsx` | `src/app/portal/(administrador)/gestion-organizacion/page.tsx` |
| Add UI component | `src/components/portal/{feature-name}/` | `src/components/portal/organization-view/OrganizationIdentityCard.tsx` |
| Add business logic | `src/hooks/portal/{feature-name}/` | `src/hooks/portal/organization-view/useOrganizationView.ts` |
| Add data access | `src/services/supabase/portal/{feature-name}.service.ts` | `src/services/supabase/portal/organization-view.service.ts` |
| Add contracts | `src/types/portal/{feature-name}.types.ts` | `src/types/portal/organization-view.types.ts` |

---

**Note**: This structure follows hexagonal architecture principles to maintain clean separation of concerns and testability. 