begin;

-- =========================
-- REGULAR TEST TENANTS
-- =========================
with seed_tenants(nombre, email, telefono, descripcion) as (
	values
		('qbop Alpha Club', 'alpha@qbop.test', '+57 300 000 0001', 'Tenant de pruebas Alpha'),
		('qbop Beta Club',  'beta@qbop.test',  '+57 300 000 0002', 'Tenant de pruebas Beta'),
		('qbop Gamma Club', 'gamma@qbop.test', '+57 300 000 0003', 'Tenant de pruebas Gamma')
)
insert into public.tenants (nombre, email, telefono, descripcion, fecha_creacion)
select
	st.nombre,
	st.email,
	st.telefono,
	st.descripcion,
	current_date
from seed_tenants st
on conflict (nombre) do update
set
	email = excluded.email,
	telefono = excluded.telefono,
	descripcion = excluded.descripcion,
	updated_at = timezone('utc', now());

with target_tenants as (
	select t.id, t.nombre
	from public.tenants t
	where t.nombre in ('qbop Alpha Club', 'qbop Beta Club', 'qbop Gamma Club')
),
scenario_seed as (
	select
		tt.id as tenant_id,
		s.nombre,
		s.descripcion,
		s.ubicacion,
		s.direccion,
		s.coordenadas,
		s.capacidad,
		s.tipo,
		s.activo,
		s.image_url
	from target_tenants tt
	cross join lateral (
		values
			(
				'Escenario Principal',
				'Escenario multipropósito para sesiones grupales',
				'Sede Central',
				'Calle 100 #10-20',
				'4.7100,-74.0721',
				60,
				'gimnasio',
				true,
				null
			),
			(
				'Cancha Auxiliar',
				'Cancha para entrenamiento técnico y trabajo específico',
				'Sede Alterna',
				'Carrera 15 #80-25',
				'4.6760,-74.0480',
				30,
				'cancha',
				true,
				null
			)
	) as s(nombre, descripcion, ubicacion, direccion, coordenadas, capacidad, tipo, activo, image_url)
)
insert into public.escenarios (
	tenant_id,
	nombre,
	descripcion,
	ubicacion,
	direccion,
	coordenadas,
	capacidad,
	tipo,
	activo,
	image_url
)
select
	ss.tenant_id,
	ss.nombre,
	ss.descripcion,
	ss.ubicacion,
	ss.direccion,
	ss.coordenadas,
	ss.capacidad,
	ss.tipo,
	ss.activo,
	ss.image_url
from scenario_seed ss
where not exists (
	select 1
	from public.escenarios e
	where e.tenant_id = ss.tenant_id
		and e.nombre = ss.nombre
);

with target_tenants as (
	select t.id, t.nombre
	from public.tenants t
	where t.nombre in ('qbop Alpha Club', 'qbop Beta Club', 'qbop Gamma Club')
),
discipline_seed as (
	select
		tt.id as tenant_id,
		d.nombre,
		d.descripcion,
		d.activo
	from target_tenants tt
	cross join lateral (
		values
			('Fútbol', 'Disciplina enfocada en coordinación y juego en equipo', true),
			('Baloncesto', 'Disciplina para trabajo técnico, táctica y resistencia', true),
			('Natación', 'Disciplina para desarrollo aeróbico y técnica', true)
	) as d(nombre, descripcion, activo)
)
insert into public.disciplinas (tenant_id, nombre, descripcion, activo)
select
	ds.tenant_id,
	ds.nombre,
	ds.descripcion,
	ds.activo
from discipline_seed ds
on conflict (tenant_id, nombre) do update
set
	descripcion = excluded.descripcion,
	activo = excluded.activo,
	updated_at = timezone('utc', now());

commit;
