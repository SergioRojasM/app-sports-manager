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
│   │   ├── globals.css                   # Global styles & Tailwind imports; `--grit-*` design tokens (1:1 with grit-arena-v2.pen variables) + `.grit-shell` background (US-0116)
│   │   ├── api/                          # Privileged route handlers (server-only; the ONLY place the service-role client is used) (US-0114)
│   │   │   └── portal/orgs/[tenant_id]/
│   │   │       ├── invitaciones/route.ts                              # POST: crear_invitacion_tenant (user session) → auth.admin.inviteUserByEmail; identical 202 whether or not the email already has an account (in-app delivery)
│   │   │       ├── invitaciones/[invitacion_id]/reenviar/route.ts     # POST: reenviar_invitacion_tenant → re-send, same 202 contract
│   │   │       └── miembros/aprovisionar/route.ts                     # POST: reservar_alta_administrada → auth.admin.createUser (server-generated password, email_confirm) → completar_alta_administrada; compensates with deleteUser; returns the password once (Cache-Control: no-store)
│   │   │   └── internal/notificaciones/despachar/route.ts            # POST (US-0125): notifications dispatcher, no user session — `Authorization: Bearer NOTIFICACIONES_DISPATCH_SECRET` (timingSafeEqual; 503 unset, 401 wrong, 405 other verbs), runtime nodejs, maxDuration 60 → despacharNotificaciones(); called by the database through pg_net (outbox insert trigger + pg_cron every minute)
│   │   ├── auth/                         # Authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── callback/
│   │   │   ├── confirm/route.ts          # Invite email landing (US-0114): verifyOtp(token_hash, type=invite) → cookie session → relative redirect to /auth/update-password?next=<same-origin path from redirect_to>
│   │   │   └── update-password/page.tsx  # Honors a validated `next` (US-0114); portal targets continue via /portal/bootstrap
│   │   ├── eventos/page.tsx              # Public, unauthenticated event discovery (EventosLandingPage in Suspense) — outside protectedPaths (US-0120)
│   │   ├── eventos/[event_id]/page.tsx   # Public event page (EventoDetalleLandingPage in Suspense; reads `from` / `entradas`) — only `publico` events resolve here (US-0120)
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
│   │       ├── invitaciones/[invitacion_id]/page.tsx  # Recipient: review and accept a tenant invitation (US-0114)
│   │       ├── activar-cuenta/[tenant_id]/page.tsx    # Provisioned member: replace the temporary password and activate the pending membership (US-0114)
│   │       ├── completar-perfil/[tenant_id]/page.tsx  # Member of a tenant that requires a complete profile: fill in the missing fields before entering; redirects away when not a member, pending activation, or nothing to complete (US-0136)
│   │       ├── (atleta)/                 # Portal-level athlete area (US-0093) — no role gate: roles are per-tenant and public-plan buyers hold no membership; pages are self-scoped by atleta_id = auth.uid()
│   │       │   ├── layout.tsx            # Pass-through; auth is enforced by the parent portal shell
│   │       │   ├── mis-suscripciones/page.tsx  # Cross-tenant "Mis Suscripciones" (replaces the tenant-scoped route)
│   │       │   ├── mis-reservas/page.tsx       # Cross-tenant "Mis Reservas" (replaces the tenant-scoped route, US-0097)
│   │       │   └── mis-entradas/page.tsx       # Cross-tenant "Mis Entradas": event tickets, payment status, PDF; links guest purchases made with the verified account email (US-0121)
│   │       ├── eventos/page.tsx          # Portal event discovery (EventosPublicosPage in Suspense): public events of every tenant + private events of the user's tenants (US-0120)
│   │       ├── eventos/[event_id]/page.tsx  # Portal event page (EventoDetallePortalPage in Suspense) (US-0120)
│   │       ├── notificaciones/page.tsx   # In-app notifications history of the signed-in user (NotificacionesPage), any authenticated portal user (US-0125)
│   │       └── orgs/
│   │           ├── page.tsx              # Organizations discovery (all authenticated users): public organizations (`tenants.publico`) + the user's own; private ones are hidden from non-members (US-0133)
│   │           └── [tenant_id]/
│   │               ├── layout.tsx        # Membership + role gate for tenant entry; a `pendiente_activacion` membership redirects to /portal/activar-cuenta/[tenant_id] (US-0114); a member with an incomplete profile in a tenant with `requiere_perfil_completo` redirects to /portal/completar-perfil/[tenant_id], all roles (US-0136)
│   │               ├── page.tsx          # Redirect to tenant role landing
│   │               ├── (administrador)/
│   │               │   ├── layout.tsx        # Role guard: redirects non-administrador users to /portal/orgs/[tenant_id]
│   │               │   ├── gestion-disciplinas/page.tsx
│   │               │   ├── gestion-equipo/page.tsx
│   │               │   ├── gestion-escenarios/page.tsx
│   │               │   ├── gestion-formularios/page.tsx  # Admin: form templates list (US-0084/US-0085)
│   │               │   ├── gestion-formularios/[formulario]/page.tsx  # Admin: Google-Forms-style section builder for one template (US-0085); visual Hero header + checkbox/seleccion fields/two-column layout/seccion cards/separadores + manual "Guardar cambios" save (US-0108)
│   │               │   ├── gestion-eventos/page.tsx     # Admin: team events management — cards/list/calendar views, delete + confirmado⇄cancelado status; wraps GestionEventosPage in Suspense (it reads ?vista=) (US-0118); shows the ?guardado= success banner after a wizard publish (US-0119)
│   │               │   ├── gestion-eventos/nuevo/page.tsx               # Admin: create-event wizard (EventoWizardPage without eventoId) in Suspense — it reads ?paso= (US-0119); `?duplicar={eventoId}` (UUID only) pre-fills it with an unsaved copy of that event (US-0122); `?desdeEntrenamiento={entrenamientoId}` (UUID only, ignored when `duplicar` is set) pre-fills it from a future training (US-0132)
│   │               │   ├── gestion-eventos/[evento_id]/editar/page.tsx  # Admin: edit-event wizard (EventoWizardPage keyed by eventoId); also where a new event lands after its first "Guardar borrador" (US-0119)
│   │               │   ├── gestion-eventos/[evento_id]/compras/page.tsx # Admin: purchases of one event — validate / reject payments (EventoComprasPage, US-0121)
│   │               │   ├── gestion-organizacion/page.tsx
│   │               │   ├── gestion-servicios/page.tsx   # Admin: services catalog CRUD (US-0062)
│   │               │   └── gestion-suscripciones/page.tsx
│   │               │   └── analitica/page.tsx           # Admin-only BI dashboard: Resumen, Ingresos, Operación y Equipo (US-0115)
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
│   │                   ├── control-ingreso/page.tsx              # "Eventos Check-in" (US-0131): requireCheckinStaff (admin | trainer, else → /portal/orgs/{tenantId}) + ControlIngresoEventosPage
│   │                   ├── control-ingreso/[evento_id]/page.tsx  # Door check-in of one event (US-0131): same guard + isUuid (else → /control-ingreso); ControlIngresoPage keyed by eventoId
│   │                   ├── gestion-entrenamientos/page.tsx
│   │                   ├── gestion-planes/page.tsx
│   │                   └── gestion-reservas/page.tsx        # Shared: cross-training reservations management with server-side filtering (US-0073)
│   │
│   ├── components/                       # Presentation layer
│   │   ├── auth/
│   │   ├── landing/
│   │   │   └── eventos/                  # Feature slice (landing/eventos — anonymous event discovery, US-0120)
│   │   │       ├── EventosLandingPage.tsx       # Landing shell + EventosPublicosGrid (no filters); "Obtener entrada" via useObtenerEntrada('landing-listado') + ObtenerEntradaModal
│   │   │       ├── EventoDetalleLandingPage.tsx # Landing Header/Footer shell; useEventoDetalle(id, {soloPublicos: true}); `from` origin (same-origin only, else /eventos); breadcrumb + EventoDetalleStates or EventoDetalleBody; ObtenerEntradaModal + EventoEntradasModal ('invitado')
│   │   │       ├── EventoDetalleBreadcrumb.tsx  # ⌂ Inicio › Eventos › {nombre} + right-aligned "Volver"
│   │   │       └── index.ts
│   │   ├── portal/
│   │   │   ├── PortalHeader.tsx          # Shared portal shell components — v2 Navbar styling (grit-arena-v2 oUFl9); no breadcrumb inside (US-0116) — the bell is `NotificacionesBell` (US-0125)
│   │   │   ├── PortalBreadcrumb.tsx      # Standalone row rendered by portal/layout.tsx at the top of <main> (design AOIa5), visible + wrapping on mobile; SLUG_LABELS map (US-0116); /portal/eventos/{uuid} renders "Evento" (US-0120) — labels `mis-entradas` → "Mis entradas", `compras` → "Compras" (US-0121) — `control-ingreso` → "Control de ingreso", and the event UUID under it → "Evento" (US-0131) — `notificaciones` → "Notificaciones" (US-0125)
│   │   │   ├── PortalNavMenu.tsx         # Glass dropdown; active item = cyan gradient + glass-border ("Nav Operación" style)
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
│   │   │   │   ├── TenantDirectoryList.tsx       # Renders TenantDirectoryCard per organization: "Ingresar" link (members) or SolicitarAccesoButton + VerPlanesButton (US-0133)
│   │   │   │   ├── TenantDirectoryCard.tsx       # Directory-only card adapted from EventoPublicoCard: banner/placeholder, logo circle, "Miembro" chip + cyan border for members, "Privada" chip when !isPublic, "Desde {mes} de {año}", stacked primary/secondary actions (US-0133); TenantIdentityCard stays for gestion-organizacion
│   │   │   │   ├── TenantPaymentMethodsCard.tsx  # Admin card: CRUD list of tenant payment methods; "QR" indicator on methods with qr_url (US-0128)
│   │   │   │   ├── MetodoPagoFormModal.tsx        # Right-side form modal for create/edit payment method; optional "Imagen QR" field (JPEG/PNG/WebP ≤ 2 MB, preview, Cambiar/Quitar) — uploaded on save through onSubmit(data, qr) (US-0128); `variant="evento"` hides "Activo" and retitles the form for methods that only exist in an event snapshot (US-0130)
│   │   │   │   ├── MetodoPagoQrImage.tsx          # Payer-facing QR image of a payment method: white background, opens in a new tab, hidden on load error; used by SuscripcionModal and EventoMetodoPagoCard (US-0128)
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
│   │   │       ├── EntrenamientosPage.tsx  # Trainings management shell: list + calendar, action/detail/form modals, ReservasPanel. No publish action (US-0123); owns `reservasPanelAutoReservar` + `openReservaDirecta`, wiring the card "Reservar" button to ReservasPanel's `autoReservar` (US-0127); admin-only "Publicar en eventos" → gestion-eventos/nuevo?desdeEntrenamiento={id}, enabled only for future trainings via esEntrenamientoFuturo (US-0132)
│   │   │       ├── EntrenamientosCalendar.tsx   # Dot colors driven by discipline
│   │   │       ├── EntrenamientoFormModal.tsx   # Create/edit modal shell around EntrenamientoWizard; no visibility field (trainings are always private to the tenant, US-0123)
│   │   │       ├── EntrenamientoDetalleModal.tsx  # Read-only "Ver detalle" view (incl. past trainings); includes "Guardar como plantilla"
│   │   │       ├── EntrenamientoCategoriasSection.tsx  # Optional per-level capacity allocation step
│   │   │       ├── EntrenamientoRestriccionesSection.tsx  # Collapsible restriction-row editor (timing + service-based access conditions, AND/OR per row)
│   │   │       ├── EntrenamientoFormularioSection.tsx  # Formulario attachment: none/externo/interno toggle, plantilla picker (role-gated "crear nueva"), obligatorio checkbox (US-0086)
│   │   │       ├── EntrenamientosList.tsx       # Shows attached formulario (externo link or interno plantilla name) + Obligatorio tag; athlete-only "Reservar" card button on upcoming trainings via optional `onReservar` (disabled "Cupo lleno" when full; managers keep "Opciones") (US-0127)
│   │   │       ├── EntrenamientoActionModal.tsx  # Options menu: Ver detalle, Ver reservas, Editar, Eliminar; optional "Publicar en eventos" card (onPublicarEnEventos / canPublicarEnEventos / publicarEnEventosDisabledReason) between "Ver reservas" and "Editar" (US-0132)
│   │   │       └── reservas/              # Sub-feature slice (booking)
│   │   │           ├── ReservasPanel.tsx        # Two-step booking flow when training has an internal formulario (US-0087): ReservaFormModal → FormularioRespuestaModal; "Ver respuesta" row action opens FormularioRespuestaViewerModal; forwards perfilResumen/perfilFaltantes/refetchPerfil and isSelf (target athlete vs current user) to FormularioRespuestaModal, and perfil_campos_requeridos to the "Ver formulario" FormularioPreviewModal call (US-0095); handleOpenRespuestaViewer resolves perfil_snapshot into the viewer's perfilCampos via FORMULARIO_PERFIL_CAMPOS; handleExportFormularioRespuestas adds one Excel column per unique perfil_snapshot key (union across responses, catalog order) after the fixed identity columns (US-0096); formats checkbox answers as "Sí"/"No" (US-0108); booking/cancellation rejections are no longer rendered inline — they go to ReservaRechazoModal; optional `autoReservar` prop opens the self-booking dialog once per opening after the panel data loads (US-0127)
│   │   │           ├── ReservaFormModal.tsx     # Shows "Formulario adjunto" banner + signals parent (onRequireFormulario) instead of submitting directly when training has formulario_id (US-0087); optional `headerExtra` slot rendered below the title, used by the marketplace booking modal to inject GuidedBookingStepper (US-0103)
│   │   │           ├── ReservaRechazoModal.tsx  # Top-most rejection dialog (BodyPortal, z-[70], above the drawer and booking dialogs): default variant ("No es posible completar/cancelar la reserva" + "Entendido") and plan-offer variant ("¿Deseas adquirir un plan?" + "Ver planes" → gestion-planes + "Ahora no") when rejection.ofrecerPlan and the booking is for the current user (US-0127)
│   │   │           ├── ReservaStatusBadge.tsx
│   │   │           ├── AsistenciaStatusBadge.tsx  # Inline badge: Sin registrar / Asistió / No asistió
│   │   │           ├── AsistenciaFormModal.tsx    # Create/edit/delete attendance record (admin/coach only)
│   │   │           ├── FormularioRespuestaModal.tsx        # Fill-out step: editable inputs per campo_tipo (incl. imagen upload, checkbox, seleccion tile group — US-0108), "Guardar y reservar" + conditional "Reservar sin formulario" skip (US-0087); applies the shared buildFormularioRenderPlan grouping ('seccion' cards, separador dividers, columna_ancho pairing — US-0108); read-only profile summary strip / amber incomplete-profile warning (with "Actualizar perfil" + re-check) above the sections, submit disabled while any requested profile field is missing (US-0095); banner kept only as defense-in-depth now that the marketplace flow resolves incompleteness earlier via InlineProfileCompletionStep; optional `headerExtra` slot for GuidedBookingStepper (US-0103)
│   │   │           ├── FormularioRespuestaViewerModal.tsx  # Read-only "Ver respuesta" viewer — labels + submitted values, signed-URL images (US-0087); checkbox answers rendered as "Sí"/"No" (US-0108); optional "Datos de perfil" section above the answers, rendered from perfil_snapshot via the FORMULARIO_PERFIL_CAMPOS catalog (US-0096)
│   │   │           ├── InlineProfileCompletionStep.tsx     # Booking-modal-embedded profile completion: wraps usePerfil() as-is, renders PerfilPersonalForm/PerfilDeportivoForm filtered via `visibleFields` to only the training's missing perfil_campos_requeridos, "Guardar y continuar" saves then calls the caller's refetchPerfil (US-0103)
│   │   │           └── index.ts
│   │   │   └── planes-publicos/          # Feature slice (portal/planes-publicos — US-0093)
│   │   │       ├── VerPlanesButton.tsx     # "Ver planes" secondary action on every organization card; owns modal open state + focus restore
│   │   │       ├── PlanesPublicosModal.tsx # Public catalog dialog: search input (plans AND services), loading/empty/no-results/error states; reuses useSuscripcion + SuscripcionModal for the acquisition; optional initialSearch prop pre-fills/resets the search on every open (not just first mount) for callers that want a pre-filtered catalog (US-0101); optional onSubscribed callback forwarded to useSuscripcion, lets a caller chain into its own next step after purchase instead of the generic close (US-0106); US-0110 re-types it to (purchase: PendingPlanPurchaseDraft) => void — it now hands over the FILLED-IN, UNSAVED purchase rather than a created suscripcion id, so the caller persists it as part of its own flow (callers omitting it keep the immediate-purchase behavior)
│   │   │       ├── PlanPublicoCard.tsx     # One public plan: modalidad, disciplines, benefits, "Adquirir"; subtypes live in a native <details> disclosure summarizing count + lowest price (precio COP + vigencia_dias + granted services, "ilimitado" when unidades is null), auto-expanded while a search term is active
│   │   │       └── index.ts
│   │   │   └── planes/                   # Feature slice (portal/planes)
│   │   │       ├── PlanesPage.tsx
│   │   │       ├── PlanesTable.tsx         # Props: onEdit, onDuplicate?, onDelete?, showVisibilidad?, renderRowAction? — showVisibilidad renders the admin-only Visibilidad column (Público/Privado); readOnly can't gate it because the athlete view also passes readOnly={false} (US-0093) Status badge has three variants driven by `row.estado` — Activo / amber "Activo no visible" (`visibility_off` icon) / Inactivo (US-0126)
│   │   │       ├── PlanesHeaderFilters.tsx
│   │   │       ├── PlanFormModal.tsx        # mode: 'create' | 'edit' | 'duplicate' — "Estado" select (Activo / Activo no visible / Inactivo) via `onChangeEstado`; "Plan público" is disabled while the plan is not visible to athletes (US-0126)
│   │   │       ├── PlanTipoServiciosSection.tsx  # Services assignment rows inside plan tipo sub-form (US-0062)
│   │   │       ├── PlanesViewPage.tsx
│   │   │       ├── PlanesRolePage.tsx
│   │   │       ├── SuscripcionModal.tsx  # Two-step subtype-then-payment flow; Step 1 (subtype picker) is skipped and the modal opens directly on Step 2 when the plan has exactly one active subtype (auto-selected by useSuscripcion.openModal), tracked via hasSubtypeChoice = activeTipos.length > 1 (US-0105)
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
│   │   │       ├── FormularioEditorPage.tsx        # Dedicated per-template editor: FormularioHeaderEditor + section builder + vista previa; sticky "Guardar cambios" button (disabled while !isDirty/saving) + "Cambios sin guardar" indicator + beforeunload guard; nombre/descripción/activo/perfil-checkboxes write to the in-memory draft only — no per-change Supabase writes (US-0108, replaces the prior auto-save behavior)
│   │   │       ├── FormularioHeaderEditor.tsx      # Editable "Hero" header (logo via useTenantLogo + eyebrow/título/accent-divider/subtítulo/badges), styled per design reference P43Yo; readOnly mode reused by FormularioPreviewModal (US-0108)
│   │   │       ├── FormularioBadgeChipInput.tsx    # Add/remove chip editor for the header's badge list, capped at FORMULARIO_HEADER_BADGES_MAX (5) (US-0108)
│   │   │       ├── FormularioSeccionesBuilder.tsx  # Groups the flat ordered schema into 'seccion' cards (positional, no parent FK) + two-column 'mitad' pairing via shared buildFormularioRenderPlan; hover "+" insert-here affordances between any two rows (or above the first); pinned "Añadir sección de formulario" append button; onSaveSeccion/onDeleteSeccion/onReorder are now synchronous local-draft mutators (US-0108)
│   │   │       ├── FormularioSeccionesGrouped.tsx  # Read-only, card-grouped rendering of a plantilla's body secciones — shared by FormularioPreviewModal (US-0108)
│   │   │       ├── FormularioSeccionCard.tsx       # Collapsed (per-tipo render) / expanded (live type-driven edit form) section card; "Tipo de sección" picker excludes the 4 fixed encabezado_* types; adds columna_ancho toggle (datos only) and seccion_subtitulo input (seccion only); "Listo" is a synchronous local commit, no server round trip (US-0108)
│   │   │       ├── FormularioSeccionContent.tsx    # Shared per-seccion_tipo renderer (título/subtítulo/texto/datos/separador), used by card + preview; 'seccion' and 'encabezado_*' rows are rendered by their own wrappers, not this renderer (US-0108)
│   │   │       ├── FormularioCampoPreviewInput.tsx # Disabled input preview matching a "Datos" section's campo_tipo, incl. checkbox and seleccion (tile group) (US-0108)
│   │   │       ├── FormularioPreviewModal.tsx      # Mounts FormularioHeaderEditor (read-only) + FormularioSeccionesGrouped for the body; optional "Datos de perfil solicitados" chip list when perfil_campos_requeridos is non-empty (US-0095); requires a `tenantId` prop (US-0108)
│   │   │       ├── FormularioTipoCampoBadge.tsx    # Badge mapping campo_tipo to label/icon, incl. checkbox and seleccion (US-0108)
│   │   │       └── index.ts
│   │   │   └── gestion-equipo/            # Feature slice (portal/gestion-equipo)
│   │   │       ├── EquipoPage.tsx
│   │   │       ├── EquipoTable.tsx
│   │   │       ├── EquipoStatsCards.tsx
│   │   │       ├── EquipoHeaderFilters.tsx
│   │   │       ├── EquipoStatusBadge.tsx          # Includes sky "Pendiente de activación" (US-0114)
│   │   │       ├── CambiarEstadoModal.tsx         # Pending members may only become Activo/Inactivo; "Activación de cuenta" motivo (US-0114)
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
│   │   │   └── gestion-invitaciones/      # Feature slice (portal/gestion-equipo/gestion-invitaciones, US-0114) — mirrors gestion-solicitudes styling
│   │   │       ├── AgregarMiembroModal.tsx        # Email, role, optional nombre/nota; Modo choice only when admin_tenants entitlement is on; active-member warning
│   │   │       ├── ContrasenaTemporalModal.tsx    # One-time password reveal; cannot be dismissed until "Compartiré esta contraseña por un canal aprobado" is checked
│   │   │       ├── InvitacionesTab.tsx            # Estado filter, Agregar miembro action, loading/error/empty states
│   │   │       ├── InvitacionesTable.tsx          # Correo/Rol/Estado/Expira/Creada; Reenviar + inline-confirm Cancelar for pendiente/enviada/expirada
│   │   │       └── InvitacionEstadoBadge.tsx      # pendiente and enviada share "Pendiente" so the list never reveals whether an email had an account
│   │   │   └── invitaciones/              # Feature slice (portal/invitaciones — recipient side, US-0114)
│   │   │       ├── AceptarInvitacionPage.tsx      # Accept flow with explicit expired/cancelled/accepted/not-found states
│   │   │       ├── ActivarCuentaPage.tsx          # New password + confirmation → activation
│   │   │       └── InvitacionesPendientesSection.tsx  # Rendered by PortalTenantsPage when the user has pending invitations (in-app delivery for existing accounts)
│   │   │   └── gestion-eventos/           # Feature slice (portal/gestion-eventos — team events, US-0118 / US-0119)
│   │   │       ├── GestionEventosPage.tsx     # Route-agnostic (only tenantId) so a later phase can mount it on a trainer route under (shared); owns the status/delete modals; "Nuevo evento" / "Editar" navigate to the wizard routes; dismissible ?guardado= success banner (US-0119)
│   │   │       ├── EventosToolbar.tsx         # View switcher (radiogroup, arrow keys) + search/estado (incl. Borrador)/periodo/disciplina-by-name filters — US-0131: `vista` / `onVistaChange` optional (no switcher) and `ocultarBorrador`, for the check-in selector
│   │   │       ├── EventosStatsCards.tsx      # Total / Próximos confirmados / Cancelados / Borradores over the unfiltered dataset
│   │   │       ├── EventosGrid.tsx / EventoCard.tsx  # Cards view (default), modeled on PublicTrainingCard; EventoCard `hideActions` is used by the wizard preview; drafts show the "Borrador" tag, "Sin disciplina" and "Precio por definir" fallbacks (US-0119)
│   │   │       ├── EventosTable.tsx           # List view, 20 rows/page, stacked rows below md — US-0131: `renderAcciones(evento)` replaces the admin actions menu and hides the Visibilidad / Activo columns
│   │   │       ├── EventosCalendar.tsx        # Month grid (Bogotá), 3 chips + "+N" per day, selected-day list, undated-events note; does NOT reuse EntrenamientosCalendar
│   │   │       ├── EventoActionsMenu.tsx      # Quick "Activar evento" / "Desactivar evento" item (US-0120). Kebab menu portalled to document.body (cards/table clip overflow; backdrop-blur ancestors trap fixed elements), flips upward near the viewport bottom; drafts only get "Continuar editando" + "Eliminar" (US-0119); "Ver compras" for published events (US-0121); "Duplicar" for every event → `nuevo?duplicar={id}` (US-0122) — US-0131: "Control de ingreso" (`qr_code_scanner`, after "Ver compras") only for published `confirmado` events, via onControlIngreso threaded from GestionEventosPage through EventosGrid / EventoCard / EventosTable / EventosCalendar
│   │   │       ├── EventoModalShell.tsx       # Shared dialog frame + EventoDangerButton + BodyPortal (all events modals render on document.body: backdrop-blur cards trap `fixed` children under the wizard's sticky footer)
│   │   │       ├── CambiarEstadoEventoModal.tsx / EliminarEventoModal.tsx
│   │   │       ├── compras/                   # US-0121 admin "Compras" page of one event
│   │   │       │   ├── EventoComprasPage.tsx      # "Vendidas: X / cupo", stats, estado + search filters, table, modals; proof images inline, PDFs in a new tab
│   │   │       │   ├── EventoComprasTable.tsx / EventoComprasStats.tsx — US-0131: "{codigo} · Ingresó {d MMM h:mm}" under the ticket name per used ticket; optional "Ingresaron X / Y" stats card (4 columns from lg)
│   │   │       │   └── CompraDatosModal.tsx / ValidarCompraModal.tsx / RechazarCompraModal.tsx  # Answers labelled with the snapshot version they answered — US-0131: "Entradas" section with each code's entry time or "Sin ingreso"
│   │   │       ├── EventoEstadoBadge.tsx      # Confirmado / Cancelado, or a dashed "Borrador" pill when `borrador` (US-0119); `overlay` variant (opaque background over banners, US-0120)
│   │   │       ├── EventoActivoBadge.tsx      # "Activo" / "Inactivo" pill (icon + text, amber when inactive), `overlay` variant — shown in cards (over the banner, inactive cards get a dashed amber border), list ("Activo" column) and calendar (chip icon + selected-day list) (US-0120)
│   │   │       └── wizard/                    # Full-page create/edit wizard (US-0119) — no mockup, grit-arena-v2 tokens
│   │   │           ├── EventoWizardPage.tsx   # Root: loading / not-found / error states, header (Borrador tag + "Último guardado"), stepper, active step, footer, leave guard, focus management (step h2 on step change, first invalid field on failed validation); dismissible role=status notice while the draft is an unsaved copy (US-0122) — US-0132: `desdeEntrenamientoId` prop; dismissible training-origin notice (source, capacity NOT shared, define tickets/payment methods, moved-description and dropped-external-form lines); not-found copy by notFoundKind ("Entrenamiento no encontrado" / "Este entrenamiento ya pasó")
│   │   │           ├── EventoWizardStepper.tsx  # <ol aria-label="Pasos del evento">, aria-current="step", check on done, red dot + "Revisar" on steps with errors
│   │   │           ├── EventoWizardFooter.tsx   # Sticky: Atrás / Vista previa / Siguiente / "Guardar borrador" (new or draft only; disabled without name or changes) / "Publicar evento" (step 3) or "Guardar cambios" (published, every step); role=alert save error; role=status "Borrador guardado"; "Cancelar" (every step) leaves through the unsaved-changes guard (US-0122)
│   │   │           ├── EventoConfiguracionStep.tsx  # Step 1: single-column form sections (the live preview lives in EventoPreviewModal) — US-0132: while created from a training, the "Cupo máximo" hint states the capacity is the event's own, not shared with the training
│   │   │           ├── EventoPreviewModal.tsx # Large dialog opened from the footer's "Vista previa" button; portaled to document.body
│   │   │           ├── EventoPreview.tsx      # Página (EventoDetalleBody from portal/eventos/detalle via toDetallePreviewItem, inert — US-0120; was PublicTrainingDetalleBody) / Tarjeta (EventoCard hideActions) radiogroup; useDeferredValue on the draft
│   │   │           ├── EventoEscenarioSelector.tsx  # Active scenarios + "Sin escenario" + "+ Crear nuevo escenario" → existing ScenarioFormModal driven by useScenarios({ onCreated }) which auto-selects the new one; stale snapshot "(guardado en el evento)"; snapshot built with the shared toEscenarioSnapshot (US-0132)
│   │   │           ├── EventoEntrenadoresSelector.tsx  # Searchable checkbox list of trainers; per-trainer `experiencia` textarea (max 500)
│   │   │           ├── EventoEntradasStep.tsx / EventoEntradasEditor.tsx  # Step 2: ticket cards (Sencilla/Múltiple, raw-string valor, sale window, move/delete with coupon-loss confirmation, collapsible coupons auto-expanded on error)
│   │   │           ├── EventoBundleSelector.tsx  # Múltiple bundle: other non-cancelled tenant events (never the current one); dropped-deleted-events warning
│   │   │           ├── EventoCuponesEditor.tsx   # Coupon rows (nombre, uppercase code, % discount with "$X → $Y" preview, validity window); disabled on free tickets
│   │   │           ├── EventoFormularioSelector.tsx  # "Sin formulario" + active templates, "Vista previa" via useFormularioPreview + FormularioPreviewModal
│   │   │           ├── EventoMetodosPagoStep.tsx  # Step 3 (US-0130, replaces the US-0119 checkbox list): two add-driven sections that start empty — "Métodos para todas las entradas" (→ eventos.metodos_pago) and "Métodos para una entrada específica" (one block per ticket → evento_entradas.metodos_pago) — per-ticket cash-only warning (cash is never offered at checkout, US-0121), summary panel ("{n} para todas las entradas · {m} por entrada"); owns the add/edit dialog and returns focus to its trigger
│   │   │           ├── EventoMetodosPagoList.tsx  # US-0130: method cards of one list (tags "Solo este evento" / "No disponible para compra en línea" / "QR", "(inactivo o eliminado)" for stale tenant snapshots), "Quitar" on all, "Editar" only for origen='evento', empty state, inline error, "Agregar método de pago"
│   │   │           ├── EventoMetodoPagoAgregarModal.tsx  # US-0130: "Elegir un método existente" (active tenant methods not yet in the list → toMetodoPagoSnapshot, origen='tenant') or "Crear un método solo para este evento" (MetodoPagoFormModal variant="evento" in a BodyPortal): client-generated id, QR uploaded with storageService.uploadMetodoPagoQr, snapshot with origen='evento' — never writes tenant_metodos_pago; also edits an event-only snapshot keeping its id
│   │   │           ├── SalirSinGuardarModal.tsx   # "Tienes cambios sin guardar. ¿Salir sin guardar?"
│   │   │           ├── fields.tsx             # Field/FieldError/SelectShell/WizardSection/RowIconButton + fieldDomId(errorKey) so focus requests reach the invalid control
│   │   │           └── index.ts
│   │   │   └── eventos/                   # Feature slice (portal/eventos — cross-tenant event discovery + event pages, US-0120); copies/adapts the public-trainings UI, never imports it (that feature will be deprecated)
│   │   │       ├── EventosPublicosPage.tsx        # Portal listing: sticky header (h1 "Eventos Públicos", EventosDisponiblesWidget, "Filtrar"), 60-day note, grid, filters drawer, EventoEntradasModal ('usuario')
│   │   │       ├── EventoPublicoCard.tsx          # Card: banner/discipline placeholder (also on image error), Próximo / "Solo miembros" chips, organization (nombre_tenant), Bogotá date, place (URL-valued meeting points shown as "Punto de encuentro"), cupo, trainers, antelación, formatEventoPrecio; "Ver detalles" + "Obtener entrada"; no occupancy/services/forms/plans
│   │   │       ├── EventosPublicosGrid.tsx        # Featured + 1/3-col grid; empty state, or "No hay eventos que coincidan con los filtros" + "Limpiar filtros" when filters are active
│   │   │       ├── EventosPublicosFiltersDrawer.tsx  # Bogotá calendar range, quick chips (aria-pressed), Organización + Disciplina selects (derived from rows), search, "Limpiar filtros"
│   │   │       ├── ObtenerEntradaModal.tsx        # Anonymous get-ticket entry (landing styles): "Crear cuenta gratis" / "Ya tengo cuenta" (next=/portal/eventos/{id}?entradas=1) / "Continuar sin registro"; hint tells guests to download the ticket and create an account with the same email (no email is sent, US-0121)
│   │   │       ├── EventoEntradasModal.tsx        # US-0121 checkout shell: Entrada › Datos › Pago › Listo (Pago hidden when total = 0), sticky footer, full-screen below sm, Escape blocked while submitting; all state in useEventoCompra (no `onContinuar`)
│   │   │       ├── compra/                        # US-0121 checkout steps (presentational)
│   │   │       │   ├── EventoCompraStepper.tsx        # aria-current="step"; only the current label below sm
│   │   │       │   ├── EventoCompraPasoEntrada.tsx    # Sellable tickets from evento_entradas (radio group, Múltiple bundle names), coupon, PoliticaCancelacion, total, guest note, blocking states
│   │   │       │   ├── EventoCompraPasoDatos.tsx      # Fixed fields (name, email — twice for guests, read-only for users —, birth date) + requested profile fields + the form snapshot through FormularioSeccionesGrouped; its header is built from the snapshot (FormularioHeaderEditor reads `tenants`, which guests cannot)
│   │   │       │   ├── EventoCompraPasoPago.tsx       # Order summary, non-cash methods (EventoMetodoPagoCard), required proof (JPEG/PNG/WebP/PDF ≤ 5 MB)
│   │   │       │   ├── EventoCompraPasoConfirmacion.tsx  # Status, codes, PDF download (no request needed), "Ver mis entradas" or the guest create-account notice
│   │   │       │   └── EventoCompraEstadoBadge.tsx / PoliticaCancelacion.tsx / index.ts
│   │   │       ├── EventoMetodoPagoCard.tsx       # One published payment method: tipo label, valor + "Copiar", http(s)-only payment link, plain-text comentarios, QR image when the snapshot has qr_url (US-0128); `compact` variant used by the tickets modal (the only place payment methods are shown before the purchase flow)
│   │   │       ├── EventoBannerModal.tsx / EventosDisponiblesWidget.tsx
│   │   │       ├── detalle/                       # Event page shared by /eventos/[event_id], /portal/eventos/[event_id] and the US-0119 wizard preview
│   │   │       │   ├── EventoDetalleBody.tsx          # Hero(+Descripción) → Incluye|Cronograma → Entrenadores → Entradas → CTA banner; keeps the approved event layout (no Ubicación card, no occupancy); no payment methods (they belong to the ticket-purchase flow); empty sections hidden
│   │   │       │   ├── EventoDetalleHero.tsx          # Banner + "Ver", discipline / kind tags, organization line, h1, meta items (date, Bogotá time range, "Ver ubicación" link from punto_encuentro, cupo, lead time, "Ver página oficial")
│   │   │       │   ├── EventoDetalleDescripcion.tsx / EventoDetalleIncluye.tsx / EventoDetalleCronograma.tsx  # Copies of the training sections (react-markdown, no HTML passthrough)
│   │   │       │   ├── EventoDetalleEntrenadores.tsx  # Trainer snapshots with their event-specific experiencia
│   │   │       │   ├── EventoDetalleEntradas.tsx / EventoDetalleCtaBanner.tsx ("Reserva tu cupo" title, "Obtener entrada" button)
│   │   │       │   ├── EventoDetalleStates.tsx        # loading / error ("Reintentar") / "Evento no encontrado"
│   │   │       │   ├── EventoDetallePortalPage.tsx    # Portal event page: useEventoDetalle(id, {soloPublicos: false}), "Volver a eventos" from `from`, EventoEntradasModal ('usuario'); US-0121: "Ya tienes una entrada para este evento · Ver mis entradas" (useMiTicketEnEvento) instead of the checkout, also for ?entradas=1
│   │   │       │   └── index.ts
│   │   │       └── index.ts
│   │   │   └── gestion-suscripciones/     # Feature slice (portal/gestion-suscripciones)
│   │   │       ├── GestionSuscripcionesPage.tsx  # Owns activeTab (Miembros/No miembros) state, tab bar with tabCounts badges, tab-aware empty state (US-0098)
│   │   │       ├── SuscripcionesTable.tsx        # Includes "Tipo" column rendering SuscripcionTipoBadge per row (US-0098)
│   │   │       ├── SuscripcionesStatsCards.tsx
│   │   │       ├── SuscripcionesHeaderFilters.tsx
│   │   │       ├── SuscripcionEstadoBadge.tsx
│   │   │       ├── PagoEstadoBadge.tsx
│   │   │       ├── ValidarPagoModal.tsx  # Rejecting a payment now requires a motivo, stored on pagos.motivo_rechazo and shown to the athlete (US-0106)
│   │   │       ├── ValidarSuscripcionModal.tsx
│   │   │       ├── EditarSuscripcionModal.tsx    # Full-field edit modal for existing subscriptions
│   │   │       ├── EliminarSuscripcionModal.tsx  # Confirmation dialog for permanent deletion
│   │   │       ├── VerDetallePagoModal.tsx       # Read-only modal: full payment details + comprobante viewer (all payment statuses)
│   │   │       ├── VerServiciosModal.tsx          # Read-only modal: all service unit balances for a subscription (US-0067)
│   │   │       ├── CrearSuscripcionModal.tsx     # 3-step admin modal to create a subscription on behalf of an athlete; plan picker includes "Activo no visible" plans, suffixed "(No visible)" (US-0126)
│   │   │       ├── SuscripcionTipoBadge.tsx      # "Miembro"/"No miembro" badge from es_miembro (US-0098)
│   │   │       └── index.ts
│   │   │   └── analitica/                  # Feature slice (portal/analitica — US-0115; styled per grit-arena-v2.pen node zfVKC in US-0116's design pass)
│   │   │       ├── AnaliticaPage.tsx       # Tenant BI root: date range, stale-data refresh state and four accessible tabs; GritPageHeader + GritCard panels/tables + GritEmptyState states. Resumen = 2 rows × 4 KPI cards (clickable → tab) + 3 rows × 2 nivo charts (analitica-resumen-kpis-graficas). Ingresos / Operación / Equipo per analitica-pestanas-ingresos-operacion-equipo: KPI rows, monthly charts, AnaliticaDataTable tables with headers; Equipo counts athletes only
│   │   │       ├── AnaliticaDateRangeFilter.tsx # Colombia/Bogota presets and custom date validation; glass drawer with gritInputClass inputs and GritButton actions
│   │   │       ├── AnaliticaTabs.tsx       # WAI-ARIA tablist with Arrow/Home/End keyboard navigation; v2 active state (cyan gradient + glass border)
│   │   │       ├── AnaliticaKpiCard.tsx    # KPI card per zfVKC: GritCard + 40px round GritIconTile, 28px Rajdhani value, optional `icon`, tone → grit-success / grit-discipline-run
│   │   │       ├── chart-theme.ts          # analiticaChartTheme + ANALITICA_CHART_COLORS for the @nivo charts — the ONLY place chart colours are defined (grit-* values, hue-separated series order)
│   │   │       ├── format.ts               # Shared formatters: currency/integer/percent/percentOr, decimal1, compactCurrency ("$ 1,2 M" / "$ 850 mil"), share %, monthLabel/spansYears, shortDate ("10 may 2026"), monthYear, MEMBER_STATUS_LABELS
│   │   │       ├── AnaliticaDataTable.tsx  # Detail-tab table: header row, right-aligned numeric columns, overflow-x-auto inside its panel, shared empty message
│   │   │       ├── charts/                 # Resumen nivo charts (analitica-resumen-kpis-graficas); each renders ChartEmpty on an empty/all-zero series, fixed h-72
│   │   │       │   ├── MonthlyRevenueBarChart.tsx       # @nivo/bar: validated + pending per month (clipped to range), custom layer draws the compact total above each bar
│   │   │       │   ├── RevenueValidationPieChart.tsx    # @nivo/pie donut: Validados vs Pendientes, % arc labels
│   │   │       │   ├── SubscriptionsSoldLineChart.tsx   # @nivo/line: subscriptions created per month (excl. canceladas)
│   │   │       │   ├── SubscriptionsByPlanBarChart.tsx  # @nivo/bar horizontal: sold per plan, best seller on top, top 9 + "Otros planes"
│   │   │       │   ├── BookingAverageLineChart.tsx      # @nivo/line: valid bookings ÷ sessions per month
│   │   │       │   ├── BookingsByDisciplinePieChart.tsx # @nivo/pie donut: % of valid bookings per discipline, top 5 + "Otras"
│   │   │       │   ├── SubscriptionsSoldStackedBarChart.tsx # Ingresos: @nivo/bar stacked, sold per month with / without validated payment, totals above bars
│   │   │       │   ├── MonthlyOperationsLineChart.tsx   # Operación: @nivo/line, trainings + bookings per month on one left axis, slice tooltip
│   │   │       │   ├── MonthlyPercentLineChart.tsx      # Operación: @nivo/line, monthly avg occupancy/attendance %, Y 0–100, null months as gaps
│   │   │       │   ├── shared.tsx          # ChartEmpty, ChartFrame (h-72), ChartTooltip, donutLegend, truncate, barTotalsLayer (totals above plain or stacked bars)
│   │   │       │   └── index.ts
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
│   │   │       ├── PerfilPersonalForm.tsx   # Optional `visibleFields?: FormularioPerfilCampo[]` prop filters rendered fields (numero_identificacion follows tipo_identificacion's visibility); omitted renders every field as before (US-0103)
│   │   │       ├── PerfilDeportivoForm.tsx  # Same `visibleFields?: FormularioPerfilCampo[]` prop addition; returns null when neither peso_kg nor altura_cm is visible (US-0103)
│   │   │       ├── CompletarPerfilPage.tsx  # Gated profile completion for a tenant with requiere_perfil_completo: only the server-resolved missing fields via PerfilPersonalForm, "Guardar y continuar" → router.replace to the organization (US-0136)
│   │   │       └── index.ts
│   │   │   └── mis-suscripciones/          # Feature slice (portal/mis-suscripciones — cross-tenant subscription & payment view, renamed from mis-suscripciones-y-pagos in US-0093)
│   │   │       ├── MisSuscripcionesYPagosPage.tsx  # List container with filters, empty states; props { suscripciones, userId } — tenant comes per row
│   │   │       ├── MisSuscripcionesFilters.tsx     # Chip filter bar (subscription status + payment status) + "Organización" select, shown only when the user holds subscriptions in more than one org
│   │   │       ├── SuscripcionCard.tsx              # Subscription card with organization name, plan info + SuscripcionEstadoBadge
│   │   │       ├── PagoCard.tsx                     # Payment info, comprobante viewer, upload trigger; shows motivo_rechazo when rejected; resubmitting a proof resets estado to pendiente (US-0106)
│   │   │       └── index.ts
│   │   │   └── control-ingreso/            # Feature slice (portal/control-ingreso — door check-in of event tickets, US-0131); no mockup, reuses grit tokens + EventoModalShell
│   │   │       ├── ControlIngresoEventosPage.tsx   # Event selector = the "Eventos" list view: useGestionEventos(tenantId, {excluirBorradores, proximosDesdeHoy}) + EventosToolbar (no view switcher, no "Borrador") + EventosTable with renderAcciones ("Control de ingreso" link for confirmado, "Evento cancelado" otherwise); loading / error-with-retry / empty "No hay eventos para controlar ingreso." / no-match states
│   │   │       ├── ControlIngresoPage.tsx          # Check-in screen: IngresoResumenHeader, QrScanner (next/dynamic ssr:false), CodigoManualForm (focused when the camera fails), inline RPC error + "Reintentar", IngresoResultadoCard, AsistentesIngresoTable, RevertirIngresoModal
│   │   │       ├── QrScanner.tsx                   # Default export; camera OFF by default — "Habilitar lectura de QR con cámara" starts it (the `qr-scanner` Web Worker lib is imported and the permission requested only then), "Desactivar cámara" stops it; rear camera; stops on unmount and while the tab is hidden; on failure shows "No se pudo acceder a la cámara. Ingresa el código manualmente." + the enable button and calls onError; compact panel while off
│   │   │       ├── CodigoManualForm.tsx            # Labelled code input (also USB scanners: Enter submits); normalization happens in the hook
│   │   │       ├── IngresoResultadoCard.tsx        # role="status" aria-live="assertive"; icon + text + tone per result (ingresoResultadoMeta); "Deshacer ingreso" on ok / ya_ingreso; "Siguiente"
│   │   │       ├── IngresoResumenHeader.tsx        # Event name/date, "Ingresaron X / Y" + progressbar, pending-payment count
│   │   │       ├── AsistentesIngresoTable.tsx      # activa tickets: search (name/email/code), filter Todos / Ingresaron / Pendientes de ingreso, 20 per page, stacked below md, "Registrar ingreso" / "Revertir" per row
│   │   │       ├── RevertirIngresoModal.tsx        # Confirmation on EventoModalShell + EventoDangerButton, inline error
│   │   │       └── index.ts
│   │   │   └── mis-entradas/               # Feature slice (portal/mis-entradas — the user's event purchases across organizations, US-0121)
│   │   │       ├── MisEntradasPage.tsx             # Próximas / Pasadas tabs, estado filter, loading / error / empty ("Aún no tienes entradas." → /portal/eventos)
│   │   │       ├── MiCompraCard.tsx                # Event, ticket, total, method, estado badge, codes (one per event for Múltiple), motivo_rechazo, policy line; Descargar PDF / Reenviar comprobante / Cancelar / Ver evento — US-0131: "Usada" badge next to each checked-in code
│   │   │       ├── ReenviarComprobanteModal.tsx / CancelarCompraModal.tsx  # Reuse EventoModalShell; inline errors
│   │   │       └── index.ts
│   │   │   └── notificaciones/              # Feature slice (portal/notificaciones — in-app inbox, US-0125)
│   │   │       ├── NotificacionesBell.tsx          # Header bell: unread badge (hidden at 0, 1–9, "9+"), aria-label with the count, aria-live announcement, owns the panel (Escape / outside click, focus back to the bell); useNotificaciones({ limit: 10, realtime: true }); exports esUrlInterna (only same-origin paths are followed)
│   │   │       ├── NotificacionesPanel.tsx         # Glass dropdown (role=dialog): 10 latest, "Marcar todas como leídas", loading / empty ("No tienes notificaciones") / role=alert error + "Reintentar", "Ver todas" → /portal/notificaciones
│   │   │       ├── NotificacionItem.tsx            # Row button: unread dot + "Nueva" label (never colour alone), title, message (2-line clamp when `dense`), relative time (Intl.RelativeTimeFormat 'es')
│   │   │       ├── NotificacionesPage.tsx          # History: GritPageHeader + "Marcar todas como leídas", GritCard list, 20 per page (Anterior / Página X de Y / Siguiente, hidden with one page), loading / empty / error states
│   │   │       └── index.ts
│   │   │   └── mis-reservas/               # Feature slice (portal/mis-reservas — cross-tenant athlete reservation history, US-0074, moved cross-tenant in US-0097)
│   │   │       ├── MisReservasPage.tsx             # Main page: filters, table, banner, CSV export (atleta_id-scoped, no tenant param)
│   │   │       ├── MisReservasFiltersPanel.tsx     # Server-side filter panel: date range, attendance, discipline (derived from loaded rows), Organización (shown only when >1 org)
│   │   │       ├── MisReservasTable.tsx            # Data table with Organización column, badges, client-side pagination
│   │   │       └── index.ts
│   │   └── ui/
│   │       ├── MultilineText.tsx        # Renders a string with whitespace-pre-wrap (preserves line breaks), optional maxLength truncation, `as` tag prop (p/span/div) — US-0099
│   │       ├── grit/                    # grit-arena-v2 presentational kit (US-0116) — no data fetching; values taken from grit-arena-v2.pen
│   │       │   ├── GritCard.tsx         # variant glass|card|highlight, padding sm|md|lg|xl (16/20/24/28), radius 16, `as`
│   │       │   ├── GritButton.tsx       # primary|secondary|outline-accent|ghost, sm|md, radius 10; renders <Link>/<a external> when href is set; loading/disabled; cyan focus ring
│   │       │   ├── GritTag.tsx          # Uppercase pill (accent|neutral) with optional icon
│   │       │   ├── GritBadge.tsx        # Small info chip (card fill + glass border)
│   │       │   ├── GritIconTile.tsx     # 34|40|48 px icon container, rounded|circle, card|accent tone
│   │       │   ├── GritInfoRow.tsx      # Icon tile + label/value pair
│   │       │   ├── GritSectionHeading.tsx # Rajdhani h2 (md 20px / lg 22px) + subtitle + action slot
│   │       │   ├── GritPageHeader.tsx   # The page's single h1 (eyebrow, title + cyan titleAccent, subtitle, actions)
│   │       │   ├── GritPageContainer.tsx # 1440 max width, 16/24/48 side padding, 32 gap — applied once by portal/layout.tsx to every Portal page
│   │       │   ├── GritDivider.tsx, GritIcon.tsx (Material Symbols @ weight 300), GritEmptyState.tsx
│   │       │   ├── icon-map.ts          # Design Lucide name → Material Symbols ligature (single swap point)
│   │       │   ├── styles.ts            # cx(), gritInputClass, gritSelectClass, gritFocusRing
│   │       │   └── index.ts             # Re-exported from components/ui/index.ts
│   │       └── index.ts
│   │
│   ├── hooks/                            # Application core (use cases)
│   │   ├── auth/
│   │   ├── landing/
│   │   │   └── eventos/
│   │   │       └── useEventosLanding.ts   # listEventosPublicados({soloPublicos: true}) → { items, loading, error, refetch } (US-0120)
│   │   └── portal/
│   │       ├── usePortalNavigation.ts    # Shared portal logic
│   │       ├── tenant/
│   │       │   ├── useTenantView.ts              # directory mode loads memberships first, then the visibility-filtered tenant list (US-0133)
│   │       │   ├── useTenantBrandingImages.ts    # Logo/banner sources with a one-time signed-URL fallback; shared by TenantIdentityCard and TenantDirectoryCard (US-0133)
│   │       │   ├── useMetodosPago.ts      # Full CRUD state for tenant_metodos_pago; submitForm(data, qr) uploads the QR image (create: insert → upload → update qr_url; a failed upload keeps the form open on the created row) (US-0128)
│   │       │   ├── useReglasSuspension.ts  # CRUD state + 3-rule limit guard for tenant_reglas_suspension
│   │       │   └── useOrgLogoUpload.ts    # File select, MIME/size validation, preview URL, upload trigger for org logo
│   │       │   └── useOrgBannerUpload.ts   # File select, MIME/size validation, preview URL, upload trigger for org banner
│   │       │   └── useTenantLogo.ts        # Fetches { nombre, logo_url } for a tenant, mirrors useTenantName's lightweight pattern; feeds FormularioHeaderEditor's logo/wordmark (US-0108)
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
│               │   ├── useFormularioRespuestaForm.ts  # Loads attached plantilla's secciones (filters out the 4 header rows — US-0108), manages fill-out values/errors/per-field image upload, validate()/buildRespuesta() (US-0087); also fetches the target athlete's profile when perfil_campos_requeridos is non-empty, exposing perfilResumen/perfilFaltantes/perfilLoading/refetchPerfil — validate() fails while any requested field is missing (US-0095); validate() treats a required checkbox's "false" as missing, not just empty/undefined (US-0108)
│               │   └── useAsistencias.ts  # Attendance map keyed by reserva_id; isEnabled guard skips fetch for atleta role
│   │       └── planes/
│   │           ├── usePlanes.ts            # Exposes openCreateModal, openEditModal, openDuplicateModal; includes tiposServiceRows + updateTipoServiceRows (US-0062)
│   │           ├── usePlanForm.ts          # Exposes setFormFromPlan, setFormForDuplicate; manages tiposServiceRows parallel array (US-0062); `setEstado(PlanEstado)` maps the UI status to `activo` + `visible_atletas` (hidden clears `es_publico`; inactivo leaves `visible_atletas` untouched) (US-0126)
│   │           ├── usePlanTipoServicios.ts # Manages service rows state for plan tipo service assignment (US-0062)
│   │           ├── usePlanesView.ts        # Exposes getActiveTipos(plan) — canonical active-plan_tipos filter/sort, reused by useSuscripcion and SuscripcionModal; lists only `activo && visible_atletas` plans (US-0126)
│   │           └── useSuscripcion.ts       # openModal auto-selects selectedTipoId when the plan has exactly one active subtype, via getActiveTipos (US-0105); optional onSubscribed callback fires after successful creation, skipping the generic success message for callers chaining their own next step (US-0106). US-0110 INVERTS that: when onSubscribed is provided, submit() creates NOTHING (no suscripcion, no pago, no proof upload) and instead hands the validated form data over as a PendingPlanPurchaseDraft for the caller to persist atomically later — fixing the orphaned-pending-subscription bug where abandoning a booking mid-flow left a request that blocked every retry. With onSubscribed omitted (standalone catalog purchase) the immediate-creation path is unchanged
│   │       └── servicios/            # Feature hooks for services catalog (US-0062)
│   │           ├── useServicios.ts       # List + CRUD + modal coordination for servicios
│   │           └── useServicioForm.ts    # Controlled form state for ServicioFormModal
│   │       └── formularios/          # Feature hooks for form templates (US-0084/US-0085)
│   │           ├── useFormularios.ts            # List + create + delete for plantillas (list page)
│   │           ├── useFormularioForm.ts         # Controlled form state for FormularioFormModal (create-only: nombre + descripcion)
│   │           ├── useFormularioEditor.ts       # Draft/manual-save model (US-0108): plantillaDraft, secciones (working array), unsavedIds, deletedPersistedIds, isDirty; every mutator (updatePlantillaField/addSeccion/saveSeccion/updateHeaderSeccion/deleteSeccion/reorderSecciones) is a pure local-state update — no Supabase calls until saveAll() batches everything via formulariosService.saveEsquemaBatch; load() lazily backfills the 4 header rows as unsaved drafts for pre-US-0108 templates that lack them; computes campo_nombre via slugify + collision suffix against the full in-memory draft
│   │           ├── useFormularioSeccionForm.ts  # Controlled state for one section card's edit mode; validation branches by seccion_tipo, incl. seleccion (requires campo_lista_valores) and seccion (requires a título); handleSubmit is now synchronous (US-0108)
│   │           ├── useFormularioPlantillaName.ts # Fetches a plantilla's nombre by id (breadcrumb, mirrors useTenantName)
│   │           └── useFormularioPreview.ts       # Read-only "Vista previa" state over getPlantillaConSecciones; copied from the public-trainings slice so the events wizard does not depend on it (US-0120)
│   │       └── gestion-equipo/
│   │           ├── useEquipo.ts
│   │           ├── useConfigurarSuspension.ts     # 2-step modal state: rule selection + member multi-select + submit
│   │           └── useUsuarioNivelDisciplina.ts  # Fetch + upsert athlete discipline levels
│   │       └── gestion-invitaciones/     # US-0114
│   │           ├── useInvitacionesAdmin.ts   # Loads all invitations once; client-side estado filter; activeCount; reenviar/cancelar
│   │           ├── useAgregarMiembro.ts      # agregar(modo, input); holds the one-time resultadoAlta until limpiarResultado
│   │           └── useTenantEntitlements.ts  # Reads admin_tenants; fails closed
│   │       └── invitaciones/             # US-0114 (recipient)
│   │           ├── useMisInvitaciones.ts
│   │           ├── useAceptarInvitacion.ts
│   │           └── useActivarCuenta.ts       # updatePassword first; activar_alta_administrada only on success
│   │       └── gestion-solicitudes/
│   │           ├── useSolicitudesAdmin.ts    # Admin: load pending, accept/reject actions
│   │           └── useSolicitudRequest.ts   # User: submit request, track history/blocked state
│   │       └── gestion-reservas/
│   │           └── useGestionReservas.ts     # Filter state, loading, pagination, CSV export; delegates to reservasService.getReservasManagement (US-0073)
│   │       └── gestion-eventos/               # US-0118 / US-0119
│   │           ├── useGestionEventos.ts      # Loads tenant events + disciplines; client-side filters (250 ms debounced search; estado 'borrador' shows only drafts, confirmado/cancelado exclude them; disciplina matched by NAME), sorting, pagination, stats (incl. borradores); matchesCalendarFilters (all filters except periodo) — US-0131: options `excluirBorradores` and `proximosDesdeHoy` ("Próximos" from today 00:00 Bogotá) for the check-in selector
│   │           ├── useEventoWizard.ts        # Exposes nombreTenant for the preview: the stored eventos.nombre_tenant in edit mode, else useTenantName(tenantId) (US-0120). Wizard state (US-0119): client-generated eventoId, draft + serialized baseline (isDirty, beforeunload), ?paso step sync, goTo (forward validation in create mode only), derived live validation, row mutators, banner file validation, guardarBorrador / guardarFinal → uploadEventoBanner + guardarEventoCompleto, persisted ids written back by clientKey; first draft save hands the draft to the edit route via a module-level Map and router.replace(…/{id}/editar?paso=N) so the remount skips the fetch updateField('fechaHora') shifts every ticket/coupon window end by the event-date delta from the last complete date (US-0122). Duplicate mode (US-0122): `duplicarDeId` loads the source, builds the draft with draftFromEventoDuplicado, keeps the empty baseline (dirty from the start), exposes duplicadoDe / duplicadoAjustes, and copies the inherited banner on the first save (non-blocking).. US-0130: addMetodoPago / updateMetodoPago / removeMetodoPago take an EventoMetodoPagoTarget (event or ticket clientKey); adding to the event removes the same id from every ticket (replaces toggleMetodoPago / setMetodosPago) — US-0132: `desdeEntrenamientoId` mode (getEntrenamientoParaEvento → re-check esEntrenamientoFuturo → draftFromEntrenamiento, dirty from the start like a copy), `origenEntrenamiento` (cleared on the first save) and `notFoundKind` (evento | entrenamiento | entrenamiento-pasado)
│   │           ├── useEventoWizardOptions.ts # Parallel load of active disciplines, trainers, tenant events (bundle), active form templates, active payment methods (US-0119)
│   │           ├── useEventoGuardadoBanner.ts # One-shot ?guardado=creado|editado message, then strips the param (US-0119)
│   │           ├── useEventosVista.ts        # ?vista=tarjetas|lista|calendario via router.replace (fallback tarjetas)
│   │           ├── useEventosCalendar.ts     # Bogotá month state; fetches only the visible month (listEventos desde/hasta) while the calendar view is active
│   │           ├── useCambiarEstadoEvento.ts
│   │           ├── useCambiarActivoEvento.ts # Quick activar/desactivar (no modal): updateActivoEvento, pendingId guard, error for the page alert (US-0120)
│   │           └── useEliminarEvento.ts
│   │           ├── useEventoCompras.ts       # US-0121 admin "Compras": event + purchases + sold count, stats, estado/search filters, 20-row pagination — US-0131: also loads `ingresos` (resumenIngresos, null on failure) for the "Ingresaron" card
│   │           └── useValidarCompraEvento.ts # US-0121: validate / reject with isSubmitting / error / onSuccess
│   │       └── eventos/                        # US-0120 — cross-tenant discovery and event pages
│   │           ├── useEventosPublicos.ts     # listEventosPublicados({soloPublicos: false}); client-side Bogotá date range (default today → +60 days, undated always pass and sort last), chips, month nav, search (accent-insensitive), tenant/disciplina filters derived from rows, hasActiveFilters / clearFilters / isDefaultDateRange
│   │           ├── useEventoDetalle.ts       # getEventoPublicado(id, {soloPublicos}); `evento === null` after load = not found, distinct from error
│   │           └── useObtenerEntrada.ts      # "Obtener entrada" branching by auth × surface ('portal' | 'landing-listado' | 'landing-detalle'); signup/login hrefs with next=/portal/eventos/{id}?entradas=1; continuarSinRegistro; one-shot `?entradas=1` auto-open as derived state (read once on mount) + router.replace to strip it; no I/O
│   │           ├── useEventoCompra.ts        # US-0121 checkout: steps, sellable tickets, coupon, buyer data + profile prefill, event form from its snapshot, non-cash methods + proof, iniciar → uploads → finalizar with retry on the same purchase and 30-min expiry. Mounted only while the modal is open. US-0130: metodosOnline = event methods + the selected ticket's own, without cash, de-duplicated by id; changing the ticket clears a method that is no longer offered
│   │           └── useMiTicketEnEvento.ts    # US-0121: whether the signed-in user already holds a live ticket for the event
│   │       └── gestion-suscripciones/
│   │           ├── useGestionSuscripciones.ts    # Accepts activeTab (Miembros/No miembros); tab-filters rows before search/chip filters, tab-scoped stats, exposes tabCounts derived from the full unfiltered list (US-0098)
│   │           ├── useValidarPago.ts  # reject() now requires and forwards a non-empty motivo string (US-0106)
│   │           ├── useValidarSuscripcion.ts
│   │           ├── useComprobanteViewer.ts    # Signed-URL generation for comprobante_path (TTL 300s)
│   │           ├── useEditarSuscripcion.ts   # Form state + plans fetch + date validation for full-field edit; plan options include "Activo no visible" plans, labelled "(No visible)" (US-0126)
│   │           ├── useEliminarSuscripcion.ts  # Confirmation + delete action for permanent deletion
│   │           └── useCrearSuscripcion.ts    # 3-step form state for admin-initiated subscription creation
│   │       └── analitica/
│   │           └── useAnalitica.ts           # Loads one aggregate RPC response per applied date range; preserves stale data during refresh (US-0115)
│   │       └── perfil/
│   │           └── usePerfil.ts              # Optional `{ requiredFields }` option makes those fields mandatory in submit() (tipo_identificacion covers type + number); omitted keeps the nombre/apellido-only rule (US-0136)
│   │       └── planes-publicos/            # Feature hooks for the public plan catalog (US-0093)
│   │           └── usePlanesPublicos.ts    # Loads getPlanesPublicos + listDisciplinesByTenant on modal open (enabled flag); keeps active subtypes via getActiveTipos; accent/case-insensitive in-memory search across plan, subtype AND service names; optional initialSearch option seeds search's initial state (US-0101)
│   │       └── mis-suscripciones/
│   │           ├── useMisSuscripciones.ts      # Client-side filter state (subscription status + payment status + organization) with AND logic; derives tenantOptions from the loaded rows
│   │           └── useSubirComprobante.ts     # File validation (MIME, 5 MB), upload with upsert, comprobante_path update
│   │       └── mis-reservas/
│   │           └── useMisReservas.ts          # Filter state, loading, pagination, CSV export; delegates to reservasService.getMisReservas (US-0074); takes atletaId only (no tenantId), derives disciplines/tenantOptions from loaded rows, adds Organización filter (US-0097)
│   │       └── control-ingreso/                # US-0131 — door check-in
│   │           ├── useControlIngreso.ts      # Event + resumen + last result; registrar(codigo, {force}) skips the same code for 3 s and ignores reads while pending / showing a result (force = manual entry, list, retry); malformed codes resolve locally to no_encontrado; ok auto-dismisses after 4 s; vibration; revertir(ticketId); onChange refreshes the attendee list
│   │           └── useAsistentesIngreso.ts   # listAsistentesEvento + search / filter / 20-row paging, silent refrescar after writes
│   │       └── mis-entradas/
│   │           └── useMisEntradas.ts          # US-0121: vincularComprasInvitado() then listMisCompras(); Próximas/Pasadas tabs + estado filter; cancel / re-upload with per-item pending state and errors (silent reload after an action)
│   │       └── notificaciones/
│   │           └── useNotificaciones.ts       # US-0125: useNotificaciones({ limit, realtime? }) — one page of the inbox + unread count, optimistic marcarLeida / marcarTodasLeidas, page / totalPages; `realtime` (bell only: one channel per tab) prepends inserts and reloads on reconnect; reloads on tab focus; bell and page instances sync through the `notificaciones:sync` window event; never throws (error + noLeidas = 0)
│   │
│   ├── services/                         # Outbound adapters (API)
│   │   └── supabase/
│   │       ├── client.ts                 # Browser client
│   │       ├── server.ts                 # Server client + createServiceClient() (service role; `import 'server-only'`; throws when SUPABASE_SERVICE_ROLE_KEY is missing) — only src/app/api and server-only libs may use the service client
│   │       ├── middleware.ts             # Auth middleware helpers
│   │       ├── auth.ts
│   │       ├── portal/                   # Portal bounded-context services
│   │       │   ├── index.ts
│   │       │   ├── tenant.service.ts           # listVisibleTenantsForPortal(supabase, memberTenantIds): publico = true OR member; `publico` in the edit form mapping (US-0133); canUserAccessTenant also reads tenants.requiere_perfil_completo and, when on, the caller's profile → profileIncomplete / profileMissingFields without changing allowed/role; fails open on read errors (US-0136)
│   │       │   └── scenarios.service.ts
│   │       │   └── disciplines.service.ts
│   │       │   └── entrenamientos.service.ts  # entrenamientos/entrenamientos_grupo select/insert/update all carry formulario_id, formulario_obligatorio, and a formulario_plantilla:formularios_plantillas(nombre) embed for display (US-0086); getEntrenamientoParaEvento(tenantId, id) — one occurrence with disciplina / escenario / entrenador embeds, normalized, for the event pre-fill (US-0132)
│   │       │   └── reservas.service.ts   # CRUD + getCategoriasConDisponibilidad, getAtletaNivelId, per-category capacity check, getReservasReport (CSV export), getReservasManagement (cross-training query with server-side filters on reservas_reporte_view — US-0073), getMisReservas (athlete-scoped query on reservas_reporte_view filtered by atleta_id — US-0074; tenant_id filter now optional/cross-tenant, US-0097); all three report readers select('*') so they inherit US-0112's plan_nombre/plan_fecha_inicio/plan_fecha_fin columns (the plan a booking's units were deducted from plus that subscription's validity window, resolved in the view from the reserva_servicios ledger with a reservas.suscripcion_id fallback) with no code change; findServiceSubscriptionsToCharge now records suscripcionId for UNLIMITED entitlements too so the ledger attributes those bookings to a plan (the RPC still skips the deduction on unidades_restantes is null), validateBookingRestrictions (service-set based, returns matchedRow; also populates BookingRejection.servicioNombre on SERVICIO_REQUERIDO — US-0101), validateCancellationRestriction, findServiceSubscriptionsToCharge; create() and cancel() include isEntrenamientoPast guard and delegate to SECURITY DEFINER RPCs book_and_deduct_service_units / cancel_and_restore_service_units for atomic service-unit deduction/restoration; reserva_servicios ledger tracks which subscription units were deducted per booking; create() also forwards p_formulario_plantilla_id/p_formulario_respuesta and maps FORMULARIO_CAMPOS_FALTANTES (US-0087); also maps PERFIL_INCOMPLETO (US-0095); create()'s UNIDADES_AGOTADAS branch also resolves and populates BookingRejection.servicioNombre via a single-row servicios lookup (US-0101); create() always rejects a SERVICIO_REQUERIDO/UNIDADES_AGOTADAS failure and calls the RPC without deferred-purchase parameters (skip-plan path removed in US-0123/US-0124); getMyReserva/getCapacidad/getCategoriasConDisponibilidad/create()'s per-category count now exclude both 'cancelada' and 'rechazada' (US-0106)
│   │       │   └── asistencias.service.ts  # getByEntrenamiento (returns reserva_id-keyed map), upsert (onConflict: reserva_id), deleteById
│   │   │   └── planes.service.ts     # CRUD for planes + plan_tipos (getPlanTiposByPlan, createPlanTipo, updatePlanTipo, deletePlanTipo with soft-deactivate guard); getPlanTiposByPlan populates servicios[] per tipo (US-0062); planes rows carry es_publico on read/insert/update and getPlanesPublicos(tenantId) returns the public+active catalog readable by non-members (US-0093); rows carry `visible_atletas`, create/update force `es_publico = false` on a hidden plan, `getPlanesPublicos`/`getPlanesMiembro` exclude hidden plans, 23514 → PlanServiceError 'hidden_public' (US-0126)
│   │   │   └── servicios.service.ts  # CRUD for servicios catalog + syncPlanTipoServicios (US-0062)
│   │   │   └── formularios.service.ts  # CRUD for formularios_plantillas + formulario_plantilla_esquema "secciones" (getPlantillaConSecciones, getSeccionesByPlantilla, createSeccion/updateSeccion — write seccion_tipo/seccion_descripcion and null out the other branch's campo_* columns —, deleteSeccion, reorderSecciones); US-0084/US-0085; getRespuestaById reads a submitted formulario_respuestas row, RLS-gated to owning athlete or tenant staff (US-0087); updatePlantilla accepts perfil_campos_requeridos (US-0095); getRespuestasByEntrenamiento select/mapping includes perfil_snapshot (US-0096); createPlantilla auto-inserts the 4 default Hero header rows via the exported defaultHeaderSecciones() helper (also used by useFormularioEditor's lazy header backfill for pre-US-0108 templates); saveEsquemaBatch(plantillaId, { toCreate, toUpdate, toDeleteIds, orderedClientIds }) sequences create→update→delete→reorder for useFormularioEditor's saveAll() (US-0108)
│   │       │   └── suscripciones.service.ts  # createSuscripcion (calls populate_suscripcion_servicios RPC when plan_tipo_id is set — US-0063; maps a 42501 RLS rejection to SuscripcionServiceError 'plan_unavailable' — US-0093), hasPendingSuscripcion, getSuscripcionServicios (returns SuscripcionServicio[] for a given suscripcion_id)
│   │       │   └── pagos.service.ts  # updateComprobantePath resets estado to 'pendiente' and clears motivo_rechazo on resubmission, so a rejected payment re-enters review (US-0106)
│   │       │   └── equipo.service.ts
│   │       │   └── solicitudes.service.ts      # CRUD for miembros_tenant_solicitudes (access requests); createSolicitud rejects private organizations with code `private_org` (US-0133; also enforced by the solicitudes_insert_own RLS policy); Guard 3 uses the shared perfil-completo rule (US-0136)
│   │       │   └── invitaciones.service.ts     # Admin: v_invitaciones_tenant_admin select, cancelar RPC, fetch to /api routes; recipient: get_mis_invitaciones_pendientes, get_invitacion_para_aceptar, activar_invitacion_tenant, activar_alta_administrada (US-0114)
│   │       │   └── nivel-disciplina.service.ts         # CRUD for nivel_disciplina table
│   │       │   └── usuario-nivel-disciplina.service.ts # Upsert for usuario_nivel_disciplina
│   │       │   └── entrenamiento-categorias.service.ts # Create/sync/delete for entrenamiento_categorias
│   │       │   └── gestion-suscripciones.service.ts  # Joins plan_tipos for plan_tipo_nombre / plan_tipo_vigencia_dias; crearSuscripcionAdmin calls populate_suscripcion_servicios RPC when plan_tipo_id is set (US-0063); throws GestionSuscripcionesServiceError 'populate_servicios_failed' on RPC failure; fetchSuscripcionesAdmin also queries miembros_tenant.usuario_id for the tenant (parallel query) and sets es_miembro per row — no FK/embed exists between suscripciones and miembros_tenant (US-0098); updatePagoEstado's reject path stores motivo_rechazo and calls RPC reject_pending_reservas_for_suscripcion; updateSuscripcionEstado's approve path calls RPC confirm_pending_reservas_for_suscripcion, and its cancel path calls reject_pending_reservas_for_suscripcion when the cancelled subscription was still pendiente (US-0106)
│   │       │   └── eventos.service.ts  # eventosService: listEventos(tenantId, {desde?, hasta?}) — no embeds since US-0119: disciplina/escenario/entrenadores are snapshots on the row (trainer names joined ", "); getEventoById; getEventoCompleto (event + evento_entradas + evento_entrada_cupones, sorted); guardarEventoCompleto (RPC guardar_evento_completo, draft or final, returns the client_key → id map); updateEstadoEvento; updateActivoEvento (quick activar/desactivar, US-0120); deleteEvento. createEvento/updateEvento were removed in US-0119. US-0120 adds the only cross-tenant reads: listEventosPublicados({soloPublicos}) and getEventoPublicado(id, {soloPublicos}) — explicit filters activo ∧ ¬borrador ∧ estado='confirmado' ∧ (fecha_hora ≥ now ∨ null) (+ publico on landing surfaces), because RLS alone lets admins/trainers read their drafts; explicit projections (include nombre_tenant and metodos_pago, never formulario_id/creado_por/omitir_confirmacion_compra); limit(500); malformed ids → null without a request; TENANT_INVALIDO → invalid_reference. Zero-row writes and PGRST116 map to 'forbidden'; RPC exception codes (METODO_PAGO_REQUERIDO, …) and 23505 constraint names map to specific Spanish messages / codes not_found, duplicate_entrada, duplicate_cupon (US-0118 / US-0119) — US-0121: the public list projection includes `cancelacion_antelacion_horas`; deleteEvento maps 23503 → `has_purchases`
│   │       │   └── eventos-compras.service.ts  # US-0121 eventoComprasService: listEntradasVendibles, listNombresEventosBundle, getFormularioEvento (vigente evento_formularios snapshot, readable by guests), validarCupon, iniciarCompra → subirArchivoCompra → finalizarCompra, vincularComprasInvitado, listMisCompras / getMiTicketEnEvento (always filtered by the caller's id — RLS alone would also return staff rows), reenviarComprobante, cancelarCompra, listComprasEvento (embeds answers + their snapshot version), contarVendidas, validarCompra, getArchivoUrl (300 s); mapCompraError — listEntradasVendibles also returns each ticket's metodosPago (US-0130) — US-0131: registrarIngreso (normalizes the code first), revertirIngreso, resumenIngresos, listAsistentesEvento (activa tickets + compra.entrada_nombre, RLS staff); `ingreso_at` → `ingresoAt` in listComprasEvento / listMisCompras ticket embeds
│   │       │   └── notificaciones.service.ts  # US-0125 notificacionesService (browser client): getUsuarioId, listar({limit, offset}) → {items, total}, contarNoLeidas, marcarLeida / marcarTodasLeidas (RPCs), suscribir(usuarioId, onInsert, onReconnect) → unsubscribe (Realtime postgres_changes INSERT on notificaciones, filter usuario_id) — the only Realtime usage in src/
│   │       │   └── analitica.service.ts  # Browser RPC adapter for get_tenant_bi_dashboard only; maps 42501/22007 without exposing bi schema facts (US-0115)
│   │       │                             #   The RPC aggregates private `bi` fact views (no grants to anon/authenticated):
│   │       │                             #   fct_pagos, fct_entrenamientos, fct_reservas, fct_asistencia, fct_suscripciones, and fct_miembros
│   │       │                             #   (one row per membership: nombre_completo, rol, es_atleta, estado — names and team figures). The RPC reads ONLY bi.* facts
│   │       │                             #   (one row per subscription: plan/plan type, Bogotá sale date, es_vendida, es_activa = estado 'activa',
│   │       │                             #   per-subscription payment summary). All subscription KPIs MUST read fct_suscripciones (bi-fct-suscripciones)
│   │       │   └── perfil.service.ts
│   │       │   └── metodos-pago.service.ts          # CRUD for tenant_metodos_pago (incl. qr_url, US-0128)
│   │       │   └── reglas-suspension.service.ts      # CRUD for tenant_reglas_suspension
│   │       │   └── inicio.service.ts      # Server-side cross-tenant dashboard queries
│   │       │   └── storage.service.ts     # uploadOrgLogo, uploadOrgBanner, uploadMetodoPagoQr (orgs/{tenantId}/metodos-pago/{metodoId}/qr-{ts}.{ext}, new object per upload, US-0128), uploadPaymentProof (upsert option; receipts are writable by an active member OR any subscription holder of the tenant, so non-member buyers of public plans can submit proof — US-0093), getSignedUrl — wraps Supabase Storage API for org-assets bucket; uploadFormularioRespuestaImage uploads a "imagen"-type form-response file under the booking athlete's own users/{atletaId}/formularios/ path (US-0087); readable by any authenticated user via the public_training_banner_read storage policy (US-0089); uploadEventoBanner uploads to orgs/{tenantId}/eventos/{eventoId}.{ext} (upsert, 1-year signed URL stored in eventos.banner_url), readable via event_banner_read (US-0119); copyEventoBanner (US-0122): downloads a duplicated event's inherited banner and re-uploads it under the new event's path
│   │       │   └── mis-suscripciones.service.ts  # fetchMisSuscripciones — the user's subscriptions across ALL tenants with tenant + plan + pago + suscripcion_servicios joins, scoped by atleta_id only (RLS enforces ownership); replaces the tenant-scoped fetch (US-0093)
│   │       └── portal.ts                 # Transitional/legacy entrypoint
│   │
│   ├── types/                            # Domain & contracts
│   │   ├── auth.types.ts
│   │   ├── portal.types.ts               # Shared portal contracts (INICIO_MENU_ITEM, PUBLIC_TRAININGS_MENU_ITEM, resolvePortalMenu, etc.) — PUBLIC_TRAININGS_MENU_ITEM appended only to the !tenantId branch (US-0089); EVENTOS_MENU_ITEM ("Eventos" → /portal/eventos, icon celebration) right after it (US-0120) — the no-tenant menu ends with "Mis Reservas" then "Mis Entradas" (`confirmation_number`, /portal/mis-entradas, US-0121) — "Eventos Check-in" (`qr_code_scanner`, path `control-ingreso`) after "Eventos" for administrador and after "Reservas" for entrenador (US-0131)
│   │   └── portal/
│   │       ├── tenant.types.ts            # TenantIdentityPayload (bannerUrl), TenantEditFormValues (banner_url), TenantEditPayload (banner_url); `publico` on both edit types and PortalTenantListItem.isPublic (US-0133); TenantAccessDecision.profileIncomplete / profileMissingFields (US-0136)
│   │       └── scenarios.types.ts
│   │       └── disciplines.types.ts
│   │       └── entrenamientos.types.ts   # TrainingFormularioTipo (ninguno/externo/interno), TrainingFormularioFormState, TrainingGroup/TrainingInstance carry formulario_id/formulario_obligatorio/formulario_plantilla (US-0086); EntrenamientoParaEvento (US-0132)
│   │       └── reservas.types.ts         # ReservaView, CreateReservaInput, CategoriaDisponibilidad, ReservaReportRow (flat view type for CSV export, includes atleta_id), ReservasManagementFilters (server-side filter input — US-0073), MisReservasFilters (athlete-scoped filter input — US-0074; tenantId optional/cross-tenant, US-0097), ReservaReportRow.tenant_nombre (US-0097); Reserva.formulario_respuesta_id, CreateReservaInput.formulario_plantilla_id/formulario_respuesta (US-0087); ReservaEstado adds 'rechazada'; Reserva.motivo_rechazo, ReservaReportRow.motivo_rechazo; CreateReservaInput.permitir_pendiente_sin_plan/plan_pendiente_suscripcion_id (US-0106) — US-0110 replaces plan_pendiente_suscripcion_id with plan_pendiente_compra ({ plan_id, plan_tipo_id, comentarios, metodo_pago_id, monto }), i.e. the purchase to CREATE alongside the booking rather than a reference to one already created
│   │       └── asistencias.types.ts      # Asistencia, AsistenciaFormValues, UpsertAsistenciaInput
│   │       └── planes.types.ts           # PlanModalidad (renamed from PlanTipo union), PlanTipo (DB entity), PlanTipoFormValues, CreatePlanTipoInput, UpdatePlanTipoInput; PlanTipo.servicios? added (US-0062); Plan.es_publico, CreatePlanInput/UpdatePlanInput.esPublico, PlanFormValues.es_publico (US-0093); `Plan.visible_atletas`, `PlanEstado` ('activo' | 'activo_no_visible' | 'inactivo'), `getPlanEstado`, `PLAN_ESTADO_LABELS`, `PlanTableItem.estado` (US-0126)
│   │       └── planes-publicos.types.ts   # PlanPublicoItem (extends PlanWithDisciplinas with beneficiosList/disciplinaNames/tipos), PlanPublicoTipoItem, PlanPublicoServicioItem, UsePlanesPublicosResult (US-0093)
│   │       └── servicios.types.ts        # Servicio, CreateServicioInput, UpdateServicioInput, ServicioFormValues, ServicioServiceError, PlanTipoServicio, PlanTipoServicioRow, SyncPlanTipoServiciosInput (US-0062)
│   │       └── formularios.types.ts      # FormularioPlantilla, FormularioSeccion (seccion_tipo: titulo|subtitulo|texto|datos + seccion_descripcion; campo_* nullable), FormularioTipoCampo union, FormularioPlantillaConSecciones, FormularioPlantillaListItem (seccionesCount), Create/UpdateSeccionInput, form-values types, FormularioServiceError (US-0084/US-0085); FormularioRespuesta (id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta jsonb — US-0087); FormularioPerfilCampo union + FORMULARIO_PERFIL_CAMPOS catalog (9 usuarios/perfil_deportivo fields), FormularioPlantilla.perfil_campos_requeridos, UpdatePlantillaInput.perfil_campos_requeridos (US-0095); FormularioRespuesta.perfil_snapshot — requested profile values frozen at submission time, survives later profile edits (US-0096); seccion_tipo extended with encabezado_sobretitulo/encabezado_titulo/encabezado_subtitulo/encabezado_badges/seccion/separador, HEADER_SECCION_TIPOS (the 4 fixed header types) + FORMULARIO_HEADER_BADGES_MAX; campo_tipo extended with checkbox/seleccion, FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES (lista + seleccion); FormularioSeccion.columna_ancho ('completo'|'mitad') and .seccion_subtitulo; FormularioPlantillaDraft — the in-memory metadata shape held by useFormularioEditor (US-0108)
│   │       └── suscripciones.types.ts  # Suscripcion, SuscripcionInsert, SuscripcionServicio (id, suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes, created_at — US-0063), SuscripcionServiceError with code 'plan_unavailable' (US-0093); PendingPlanPurchaseDraft — a plan purchase filled in but deliberately NOT yet persisted, carried in memory through the skip-plan-confirmation booking flow and written only when the booking is submitted (US-0110)
│   │       └── pagos.types.ts
│   │       └── metodos-pago.types.ts      # MetodoPago, CreateMetodoPagoInput, UpdateMetodoPagoInput; METODO_PAGO_TIPO_LABELS (US-0120); qr_url, MetodoPagoQrChange, METODO_PAGO_QR_MIME_TYPES / METODO_PAGO_QR_MAX_BYTES (US-0128)
│   │       └── reglas-suspension.types.ts # ReglaSuspension, ReglaSuspensionCreatePayload, ReglaSuspensionUpdatePayload, ReglaSuspensionFormValues
│   │       └── equipo.types.ts
│   │       └── solicitudes.types.ts            # SolicitudRow, CreateSolicitudInput, SolicitudesServiceError
│   │       └── invitaciones.types.ts           # InvitacionEstado, InvitacionRow, AgregarMiembroInput/Modo, AltaAdministradaResultado, InvitacionesServiceError codes (US-0114)
│   │       └── nivel-disciplina.types.ts      # NivelDisciplina, form values, service error types
│   │       └── entrenamiento-categorias.types.ts # EntrenamientoCategoria, input, view models
│   │       └── analitica.types.ts       # Aggregate BI dashboard contract, date filters and typed RPC errors (US-0115)
│   │       └── entrenamiento-restricciones.types.ts # EntrenamientoRestriccion (with servicio_1_id…servicio_4_id, descripcion; plan_id/disciplina_id kept @deprecated), restriction inputs, BookingRejectionCode (SERVICIO_REQUERIDO, UNIDADES_AGOTADAS, PERFIL_INCOMPLETO — US-0095), BookingResult; BookingRejection.servicioNombre (optional, SERVICIO_REQUERIDO/UNIDADES_AGOTADAS only) feeds the pre-filtered plan catalog (US-0101); BookingRejection.ofrecerPlan — set by reservasService.create on "no plan / no units" rejections, drives the plan offer in ReservaRechazoModal (US-0127)
│   │       └── eventos.types.ts  # CronogramaItem / IncluyeItem / PrecioItem (owned here since US-0123), Evento (DB row; US-0119 snapshots EventoEscenarioSnapshot / EventoEntrenadorSnapshot[] / EventoMetodoPagoSnapshot[], borrador, formulario_id), EventoEntrada / EventoEntradaCupon / EventoCompleto, GuardarEventoPayload / GuardarEventoResult, wizard draft types (EventoDraft / EventoEntradaDraft / EventoCuponDraft with clientKey + raw-string amounts and Bogotá datetime-local strings), EVENTO_WIZARD_STEPS, EventoListItem (+ borrador, disciplinaNombre nullable), EventoEstado, EventosVista, EventosPeriodo, EventosClientFilters (estado incl. 'borrador', disciplina by name), EventosStats (+ borradores), EventoServiceError; US-0120 adds Evento.nombre_tenant, EventoPublicoListItem (incl. nombreTenant, escenario, entrenadores, metodosPago) / EventoPublicoDetalle, EventoEntradasModo, EventoEntradaSeleccion (purchase seam), EventosPublicosDateChip; reuses CronogramaItem/IncluyeItem/PrecioItem from entrenamientos-publicos.types (US-0118 / US-0119) — US-0121: `cancelacionAntelacionHoras` lives on EventoPublicoListItem (the checkout opens from cards); EventoServiceErrorCode gains `has_purchases`; US-0130: EventoMetodoPagoSnapshot.origen ('tenant' | 'evento'), metodos_pago on EventoEntrada / the RPC ticket payload, metodosPago on EventoEntradaDraft, EventoMetodoPagoTarget; EventoDesdeEntrenamientoAjustes (US-0132)
│   │       └── eventos-compras.types.ts  # US-0121: EventoCompraEstado (+ labels), EventoTicketEstado, EntradaVendible, CuponValidacion, EventoFormularioSnapshot / EventoFormularioRespuesta, CompradorInput, IniciarCompraInput, CompraResultado, MiCompra, CompraAdminItem, TicketPdfData, EventoCompraServiceError — US-0131: IngresoResultadoCodigo / IngresoResultado / ResumenIngresos / AsistenteIngreso / AsistentesIngresoFiltro; `ingresoAt` on MiCompraTicket and CompraAdminItem tickets
│   │       └── notificaciones.types.ts  # US-0125: Notificacion, NotificacionesListado; server side: NotificacionOutboxRow, NotificacionEmail ({asunto, html, texto, adjuntos}), NotificacionAdjunto, NotificacionHandler, DespachoResultado
│   │       └── gestion-suscripciones.types.ts  # SuscripcionAdminRow includes plan_tipo_id, plan_tipo_nombre, plan_tipo_vigencia_dias; SuscripcionAdminRow.es_miembro (computed from miembros_tenant existence, not stored) and SuscripcionTab ('miembros' | 'no_miembros') (US-0098)
│   │       └── mis-suscripciones.types.ts  # MiSuscripcionRow (incl. tenant_id + tenant_nombre — US-0093), MiPagoRow — user-facing subscription + payment view types
│   │       └── perfil.types.ts
│   │       └── inicio.types.ts            # Dashboard view model interfaces
│   │
│   └── lib/                              # Pure utilities
│       ├── utils.ts
│       ├── csv.ts                           # RFC 4180 CSV generation (toCsvString, downloadTextFile) — used by ReservasPanel CSV export
│       ├── slugify.ts                        # slugify(value): snake_case key (diacritics stripped, leading digits trimmed) — used to auto-compute campo_nombre for "Datos" sections (US-0085)
│       ├── validators.ts
│       ├── notificaciones/                  # server-only email side of the notifications module (US-0125)
│       │   ├── despachador.ts               # despacharNotificaciones(limite = 20): reclamar_notificaciones_outbox → handler → enviarEmail → resolver_notificacion_outbox, one row at a time, each resolved on its own; error codes `handler_not_found` / `skipped` / `resend_*`; one audit line per row, never an address
│       │   ├── registro.ts                  # resolverHandler(modulo, tipo) — handlers keyed `modulo.tipo`; a new module registers its handlers here
│       │   ├── resend.ts                    # enviarEmail({ para, asunto, html, texto, adjuntos, idempotencyKey }) through Resend (outbox id as Idempotency-Key); EnvioEmailError(code); `resend_not_configured` without RESEND_API_KEY / EMAIL_FROM; outside production, `EMAIL_DEV_MAILPIT_URL` sends to the local Mailpit HTTP API instead (nothing leaves the machine)
│       │   ├── plantillas/layout.ts         # escapeHtml, renderLayout({ titulo, cuerpoHtml, cta? }), renderFilas, renderParrafo — shared inline-styled layout
│       │   └── modulos/eventos.ts           # eventos.compra_recibida / compra_confirmada (ticket PDF attached) / compra_rechazada / compra_cancelada / compra_nueva_admin; buyer handlers read the purchase at send time through the `_compra_resultado` RPC (service role)
│       └── portal/
│           ├── password-generator.ts        # server-only: generateTemporaryPassword() — 16 chars, crypto.randomInt, every character class (US-0114)
│           ├── audit-log.ts                 # server-only: logAuditEvent() — one JSON line with allow-listed fields only; never emails, passwords, tokens, or raw errors (US-0114) — US-0125: `notificacion_enviada` / `notificacion_fallida`; `tenant_id` and `actor_id` nullable (system jobs)
│           ├── privileged-route.ts          # server-only: route helpers — body parsing, no-store responses, APP_URL-based invite redirectTo, email-exists detection (US-0114)
│           ├── invitaciones-delivery.ts     # server-only: deliverInvitation() — inviteUserByEmail + outcome recording shared by create/resend routes (US-0114)
│           ├── invitaciones-errors.ts       # Client-safe: onboarding RPC SQLSTATE/message → HTTP status + error code, Spanish user messages (US-0114)
│           ├── tenant-access.cache.ts       # React cache()-wrapped getCachedTenantAccess — deduplicates canUserAccessTenant DB call across nested tenant layouts
│           ├── perfil-completo.ts           # Client-safe single definition of the tenant "complete profile" rule: PERFIL_COMPLETO_SELECT, getPerfilCamposFaltantes() (FormularioPerfilCampo keys), isPerfilCompleto(); used by canUserAccessTenant and createSolicitud Guard 3 (US-0136)
│           ├── bogota-date.ts               # bogotaDayStartIso/bogotaDayEndIso — converts a "YYYY-MM-DD" Bogotá calendar day into -05:00-offset ISO boundaries for timestamptz range queries (US-0075)
│           ├── disciplina-visual.ts         # getDisciplinaVisual(nombre) → { icon, colorClass } — accent/case-insensitive name matching to the design's discipline colours, `sports` + cyan fallback (US-0116)
│           ├── eventos.utils.ts             # Bogotá date keys/month ranges (fixed -05:00, no DST) and event formatters (fecha, hora, duración, cupo, precio) (US-0118); datetime-local ⇄ ISO helpers, formatCop, aplicarDescuento, formatDescuento (US-0119)
│           ├── eventos-wizard.utils.ts      # Pure wizard logic (US-0119): empty/draftFromEventoCompleto/draftToPayload, preview adapters toDetallePreviewItem (→ EventoPublicoDetalle with nombreTenant since US-0120) / toCardPreviewItem / previewPrecio, validateEventoDraft (mode 'borrador' = name + format only, 'final' = + completeness; same rules as the RPC), ERROR_KEYS / stepOfErrorKey, limits; draftFromEventoDuplicado(evento, now) → "Copia de …" name, new ticket/coupon identities, past event date cleared (returned as fechaOriginal); shiftWithEventoFecha moves a window end by the event-date delta (US-0122); toEscenarioSnapshot + numberToInput exported (US-0132)
│           ├── entrenamiento-evento.utils.ts # US-0132: esEntrenamientoFuturo(fechaHora, now) (only future trainings can be published) and draftFromEntrenamiento(entrenamiento) → { draft, ajustes, fechaOriginal } (description > 300 → "Descripción larga", external form dropped, tickets / payment methods / banner empty, capacity copied but not shared)
│           ├── eventos-publicos.utils.ts    # US-0120: Bogotá date-key arithmetic, computeEventosChipRange (Monday-first week), matchesEventoSearch (NFD accent-insensitive), resolveEventosOrigin (same-origin `from` only), portal/landing detail href builders, toHttpUrl (http/https only), EVENTOS_DEFAULT_WINDOW_DAYS
│           ├── eventos-compra.utils.ts      # US-0121: entradaVendible / ventaCerradaPorAntelacion / puedeCancelarCompra (same rule as the RPC, UI only), 30-min hold check, email + birth-date validators, proof/image validation (types, 5 MB), slugify, MiCompra / CompraResultado → TicketPdfData mappers — US-0131: puedeCancelarCompra also returns false when `algunTicketUsado`
│           ├── eventos-ingreso.utils.ts     # US-0131: normalizarCodigoTicket ('ev-abcd2345' / 'ABCD2345' → 'EV-ABCD2345', mirrors the SQL helper), esCodigoTicketValido (^EV-[A-HJ-NP-Z2-9]{8}$), ingresoResultadoMeta (tone / icon / title / detail / permiteDeshacer), formatIngresoHora / formatIngresoFechaHora (Bogotá), resultadoNoEncontrado
│           ├── control-ingreso.guard.ts     # server-only: requireCheckinStaff(tenantId) — (shared) also admits `usuario`; only administrador / entrenador pass (US-0131)
│           ├── eventos-ticket-pdf.ts        # US-0121: politicaCancelacionTexto(horas) + descargarEntradasPdf(tickets, fileName) — client-side A5 PDF, one page per ticket, jspdf + qrcode loaded by dynamic import; QR only for `activa`, "PENDIENTE DE VALIDACIÓN" banner for `pendiente` — US-0125: construirEntradasPdf(tickets) → jsPDF | null holds the drawing (no DOM API) and is shared with the emailed attachment; descargarEntradasPdf calls it and saves
│           ├── formulario-secciones-grouping.ts  # buildFormularioRenderPlan() — groups a flat, order-derived FormularioSeccion[] into 'seccion' cards (positional, no parent FK) + 'mitad'-width pairing; shared by FormularioSeccionesBuilder, FormularioSeccionesGrouped (preview), and FormularioRespuestaModal (live booking) so all three render identically (US-0108)
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
├── supabase/templates/invite.html  # Invite email template → {{ .SiteURL }}/auth/confirm?token_hash=…&type=invite&redirect_to=… (enabled in supabase/config.toml; must also be set in the production dashboard) (US-0114)
├── .env.local                   # Environment variables (not committed)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.mjs            # ESLint configuration
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration — colors.grit.*, font-grit-title/body, rounded-grit-{xs..2xl}; legacy lg/xl radius overrides kept for landing/auth only (US-0116)
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
| `book_and_deduct_service_units(...)` | Atomic booking + multi-service unit deduction via JSONB deductions array; optionally validates required "datos" fields and inserts a linked `formulario_respuestas` row atomically when `p_formulario_plantilla_id`/`p_formulario_respuesta` are provided (US-0087); also validates the attached template's `perfil_campos_requeridos` against `p_atleta_id`'s `usuarios`/`perfil_deportivo` profile before any write, raising `PERFIL_INCOMPLETO` when a requested field is missing (US-0095); freezes the validated profile values into `formulario_respuestas.perfil_snapshot` at insert time, so later profile edits don't retroactively change a historical response (US-0096); always inserts the reserva as `confirmada`; `p_suscripcion_id` optionally links it to a subscription. The deferred plan purchase parameters (`p_permitir_pendiente`, `p_plan_purchase`, US-0106/US-0110) were removed in US-0124 — bookings already `pendiente` are still resolved by `confirm_pending_reservas_for_suscripcion` / `reject_pending_reservas_for_suscripcion` | Called via RPC from `reservas.service.ts` |
| `cancel_and_restore_service_units(...)` | Atomic cancellation + service unit restoration from `reserva_servicios` ledger | Called via RPC from `reservas.service.ts` |
| `get_admin_tenants_for_authenticated_user()` / `get_member_tenants_for_authenticated_user()` / `get_trainer_or_admin_tenants_for_authenticated_user()` | Tenant-capability helpers; as of US-0114 all three EXCLUDE `pendiente_activacion` memberships, and the policies/functions that previously joined `miembros_tenant` directly for the caller (entrenamientos*, nivel_disciplina, usuario_nivel_disciplina, reservas select/insert, can_read_plan, can_subscribe_to_plan) go through them | RLS policy expressions |
| `cambiar_estado_miembro(...)` | Admin check via `get_admin_tenants_for_authenticated_user()`; rejects any move INTO `pendiente_activacion` and allows only `activo`/`inactivo` OUT of it (22023); pending → activo also marks the linked alta `activada` (US-0114) | RPC from `equipo.service.ts` |
| `ensure_admin_tenant_row()` | Creates the default `admin_tenants` entitlements row for every new tenant (US-0114) | `after insert` trigger on `tenants` |
| `crear_invitacion_tenant(p_tenant_id, p_email, p_rol_id, p_nombre, p_nota)` | Admin + assignable-role check, email normalization, rate limits (30/h per admin, 200/day per tenant), idempotent on the active (tenant, email) invitation — re-submitting counts as a resend (US-0114) | `POST /api/portal/orgs/[tenant_id]/invitaciones` (user session) |
| `reenviar_invitacion_tenant(p_invitacion_id)` / `cancelar_invitacion_tenant(p_invitacion_id)` | Resend: 3/h per invitation, renews expiry, revives `expirada`; cancel: idempotent, 22023 from terminal states (US-0114) | Resend route (user session) / `invitaciones.service.ts` |
| `registrar_envio_invitacion(p_invitacion_id, p_canal)` / `registrar_fallo_invitacion(p_invitacion_id, p_codigo)` | Record invite delivery (`email` → `enviada`; `in_app` keeps `pendiente`) or failure; **service_role only** (US-0114) | Invite routes (service client) |
| `get_mis_invitaciones_pendientes()` / `get_invitacion_para_aceptar(p_invitacion_id)` | Invitations addressed to the caller's CONFIRMED email; P0002 for anything else (US-0114) | `invitaciones.service.ts` |
| `activar_invitacion_tenant(p_invitacion_id)` | Row lock; EXPIRED/CANCELLED/EMAIL_MISMATCH/ALREADY_ACCEPTED checks; conflict-safe `activo` membership that never changes an existing role; idempotent retry (US-0114) | `invitaciones.service.ts` |
| `reservar_alta_administrada(...)` / `completar_alta_administrada(p_alta_id, p_usuario_id)` / `registrar_fallo_alta(p_alta_id, p_codigo)` | Provisioning saga: reserve (admin, role, `admin_tenants` flag → FEATURE_DISABLED, 20/day, abandoned reservations >10 min released) → complete (`pendiente_activacion` membership) / record failure; complete + failure are **service_role only** (US-0114) | `POST /api/portal/orgs/[tenant_id]/miembros/aprovisionar` |
| `activar_alta_administrada(p_tenant_id)` | Caller's own `pendiente_activacion` membership → `activo`, alta `activada`, novedad `activacion_cuenta` (US-0114) | `invitaciones.service.ts` after `updatePassword` |
| `expirar_invitaciones_tenant()` | Marks active invitations past `expires_at` as `expirada`; provisioned accounts never expire (US-0114) | pg_cron |
| `confirm_pending_reservas_for_suscripcion(p_suscripcion_id)` | On subscription approval, confirms every linked `pendiente` reserva it can (resolves the training's matching service requirement, deducts the unit, logs to `reserva_servicios`), leaving any it can't satisfy in `pendiente` rather than failing the approval (US-0106) | Called via RPC from `gestion-suscripciones.service.ts` after a suscripcion is approved |
| `reject_pending_reservas_for_suscripcion(p_suscripcion_id, p_motivo)` | Moves every `reservas` row linked to the subscription and still `pendiente` to `rechazada`, copying the admin's rejection reason into `motivo_rechazo` (US-0106) | Called via RPC from `gestion-suscripciones.service.ts` on payment rejection or on cancelling a still-`pendiente` subscription |
| `populate_suscripcion_servicios(p_suscripcion_id, p_plan_tipo_id)` | Inserts `suscripcion_servicios` rows from `plan_tipos_servicios` at subscription creation time; idempotent via `ON CONFLICT DO NOTHING` (US-0063) | Called via RPC from `suscripciones.service.ts` and `gestion-suscripciones.service.ts` |
| `get_member_tenants_for_authenticated_user()` | Tenant ids where the caller holds any `miembros_tenant` row, any role/state (US-0093) | RLS policy expressions |
| `can_read_plan(p_plan_id)` | Plan is public AND active, OR caller is a member of its tenant, OR caller already holds a subscription to it — the last branch keeps a buyer's own rows readable after an un-publish (US-0093) As of US-0126 the plain-membership branch (and the public branch) also require `visible_atletas`; trainers/administrators of the tenant read every plan, so an "Activo no visible" plan is hidden from athlete members and non-members only | SELECT policies on `planes`, `plan_tipos`, `planes_disciplina` |
| `can_read_plan_tipo(p_plan_tipo_id)` | Delegates to `can_read_plan` through the subtype's parent plan (US-0093) | SELECT policy on `plan_tipos_servicios` |
| `can_read_servicio(p_servicio_id)` | Caller is a member of the service's tenant, OR the service is granted by a public active plan's subtype, OR the caller already holds units of it (US-0093) | SELECT policy on `servicios` |
| `can_subscribe_to_plan(p_plan_id, p_tenant_id)` | Plan is `activo` and either public or owned by a tenant the caller belongs to (US-0093); also requires `visible_atletas`, so only `suscripciones_insert_admin` can create a subscription to an "Activo no visible" plan (US-0126) | `suscripciones_insert_own` WITH CHECK |
| `evaluar_suspensiones_cron()` | Evaluates active members against assigned suspension rules; suspends those exceeding absence thresholds, logs `miembros_tenant_novedades` (tipo `inasistencias_acumuladas`), and marks processed absences (`validacion_suspension = true`) | pg_cron daily schedule |
| `reactivar_suspensiones_expiradas()` | Reactivates members whose temporary suspension (`duracion > 0`) has elapsed; logs novedad (tipo `reactivacion`) | pg_cron daily schedule |

### pg_cron Scheduled Jobs

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `evaluar-suspensiones-diarias` | `0 6 * * *` (06:00 UTC / 01:00 AM COT) | Runs `reactivar_suspensiones_expiradas()` first, then `evaluar_suspensiones_cron()` |
| `expirar-invitaciones-tenant` | `15 6 * * *` (06:15 UTC / 01:15 AM COT) | Runs `expirar_invitaciones_tenant()` (US-0114); acceptance RPCs also check `expires_at`, so correctness does not depend on the job |

### Team events tables (`eventos`, `evento_entradas`, `evento_entrada_cupones` — US-0118 / US-0119)

`eventos` is standalone (no FK to `entrenamientos`); it carries `cronograma`/`incluye` jsonb arrays (modeled on the former `entrenamientos_publicos` table, dropped in US-0124). `estado` ∈ (`confirmado`, `cancelado`); `tenant_id` cascades. Since US-0119 the column names are kept but hold **snapshots**, not FKs:
- `disciplina_id text` — the discipline NAME (null only while `borrador`; `eventos_publicado_completo_ck`).
- `escenario_id jsonb` — `{id,nombre,tipo,ubicacion,direccion,coordenadas,capacidad,image_url}` or null.
- `entrenador_id jsonb` — `[{id,nombre,experiencia}]`.
- `metodos_pago jsonb` — `[{id,nombre,tipo,valor,url,comentarios,qr_url?,origen?}]`: methods valid for **all tickets**, copied from `tenant_metodos_pago` (`origen` absent or `'tenant'`) or created only for the event in the wizard (`origen = 'evento'`, client-generated id, never a row of `tenant_metodos_pago`) (US-0130).
- `formulario_id uuid` — FK to `formularios_plantillas` (`on delete set null`), the access form for ticket buyers.
- `borrador boolean` — work in progress: name-only is enough; hidden from anon and plain members by RLS; one-way (a published event cannot return to draft).
- `precio jsonb` — **derived** by the RPC from the complete tickets; never written by the UI.
- `nombre_tenant varchar(150) not null` — tenant name **snapshot** set by `guardar_evento_completo` on create only (from `tenants`, never from the payload), never updated on edit or tenant rename; lets the public event pages read only `eventos` (US-0120, migration `20260930120000_eventos_nombre_tenant.sql`). `metodos_pago` is readable there but only shown in the tickets modal (the event page leaves payment methods to the purchase flow).

`evento_entradas` (ticket types: `sencilla` | `multiple` + `eventos_id_bundle` of same-tenant event ids, `valor` COP, sale window, `orden`) and `evento_entrada_cupones` (percentage `descuento` (0,100], uppercase `cupon` unique per event, validity window) keep format checks in the table; `nombre`/`valor`/`cupon`/`descuento` are nullable because drafts may be incomplete — completeness is enforced by `guardar_evento_completo` on final save. Deleting an event cascades to tickets and coupons. `evento_entradas.metodos_pago jsonb not null default '[]'` (US-0130, migration `20261007120000_evento_entradas_metodos_pago.sql`) holds payment method snapshots valid only for that ticket, in the same format as `eventos.metodos_pago`; `guardar_evento_completo` validates their shape (`METODOS_PAGO_INVALIDOS`), stores them with the ticket and, on final save, requires every paid ticket to have a method at event level or of its own (`METODO_PAGO_REQUERIDO`).

| Actor | `eventos` SELECT | `evento_entradas` SELECT | `evento_entrada_cupones` | Writes |
|---|---|---|---|---|
| `anon` | `publico and activo and not borrador` | tickets of readable events | no grant | — |
| authenticated non-member | same as anon | tickets of readable events | 0 rows | — |
| member (non-pending) | above + `activo and not borrador` rows of own tenants | tickets of readable events | 0 rows | — |
| admin / trainer | all rows of their tenants (incl. drafts) | all of their tenants | all of their tenants | ✓ (UPDATE `with check` blocks moving a row to another tenant; ticket/coupon writes must match the parent's tenant) |

`public.guardar_evento_completo(p_tenant_id, p_evento_id, p_es_nuevo, p_borrador, p_evento, p_entradas) → jsonb` (SECURITY INVOKER) — atomic event + tickets + coupons save. Always checks role, name, form ownership, bundle ownership and format; `p_borrador = false` adds completeness (discipline, ≥1 ticket, complete tickets/coupons, bundle for Múltiple, no coupons on free tickets, payment method when paid, active form). Syncs children (delete missing, upsert present, ids from another event rejected), rewrites `precio`, returns `{evento_id, borrador, entradas:[{client_key,id,cupones:[{client_key,id}]}]}`. On create it also stores `nombre_tenant` (raises `TENANT_INVALIDO` / `23503` if the tenant row is not readable) — US-0120.

Policies use `get_member_tenants_for_authenticated_user()` / `get_trainer_or_admin_tenants_for_authenticated_user()` — both return a `tenant_id` column (not `id`, unlike `get_admin_tenants_for_authenticated_user()` which returns `setof tenants`).

### Event purchases (`evento_formularios`, `evento_compras`, `evento_tickets`, `evento_formulario_respuestas` — US-0121)

Ticket purchase for logged-in users and guests. **Clients only read**; every write goes through `SECURITY DEFINER` RPCs that re-validate visibility, sale window, price, coupon, payment method, form, uniqueness and capacity. Migrations `20261001115000` … `20261001120200`.

- `evento_formularios` — **versioned JSON snapshot** of the form an event asks for (`nombre`, `perfil_campos_requeridos`, `campos` = the template's active `formulario_plantilla_esquema` rows by `orden`, `contenido_hash`, `vigente`; `formulario_plantilla_id` is provenance only). One `vigente` row per event (`uq_evento_formularios_vigente`). Written by `guardar_evento_completo` on every save: unchanged content keeps the version; changed content retires it and inserts a new one; `formulario_id = null` retires it. **A template edit reaches an event only when the event is saved again** (the template editor shows how many events use the template and links to the events page — `useEventosConFormulario`). Readable by `anon` / `authenticated` whenever the event is (same pattern as `evento_entradas`), so guests never need `formularios_plantillas` (authenticated-only).
- **Múltiple bundles and forms:** a *Múltiple* purchase stores only the main event's answers, so `guardar_evento_completo` (final saves, migration `20261002120000`) rejects a bundled event with a different `formulario_id` (`BUNDLE_FORMULARIO_DISTINTO`) and a bundled event switching to another form (`FORMULARIO_EN_PAQUETE_DISTINTO`); events without a form are always allowed. `EventoBundleSelector` shows the notice and disables conflicting events (`EventoListItem.formularioId`).
- `evento_compras` — one purchase = one buyer (`comprador_nombre` / `comprador_email` / `comprador_fecha_nacimiento`, `comprador_usuario_id` null for guests), ticket and price snapshots, `metodo_pago` snapshot (never `efectivo`), `comprobante_path`, `estado`: `pendiente_pago` (30-min capacity hold) → `en_validacion` → `confirmada` | `rechazada` (→ `en_validacion` on re-upload) | `cancelada`; `pendiente_pago` → `expirada`. `evento_id` is `on delete restrict`: an event with sales cannot be hard-deleted.
- `evento_tickets` — one per event of the purchase (a *Múltiple* ticket issues one per bundled event), `codigo` `EV-XXXXXXXX`, `estado` `pendiente` | `activa` | `anulada`. `uq_evento_tickets_evento_email` (partial, `estado <> 'anulada'`) = one live ticket per email per event.
- `evento_formulario_respuestas` — one row per purchase (`compra_id` unique): `datos_perfil`, `respuestas`, `archivos` (image paths), tied to the exact snapshot version answered (`evento_formulario_id`, `on delete restrict`).
- Notifications: `evento_notificaciones` was dropped by US-0125. `_encolar_notificacion(compra, tipo)` (same signature, same 7 call sites) now writes to the generic notifications module — see "Notifications module" below.

RLS: `select` only for `authenticated` — the buyer (`comprador_usuario_id` / `usuario_id` = `auth.uid()`) or the tenant's admins and trainers. `anon` has no grant on the purchase tables.

RPCs (errors are raised as `CODE` or `CODE:<event name>` and mapped by `mapCompraError`):

| RPC | Grants | Purpose |
|---|---|---|
| `validar_cupon_evento(evento, entrada, codigo)` | anon, authenticated | `{valido, descuento_pct, total, motivo}`; never reveals other codes |
| `iniciar_compra_evento(evento, entrada, cupon, metodo_pago_id, comprador, datos_perfil, formulario_respuesta)` | anon, authenticated | Locks the target events in id order, expires stale holds, checks uniqueness + capacity, inserts purchase + tickets (+ answers). Registered buyers' email comes from the session. Free purchases without image fields are confirmed here. The payment method must be a non-cash snapshot of `eventos.metodos_pago` or of the purchased ticket's `evento_entradas.metodos_pago` (US-0130) |
| `finalizar_compra_evento(compra, comprobante_path, archivos)` | anon, authenticated | Checks the files exist under the purchase folder; → `confirmada` (free or `omitir_confirmacion_compra`) or `en_validacion` |
| `reenviar_comprobante_compra_evento` / `cancelar_compra_evento` | authenticated (owner) | Re-upload after a rejection (re-checks capacity/uniqueness); cancel within `cancelacion_antelacion_horas` of the **main** event (null = no cancellation, no refund) |
| `validar_compra_evento(compra, aprobar, motivo)` | authenticated (tenant staff) | `en_validacion` → `confirmada` / `rechazada` (reason required) |
| `vincular_compras_invitado()` | authenticated | Links guest purchases made with the caller's email. **Requires `auth.users.email_confirmed_at`** — production must keep "Confirm email" enabled (local `enable_confirmations = false` auto-confirms) |
| `expirar_compras_evento_pendientes()` | none | pg_cron `expirar-compras-eventos`, every 5 min (expiry also runs lazily inside `iniciar_compra_evento`) |

### Notifications module (`notificaciones_outbox`, `notificaciones` — US-0125)

Cross-cutting email + in-app notifications; first consumer: event purchases. Migration `20261009120000_notificaciones_modulo.sql`.

```
purchase RPC ──> _encolar_notificacion() ──> _notificar_email()  ──> notificaciones_outbox
                                        └──> _notificar_in_app() ──> notificaciones ──Realtime──> header bell
notificaciones_outbox ── insert trigger (pg_net) + pg_cron every minute ──> POST /api/internal/notificaciones/despachar ──> Resend
```

- `notificaciones_outbox` — email outbox: `modulo`, `tipo`, `destinatario_email`, `entidad_tipo` / `entidad_id`, `payload`, `estado` (`pendiente` | `procesando` | `enviada` | `error`), `intentos`, `ultimo_error`, `proximo_intento_at`, `bloqueada_at`, `proveedor_id`. RLS enabled, no policies, no client grants.
- `notificaciones` — per-user in-app inbox (the unused legacy table was dropped and recreated): `usuario_id`, `tenant_id`, `modulo`, `tipo`, `titulo`, `mensaje`, `url`, `leida`, `leida_at`. `authenticated` may only `select` own rows (`notificaciones_select_own`); in the `supabase_realtime` publication.

| Function | Callable by | Notes |
|---|---|---|
| `_notificar_email(tenant, modulo, tipo, email, usuario, entidad_tipo, entidad_id, payload)` / `_notificar_in_app(usuario, tenant, modulo, tipo, titulo, mensaje, url, entidad_tipo, entidad_id)` | none (internal) | What another module calls from its RPCs. Email is lowercased; blank emails are skipped |
| `_admins_tenant(tenant)` | none (internal) | `administrador` members whose `estado <> 'pendiente_activacion'` |
| `reclamar_notificaciones_outbox(limite)` / `resolver_notificacion_outbox(id, ok, proveedor_id, error)` | service_role | Claim with `for update skip locked` (due `pendiente` rows + `procesando` older than 10 min). Retries after 1 min, 5 min, 30 min, 2 h; the 5th failure is `error` |
| `marcar_notificacion_leida(id)` / `marcar_notificaciones_leidas()` | authenticated | Own rows only |
| `despachar_notificaciones_pendientes()` | none | pg_cron `despachar-notificaciones`, every minute; calls out only when a row is due |

- **Dispatch:** `_disparar_despacho()` reads `notificaciones_dispatch_url` and `notificaciones_dispatch_secret` from Supabase Vault and calls the route with `net.http_post`. It never raises and does nothing without the secrets (default local setup), so a purchase can never fail because of a notification.
- **Events matrix:** buyer gets email + in-app (in-app only with an account) on `compra_recibida`, `compra_confirmada`, `compra_rechazada`, `compra_cancelada`; tenant administrators get `compra_nueva_admin` (email + in-app) on `compra_recibida` and on confirmations no staff member performed (`validado_at is distinct from now()`). Buyer links → `/portal/mis-entradas`; admin links → the event's `compras` page.
- **Adding a module:** call the two helpers from its RPCs and register `modulo.tipo` handlers in `src/lib/notificaciones/registro.ts`.
- **Remote rollout (manual):** Resend API key for `grit-arena.com`, the three env variables in Vercel, `pg_net` enabled, the two Vault secrets, then the migration.

**Door check-in (US-0131, migration `20261008120000_evento_tickets_checkin.sql`):** `evento_tickets.ingreso_at` / `ingreso_por` (→ `auth.users`, `on delete set null`); checks `evento_tickets_ingreso_ck` (`ingreso_at is null or estado = 'activa'`, so a used ticket can never be voided) and `evento_tickets_ingreso_por_ck`; index `(evento_id, ingreso_at)`. One entry per ticket, undo allowed, no log table. `cancelar_compra_evento` raises `CANCELACION_NO_PERMITIDA` when any ticket of the purchase was used.

| RPC | Grants | Purpose |
|---|---|---|
| `registrar_ingreso_evento(evento, codigo)` | authenticated (tenant staff of the event, else `FORBIDDEN` 42501) | Normalizes the code (`_normalizar_codigo_ticket`), locks the ticket `for update` (concurrent scans → one `ok`, the rest `ya_ingreso`) and returns `{resultado, ticket_id, codigo, asistente_*, entrada_nombre, evento_nombre, ingreso_at, ingreso_por_nombre}` with `resultado` in order `no_encontrado` (unknown, malformed or other-tenant code: no details) → `otro_evento` → `anulada` → `pendiente` → `ya_ingreso` → `ok` (the only write). Business outcomes are data, not exceptions |
| `revertir_ingreso_evento(ticket)` | authenticated (tenant staff) | Clears the entry; `ESTADO_INVALIDO` when there is none; `resultado = 'revertido'` |
| `resumen_ingresos_evento(evento)` | authenticated (tenant staff) | `{activas, ingresaron, pendientes_pago}` |

Storage: `org-assets/compras-eventos/{tenantId}/{compraId}/{kind}-{ts}.{ext}` — deliberately **outside `orgs/`** so `org_member_read` / `event_banner_read` never expose it. `evento_compra_upload` (insert; anon + authenticated, only a fresh pending guest/own purchase, or the buyer of a rejected one) and `evento_compra_read` (select; buyer or tenant staff). Write-once (no update/delete policies); served through 300 s signed URLs.

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

# Server-only — NEVER prefix with NEXT_PUBLIC_ (US-0114)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # the project's service-role key (not a personal access token)
APP_URL=http://localhost:3000                     # trusted origin for Auth email links; production: https://www.grit-arena.com

# Notifications module (US-0125)
RESEND_API_KEY=                                   # empty = emails are not sent (outbox rows fail with resend_not_configured)
EMAIL_FROM="GRIT Arena <no-reply@grit-arena.com>"
NOTIFICACIONES_DISPATCH_SECRET=your-random-secret # bearer of POST /api/internal/notificaciones/despachar; same value as the Vault secret notificaciones_dispatch_secret
EMAIL_DEV_MAILPIT_URL=http://127.0.0.1:54324      # development only (ignored in production): emails go to the local Mailpit instead of Resend

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

## Visual Design System (US-0116)

- **Source of truth**: `projectspec/designs/pencil/grit-arena-v2.pen`. Portal code uses only `grit-*` tokens (`bg-grit-bg`, `text-grit-text|subtext|muted`, `grit-cyan`, `bg-grit-glass|card`, `border-grit-glass-border`, `grit-danger|success`, `grit-discipline-*`) and the `@/components/ui` grit kit.
- **Fonts**: `font-grit-title` (Rajdhani) for headings, KPI values and prices; `font-grit-body` (Montserrat) everywhere else.
- **Radii**: use `rounded-grit-{xs,sm,md,lg,xl,2xl}` (6–16px). Never `rounded-lg`/`rounded-xl` in Portal code — `tailwind.config.ts` overrides them to 32/48px for landing/auth.
- **Translucent tokens** (`grit-glass`, `grit-card`, `grit-glass-border`) take no `/opacity` modifier; solid ones (`grit-cyan`, `grit-bg`, …) do.
- **Pages**: `portal/layout.tsx` provides `.grit-shell`, the breadcrumb row and one `GritPageContainer`; page components render one `h1` (via `GritPageHeader`) and no outer page padding. Modal backdrops: `bg-grit-bg/70 backdrop-blur-sm`.
- **Deprecated** (landing/auth only, do not use in Portal): `turquoise`, `accent-teal`, `navy-*`, `card-dark`, `.glass`, `.glass-card`, `landing-*`.

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