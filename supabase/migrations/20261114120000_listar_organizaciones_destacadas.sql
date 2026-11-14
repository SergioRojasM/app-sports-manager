-- =============================================
-- Migration: listar_organizaciones_destacadas
-- US-0140: Public app home — featured organizations for anonymous visitors
-- =============================================
-- public.tenants stays readable only by authenticated users. This SECURITY DEFINER
-- function exposes a minimal projection of public organizations (publico = true):
-- id, nombre, descripcion, logo_url, banner_url, up to 3 active disciplines and
-- the active athlete count. Results are capped at 24 rows.

begin;

create or replace function public.listar_organizaciones_destacadas(p_limit integer default 6)
returns table (
  id uuid,
  nombre varchar,
  descripcion text,
  logo_url varchar,
  banner_url varchar,
  disciplinas text[],
  total_atletas integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.nombre,
    t.descripcion,
    t.logo_url,
    t.banner_url,
    coalesce(
      (
        select array_agg(d.nombre::text order by d.nombre)
        from (
          select dd.nombre
          from public.disciplinas dd
          where dd.tenant_id = t.id
            and dd.activo
          order by dd.nombre
          limit 3
        ) d
      ),
      '{}'::text[]
    ) as disciplinas,
    (
      select count(*)::integer
      from public.miembros_tenant m
      join public.roles r on r.id = m.rol_id
      where m.tenant_id = t.id
        and r.nombre = 'usuario'
        and m.estado = 'activo'
    ) as total_atletas
  from public.tenants t
  where t.publico
    and t.nombre <> 'public' -- internal system tenant, never listed (same rule as the directory)
  order by 7 desc, t.nombre asc
  limit least(greatest(coalesce(p_limit, 6), 1), 24);
$$;

comment on function public.listar_organizaciones_destacadas(integer) is
  'US-0140: public organizations for the app home. Exposes only id, nombre, descripcion, logo_url, banner_url, up to 3 active disciplines and the active athlete count. Max 24 rows.';

revoke all on function public.listar_organizaciones_destacadas(integer) from public;
grant execute on function public.listar_organizaciones_destacadas(integer) to anon, authenticated;

commit;
