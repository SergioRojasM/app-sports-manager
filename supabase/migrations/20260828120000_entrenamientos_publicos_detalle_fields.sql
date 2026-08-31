-- =============================================
-- Migration: Public training detail fields
-- US-0109: adds the data backing the public training detail page
-- (/entrenamientos-publicos/{entrenamiento_id}) — a schedule (cronograma),
-- a "what's included" list (incluye), a long-form Markdown description,
-- an admin-authored official event URL, and multi-option pricing.
--
-- BREAKING: `precio` changes from numeric(10,2) to a jsonb array of
-- { nombre, precio, descripcion } items. Existing single prices are migrated
-- into a one-item array so no data is lost; existing NULLs (free trainings)
-- become an empty array. Every TypeScript consumer of this column must be
-- updated in the same change.
-- =============================================

begin;

alter table public.entrenamientos_publicos
  add column if not exists cronograma jsonb not null default '[]'::jsonb,
  add column if not exists incluye jsonb not null default '[]'::jsonb,
  add column if not exists descripcion_larga text,
  add column if not exists pagina_evento_url text;

-- The view directly projects `precio`, and Postgres cannot change a projected
-- column's type under `create or replace view` — drop it first, recreate below.
drop view public.entrenamientos_publicos_view;

alter table public.entrenamientos_publicos
  drop constraint if exists entrenamientos_publicos_precio_ck;

alter table public.entrenamientos_publicos
  alter column precio drop default;

alter table public.entrenamientos_publicos
  alter column precio type jsonb using (
    case
      when precio is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object('nombre', 'Precio general', 'descripcion', null, 'precio', precio)
      )
    end
  );

alter table public.entrenamientos_publicos
  alter column precio set default '[]'::jsonb,
  alter column precio set not null;

alter table public.entrenamientos_publicos
  add constraint entrenamientos_publicos_precio_array_ck check (jsonb_typeof(precio) = 'array'),
  add constraint entrenamientos_publicos_cronograma_array_ck check (jsonb_typeof(cronograma) = 'array'),
  add constraint entrenamientos_publicos_incluye_array_ck check (jsonb_typeof(incluye) = 'array');

-- Recreate the anon-safe view, carrying forward every column from
-- 20260812190000_entrenamientos_publicos_banner_url_text.sql unchanged, plus
-- the new columns and an entrenador display-name join.
create view public.entrenamientos_publicos_view as
select
  ep.id,
  ep.tenant_id,
  ep.entrenamiento_id,
  ep.nombre,
  ep.descripcion,
  ep.descripcion_larga,
  ep.pagina_evento_url,
  ep.disciplina_id,
  ep.fecha_hora,
  ep.duracion_minutos,
  ep.cupo_maximo,
  ep.punto_encuentro,
  ep.reserva_antelacion_horas,
  ep.cancelacion_antelacion_horas,
  ep.precio,
  ep.cronograma,
  ep.incluye,
  ep.banner_url,
  -- omitir_confirmacion_plan (added to the table by 20260813180000): the detail
  -- page's authenticated booking path reads it from this view to pass through to
  -- PublicTrainingReservaModal, so the anon-safe view must project it.
  ep.omitir_confirmacion_plan,
  ep.created_at,
  d.nombre as disciplina_nombre,
  e.nombre as escenario_nombre,
  e.ubicacion as escenario_ubicacion,
  t.nombre as tenant_nombre,
  t.logo_url as tenant_logo_url,
  nullif(trim(concat(coalesce(u.nombre, ''), ' ', coalesce(u.apellido, ''))), '') as entrenador_nombre,
  coalesce(r.reservas_activas, 0) as reservas_activas
from public.entrenamientos_publicos ep
join public.disciplinas d on d.id = ep.disciplina_id
join public.escenarios e on e.id = ep.escenario_id
join public.tenants t on t.id = ep.tenant_id
left join public.usuarios u on u.id = ep.entrenador_id
left join lateral (
  select count(*) as reservas_activas
  from public.reservas r
  where r.entrenamiento_id = ep.entrenamiento_id
    and r.estado <> 'cancelada'
) r on true
where ep.activo = true
  and ep.fecha_hora >= now();

-- Supabase's default privileges re-grant ALL to anon/authenticated on every
-- view recreate — revoke first, then grant only SELECT (same fix already
-- applied by every prior migration that touches this view).
revoke all on public.entrenamientos_publicos_view from anon, authenticated;
grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
