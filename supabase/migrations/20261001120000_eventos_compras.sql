-- =============================================
-- Migration: Team events phase 4 (US-0121) — purchases, tickets, form answers, outbox
-- RLS is read-only (buyer or tenant staff). Every write goes through the SECURITY DEFINER
-- RPCs of 20261001120100_eventos_compras_rpc.sql.
-- =============================================

begin;

-- 1. Purchases
create table public.evento_compras (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.tenants(id) on delete cascade,
  evento_id                   uuid not null references public.eventos(id) on delete restrict,
  entrada_id                  uuid references public.evento_entradas(id) on delete set null,
  comprador_usuario_id        uuid references public.usuarios(id) on delete set null,
  comprador_nombre            varchar(150) not null,
  comprador_email             varchar(254) not null,
  comprador_fecha_nacimiento  date not null,
  -- Form data lives in evento_formulario_respuestas, not here
  entrada_nombre              varchar(100) not null,
  entrada_tipo                varchar(20) not null,
  valor_base                  numeric(12,2) not null,
  cupon_codigo                varchar(30),
  descuento_pct               numeric(5,2),
  total                       numeric(12,2) not null,
  metodo_pago                 jsonb,                                -- EventoMetodoPagoSnapshot, null when total = 0
  comprobante_path            text,
  estado                      varchar(20) not null default 'pendiente_pago',
  motivo_rechazo              varchar(500),
  validado_por                uuid references public.usuarios(id) on delete set null,
  validado_at                 timestamptz,
  cancelado_at                timestamptz,
  created_at                  timestamptz not null default timezone('utc', now()),
  updated_at                  timestamptz not null default timezone('utc', now()),

  constraint evento_compras_estado_ck check (estado in
    ('pendiente_pago', 'en_validacion', 'confirmada', 'rechazada', 'cancelada', 'expirada')),
  constraint evento_compras_email_ck check (
    comprador_email = lower(btrim(comprador_email)) and comprador_email like '%_@_%._%'),
  constraint evento_compras_nombre_ck check (length(btrim(comprador_nombre)) > 0),
  constraint evento_compras_nacimiento_ck check (comprador_fecha_nacimiento > date '1900-01-01'),
  constraint evento_compras_montos_ck check (valor_base >= 0 and total >= 0 and total <= valor_base),
  constraint evento_compras_descuento_ck check (descuento_pct is null or (descuento_pct > 0 and descuento_pct <= 100)),
  constraint evento_compras_tipo_ck check (entrada_tipo in ('sencilla', 'multiple')),
  constraint evento_compras_rechazo_ck check (estado <> 'rechazada' or length(btrim(coalesce(motivo_rechazo, ''))) > 0),
  constraint evento_compras_metodo_ck check (total = 0 or metodo_pago is not null)
);

comment on table public.evento_compras is
  'Event ticket purchases (US-0121). One ticket per event per purchase; written only through SECURITY DEFINER RPCs.';

create index idx_evento_compras_evento_estado on public.evento_compras (evento_id, estado);
create index idx_evento_compras_tenant_created on public.evento_compras (tenant_id, created_at desc);
create index idx_evento_compras_comprador on public.evento_compras (comprador_usuario_id) where comprador_usuario_id is not null;
create index idx_evento_compras_email_sin_usuario on public.evento_compras (comprador_email) where comprador_usuario_id is null;
create index idx_evento_compras_pendientes on public.evento_compras (created_at) where estado = 'pendiente_pago';

-- 2. Tickets (one per event; a Múltiple purchase has one per bundled event)
create table public.evento_tickets (
  id                uuid primary key default gen_random_uuid(),
  compra_id         uuid not null references public.evento_compras(id) on delete cascade,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  evento_id         uuid not null references public.eventos(id) on delete restrict,
  usuario_id        uuid references public.usuarios(id) on delete set null,
  asistente_nombre  varchar(150) not null,
  asistente_email   varchar(254) not null,
  codigo            varchar(12) not null unique,        -- 'EV-' + 8 chars, generated server-side
  estado            varchar(20) not null default 'pendiente',
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  constraint evento_tickets_estado_ck check (estado in ('pendiente', 'activa', 'anulada'))
);

-- One live ticket per person (email) per event
create unique index uq_evento_tickets_evento_email on public.evento_tickets (evento_id, asistente_email)
  where estado <> 'anulada';
create index idx_evento_tickets_evento_estado on public.evento_tickets (evento_id, estado);
create index idx_evento_tickets_compra on public.evento_tickets (compra_id);
create index idx_evento_tickets_usuario on public.evento_tickets (usuario_id) where usuario_id is not null;

-- 3. Answers to the event form, tied to the snapshot version they answered
create table public.evento_formulario_respuestas (
  id                    uuid primary key default gen_random_uuid(),
  compra_id             uuid not null unique references public.evento_compras(id) on delete cascade,
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  evento_id             uuid not null references public.eventos(id) on delete restrict,
  evento_formulario_id  uuid not null references public.evento_formularios(id) on delete restrict,
  datos_perfil          jsonb not null default '{}'::jsonb,   -- requested profile fields
  respuestas            jsonb not null default '{}'::jsonb,   -- { campo_nombre: value } for non-image fields
  archivos              jsonb not null default '{}'::jsonb,   -- { campo_nombre: path } for imagen fields
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),

  constraint evento_formulario_respuestas_perfil_ck check (jsonb_typeof(datos_perfil) = 'object'),
  constraint evento_formulario_respuestas_respuestas_ck check (jsonb_typeof(respuestas) = 'object'),
  constraint evento_formulario_respuestas_archivos_ck check (jsonb_typeof(archivos) = 'object')
);

create index idx_evento_formulario_respuestas_evento on public.evento_formulario_respuestas (evento_id);
create index idx_evento_formulario_respuestas_formulario on public.evento_formulario_respuestas (evento_formulario_id);

-- 4. Notification outbox: filled by the RPCs, NOT sent in this phase
create table public.evento_notificaciones (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  compra_id           uuid not null references public.evento_compras(id) on delete cascade,
  tipo                varchar(30) not null,
  destinatario_email  varchar(254) not null,
  payload             jsonb not null default '{}'::jsonb,
  estado              varchar(20) not null default 'pendiente',
  created_at          timestamptz not null default timezone('utc', now()),
  enviada_at          timestamptz,
  constraint evento_notificaciones_tipo_ck check (tipo in
    ('compra_recibida', 'compra_confirmada', 'compra_rechazada', 'compra_cancelada')),
  constraint evento_notificaciones_estado_ck check (estado in ('pendiente', 'enviada', 'error'))
);

create index idx_evento_notificaciones_pendientes on public.evento_notificaciones (created_at) where estado = 'pendiente';
create index idx_evento_notificaciones_compra on public.evento_notificaciones (compra_id);

-- 5. updated_at triggers
create trigger evento_compras_set_updated_at before update on public.evento_compras
  for each row execute function public.set_updated_at();
create trigger evento_tickets_set_updated_at before update on public.evento_tickets
  for each row execute function public.set_updated_at();
create trigger evento_formulario_respuestas_set_updated_at before update on public.evento_formulario_respuestas
  for each row execute function public.set_updated_at();

-- 6. RLS: reads only; every write goes through SECURITY DEFINER RPCs
alter table public.evento_compras enable row level security;
alter table public.evento_tickets enable row level security;
alter table public.evento_formulario_respuestas enable row level security;
alter table public.evento_notificaciones enable row level security;

revoke all on public.evento_compras, public.evento_tickets, public.evento_formulario_respuestas,
  public.evento_notificaciones from anon, authenticated;
grant select on public.evento_compras, public.evento_tickets, public.evento_formulario_respuestas to authenticated;
-- evento_notificaciones: no client grants at all (service / cron use only)

create policy evento_compras_select_owner_or_staff on public.evento_compras
  for select to authenticated
  using (
    comprador_usuario_id = auth.uid()
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy evento_tickets_select_owner_or_staff on public.evento_tickets
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy evento_formulario_respuestas_select_owner_or_staff on public.evento_formulario_respuestas
  for select to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    or exists (
      select 1 from public.evento_compras c
       where c.id = evento_formulario_respuestas.compra_id and c.comprador_usuario_id = auth.uid())
  );

commit;
